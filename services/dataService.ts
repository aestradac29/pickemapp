
import { Team, Player, Match, Role, Stage, User, PlayerGameStats, FantasyTeamState, FantasySlot, MatchGame } from '../types';
import { TEAMS, PLAYERS, MATCHES, getMatchesForDay, FANTASY_SCHEDULE } from '../constants';
import { fantasyService } from './fantasyService';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";

// Helper CRÍTICO: Elimina recursivamente cualquier campo 'undefined' del objeto.
const cleanPayload = (data: any): any => {
    return JSON.parse(JSON.stringify(data));
};

export const dataService = {
    // --- CONFIGURATION (Active Days & Locks) ---
    async getDaysConfig(): Promise<{ 
        visibleDays: number[], 
        closedDays: number[], 
        playoffVisibleDays: number[], 
        playoffClosedDays: number[],
        playoffRounds?: number, 
        playoffsAccessible?: boolean,
        fantasyRound?: number, // Current active fantasy round
        fantasyLocked?: boolean // Is current fantasy round locked?
    }> {
        try {
            const docRef = doc(db, "admin_data", "config");
            const docSnap = await getDoc(docRef);
            
            // Default Values
            let config = {
                visibleDays: [1], closedDays: [], 
                playoffVisibleDays: [1], playoffClosedDays: [],
                playoffRounds: 5, playoffsAccessible: false,
                fantasyRound: 1, fantasyLocked: false
            };

            if (docSnap.exists()) {
                const data = docSnap.data();
                config = {
                    visibleDays: data.activeDays || [1],
                    closedDays: data.closedDays || [],
                    playoffVisibleDays: data.playoffVisibleDays || [1],
                    playoffClosedDays: data.playoffClosedDays || [],
                    playoffRounds: data.playoffRounds || 5, 
                    playoffsAccessible: data.playoffsAccessible || false,
                    fantasyRound: data.fantasyRound || 1,
                    fantasyLocked: data.fantasyLocked || false // Manual Override
                };
            }

            // --- AUTOMATIC LOCK LOGIC ---
            // If manual lock is FALSE, check the time of the first match of the current fantasy round
            if (!config.fantasyLocked) {
                const currentRoundDef = FANTASY_SCHEDULE.find(r => r.id === config.fantasyRound);
                if (currentRoundDef) {
                    const matches = await this.getMatches();
                    // Filter matches belonging to this fantasy round
                    const roundMatches = matches.filter(m => 
                        (currentRoundDef.stage === Stage.GROUPS ? m.stage === Stage.GROUPS : m.stage !== Stage.GROUPS) &&
                        currentRoundDef.matchdays.includes(m.day || 0)
                    );
                    
                    if (roundMatches.length > 0) {
                        // Sort by start time ascending
                        const sorted = roundMatches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                        const firstMatchTime = new Date(sorted[0].startTime);
                        const now = new Date();
                        
                        // If current time is past the first match start time, LOCK IT automatically
                        if (now >= firstMatchTime) {
                            config.fantasyLocked = true;
                        }
                    }
                }
            }

            return config;
        } catch (e) {
            console.error("Error loading config", e);
            return { 
                visibleDays: [1], closedDays: [], 
                playoffVisibleDays: [1], playoffClosedDays: [],
                playoffRounds: 5, playoffsAccessible: false,
                fantasyRound: 1, fantasyLocked: false
            };
        }
    },

    async updateGlobalConfig(config: any) {
        const docRef = doc(db, "admin_data", "config");
        await setDoc(docRef, cleanPayload(config), { merge: true });
    },

    // NEW: Handle Round Transitions (Price Updates)
    async processRoundTransition(newRound: number) {
        // 1. Get current state
        const currentPlayers = await this.getPlayers();
        
        // 2. Calculate new prices based on performance (Last Round vs Average)
        const updatedPlayers = currentPlayers.map(p => {
            // Target price based on performance (Multiplier 18-20 is standard for Fantasy LoL budgets ~1500)
            const targetPrice = p.averagePoints * 18; 
            let change = 0;

            if (targetPrice > p.cost) {
                // Should increase
                change = Math.min(50, Math.ceil((targetPrice - p.cost) * 0.2)); // Move 20% towards target
            } else if (targetPrice < p.cost) {
                // Should decrease
                change = Math.max(-50, Math.floor((targetPrice - p.cost) * 0.1)); // Move 10% towards target (prices stickier downwards)
            }

            // Apply Change
            let newCost = p.cost + change;
            // Floor at 100, Cap at 500 (Soft limits)
            newCost = Math.max(100, Math.min(500, newCost));

            return {
                ...p,
                cost: newCost,
                priceChange: change // Store trend for UI
            };
        });

        // 3. Save new player list
        const playersDocRef = doc(db, "admin_data", "players");
        await setDoc(playersDocRef, { list: cleanPayload(updatedPlayers) }, { merge: true });

        // 4. Update Config to new round & UNLOCK explicitly (admin triggers next round, so it starts open)
        await this.updateGlobalConfig({ 
            fantasyRound: newRound,
            fantasyLocked: false // Reset manual lock if it was set
        });
    },

    async getSplits() {
        return [
            { id: 'winter_2026', name: 'Winter 2026', status: 'active' },
            { id: 'spring_2026', name: 'Spring 2026', status: 'upcoming' },
            { id: 'summer_2026', name: 'Summer 2026', status: 'upcoming' }
        ];
    },

    // --- TEAMS ---
    async getTeams(): Promise<Record<string, Team>> {
        try {
            const docRef = doc(db, "admin_data", "teams");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data().data as Record<string, Team>;
            } else {
                console.log("Seeding Teams to Database...");
                await setDoc(docRef, { data: cleanPayload(TEAMS) });
                return TEAMS;
            }
        } catch (e) {
            console.error("Error getting teams:", e);
            return TEAMS;
        }
    },

    async updateTeam(teamId: string, updates: Partial<Team>) {
        const docRef = doc(db, "admin_data", "teams");
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) return;

        let currentData = docSnap.data().data as Record<string, Team>;
        if (!currentData[teamId]) throw new Error("Team not found");

        currentData[teamId] = { ...currentData[teamId], ...updates };
        await setDoc(docRef, { data: cleanPayload(currentData) }, { merge: true });
    },

    // --- PLAYERS & PRICES ---
    async getPlayers(): Promise<Player[]> {
        try {
            const playersDocRef = doc(db, "admin_data", "players");
            const playersSnap = await getDoc(playersDocRef);
            let playersList: Player[] = [];

            if (playersSnap.exists()) {
                playersList = playersSnap.data().list as Player[];
            } else {
                await setDoc(playersDocRef, { list: cleanPayload(PLAYERS) });
                playersList = PLAYERS;
            }

            const matches = await this.getMatches();
            
            const updatedPlayers = playersList.map(player => {
                let totalKills = 0, totalDeaths = 0, totalAssists = 0, totalPoints = 0, gamesPlayed = 0;
                let highlight: string | undefined = undefined;

                const sortedMatches = matches.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

                for (const match of sortedMatches) {
                    // IMPORTANT FIX: Only count stats if match is COMPLETED
                    if (!match.isCompleted) continue;

                    if (match.stats && match.stats[player.id]) {
                        const s = match.stats[player.id];
                        totalKills += s.kills;
                        totalDeaths += s.deaths;
                        totalAssists += s.assists;
                        totalPoints += s.totalPoints;
                        gamesPlayed++;

                        if (!highlight) {
                            if (s.pentaKills > 0) highlight = "PENTAKILL";
                            else if (s.quadraKills > 0) highlight = "QUADRA KILL";
                            else if (s.isMvp) highlight = "MVP";
                            else if (s.kills >= 10) highlight = "High Kills";
                            else if (s.firstBlood) highlight = "First Blood";
                            else if (player.role === Role.SUPPORT && s.assists >= 15) highlight = "Playmaker";
                            else if (player.role === Role.ADC && s.damagePerMinute > 1000) highlight = "Hypercarry";
                            else if (player.role === Role.JUNGLE && s.dragonsKilled >= 4) highlight = "Alma Dragón";
                        }
                    }
                }

                const kda = totalDeaths === 0 ? (totalKills + totalAssists) : (totalKills + totalAssists) / totalDeaths;
                const averagePoints = gamesPlayed > 0 ? (totalPoints / gamesPlayed) : player.averagePoints; 

                let isHot = false;
                if (gamesPlayed > 0 && matches.length > 0) {
                     const lastGameStats = matches[0].stats?.[player.id];
                     if (lastGameStats && lastGameStats.totalPoints > averagePoints) {
                         isHot = true;
                     }
                }

                return {
                    ...player,
                    kda: parseFloat(kda.toFixed(2)),
                    averagePoints: parseFloat(averagePoints.toFixed(1)),
                    totalPoints: parseFloat(totalPoints.toFixed(1)),
                    highlight: highlight,
                    isHot: isHot
                };
            });

            return updatedPlayers;

        } catch (e) {
            console.error("Error getting players:", e);
            return PLAYERS;
        }
    },

    async updatePlayer(playerId: string, updates: Partial<Player>) {
        const docRef = doc(db, "admin_data", "players");
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;
        let currentList: Player[] = docSnap.data().list || [];
        const index = currentList.findIndex(p => p.id === playerId);
        if (index === -1) throw new Error("Player not found");
        currentList[index] = { ...currentList[index], ...updates };
        await setDoc(docRef, { list: cleanPayload(currentList) }, { merge: true });
    },

    // --- MATCHES ---
    async getMatches(day?: number): Promise<Match[]> {
        try {
            const [matchesSnap, teamsSnap] = await Promise.all([
                getDoc(doc(db, "admin_data", "matches")),
                getDoc(doc(db, "admin_data", "teams"))
            ]);
            
            let teamsMap: Record<string, Team> = TEAMS; 
            if (teamsSnap.exists()) {
                teamsMap = teamsSnap.data().data as Record<string, Team>;
            }

            let allMatches: Match[] = [];

            if (matchesSnap.exists()) {
                const rawMatches = matchesSnap.data().allMatches || [];
                allMatches = rawMatches.map((m: Match) => {
                    let finalDay = m.day;
                    if (!finalDay && m.id.startsWith('d') && m.id.includes('-m')) {
                        try {
                            const dayPart = m.id.split('-')[0].replace('d', '');
                            finalDay = parseInt(dayPart);
                        } catch(e) {}
                    }

                    return {
                        ...m,
                        day: finalDay,
                        teamA: (m.teamA && teamsMap[m.teamA.id]) || m.teamA, 
                        teamB: (m.teamB && teamsMap[m.teamB.id]) || m.teamB
                    };
                });

            } else {
                console.log("Seeding Matches...");
                const seedMatches = [...MATCHES];
                let generatedMatches: Match[] = [];
                for (let i = 1; i <= 11; i++) {
                    const dayMatches = getMatchesForDay(i);
                    generatedMatches = [...generatedMatches, ...dayMatches];
                }
                allMatches = [...seedMatches, ...generatedMatches];
                await setDoc(doc(db, "admin_data", "matches"), { allMatches: cleanPayload(allMatches) });
            }

            if (day) {
                return allMatches.filter(m => m.day === day);
            }
            return allMatches;

        } catch (e) {
            console.error("Error getting matches:", e);
            return [];
        }
    },

    async updateMatch(matchId: string, updates: any) {
        const docRef = doc(db, "admin_data", "matches");
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) return;

        let allMatches: Match[] = docSnap.data().allMatches || [];
        const index = allMatches.findIndex(m => m.id === matchId);

        if (index === -1) throw new Error("Match not found in DB");

        const currentMatch = allMatches[index];
        const teamsRef = await this.getTeams();

        const newTeamA = updates.team_a_id ? teamsRef[updates.team_a_id] : currentMatch.teamA;
        const newTeamB = updates.team_b_id ? teamsRef[updates.team_b_id] : currentMatch.teamB;

        const updatedMatch: Match = {
            ...currentMatch,
            teamA: newTeamA || currentMatch.teamA,
            teamB: newTeamB || currentMatch.teamB,
            startTime: updates.start_time || currentMatch.startTime,
            winnerId: updates.winner_id !== undefined ? updates.winner_id : (currentMatch.winnerId || null),
            isCompleted: updates.status === 'finished',
            day: updates.day || currentMatch.day || null,
            bestOf: updates.bestOf ?? currentMatch.bestOf ?? 1,
            bracketStage: updates.bracketStage || currentMatch.bracketStage,
            stats: updates.stats || currentMatch.stats,
            games: updates.games || currentMatch.games // Maintain games if not updated
        };

        allMatches[index] = updatedMatch;
        await setDoc(docRef, { allMatches: cleanPayload(allMatches) }, { merge: true });
    },

    // --- FANTASY SCORING SYSTEM & STORAGE ---
    
    async saveFantasyTeam(userId: string, team: Record<Role, FantasySlot>, captain: string | null, round: number) {
        const roundDocRef = doc(db, "users", userId, "fantasy_rounds", `round_${round}`);
        await setDoc(roundDocRef, { team: cleanPayload(team), captain, roundId: round, updatedAt: new Date().toISOString() }, { merge: true });
        
        const currentRef = doc(db, "users", userId, "fantasy", "winter_2026");
        await setDoc(currentRef, { team: cleanPayload(team), captain }, { merge: true });
    },

    async getFantasyTeam(userId: string, round: number): Promise<FantasyTeamState | null> {
        try {
            const roundDocRef = doc(db, "users", userId, "fantasy_rounds", `round_${round}`);
            const roundSnap = await getDoc(roundDocRef);
            
            if (roundSnap.exists()) {
                const data = roundSnap.data();
                const team: Record<Role, FantasySlot> = {
                    [Role.TOP]: { playerId: null }, [Role.JUNGLE]: { playerId: null }, [Role.MID]: { playerId: null }, 
                    [Role.ADC]: { playerId: null }, [Role.SUPPORT]: { playerId: null }
                };
                
                if (data.team) {
                    Object.keys(data.team).forEach(key => {
                        const val = data.team[key];
                        if (typeof val === 'string' || val === null) {
                            team[key as Role] = { playerId: val }; // Legacy format
                        } else {
                            team[key as Role] = val; // New format
                        }
                    });
                }

                return {
                    team,
                    captain: data.captain,
                    score: data.score
                };
            } else if (round > 1) {
                // FALLBACK: INHERITANCE FROM PREVIOUS ROUND
                const prevRound = round - 1;
                const prevDocRef = doc(db, "users", userId, "fantasy_rounds", `round_${prevRound}`);
                const prevSnap = await getDoc(prevDocRef);

                if (prevSnap.exists()) {
                    const data = prevSnap.data();
                    const inheritedTeam: Record<Role, FantasySlot> = {
                        [Role.TOP]: { playerId: null }, [Role.JUNGLE]: { playerId: null }, [Role.MID]: { playerId: null }, 
                        [Role.ADC]: { playerId: null }, [Role.SUPPORT]: { playerId: null }
                    };
                    const rawTeam = data.team || {};
                    
                    // Normalize inherited data if it was in legacy string format
                    // IMPORTANT: If legacy, we can't recover the old price easily, so purchaseCost will be undefined.
                    // The UI handles undefined purchaseCost by falling back to current price (so price hike applies to legacy).
                    // This encourages users to open the app and "lock in" new teams to get price protection moving forward.
                    Object.keys(rawTeam).forEach(key => {
                        const val = rawTeam[key];
                        if (typeof val === 'string' || val === null) {
                            inheritedTeam[key as Role] = { playerId: val }; 
                        } else {
                            inheritedTeam[key as Role] = val;
                        }
                    });

                    return {
                        team: inheritedTeam, 
                        captain: data.captain,
                        score: 0 
                    };
                }
            }
            return null;
        } catch (e) { return null; }
    },

    // MANUAL FORCE RECALCULATION WRAPPER
    async forceRecalculateAll() {
        const matches = await this.getMatches();
        await this.recalculateAllFantasyScores(matches);
    },

    // ** MAJOR UPDATE ** : Supports aggregation of multiple games in BO3/BO5
    async saveMatchStatsAndCalculate(matchId: string, games: MatchGame[]) {
        // 1. Get Match & Players
        const [docSnap, players] = await Promise.all([
            getDoc(doc(db, "admin_data", "matches")),
            this.getPlayers()
        ]);
        if (!docSnap.exists()) return;

        let allMatches: Match[] = docSnap.data().allMatches || [];
        const index = allMatches.findIndex(m => m.id === matchId);
        if (index === -1) throw new Error("Match not found");

        const match = allMatches[index];

        // 2. Aggregate Stats Logic (Normalization)
        // We will sum up all raw stats to store them for posterity, but calculate the "totalPoints" as an AVERAGE.
        // This effectively replaces the multiplier system.
        const aggregatedStats: Record<string, PlayerGameStats> = {};
        
        // Iterate through all players involved
        const playersInvolved = players.filter(p => p.teamId === match.teamA.id || p.teamId === match.teamB.id);

        playersInvolved.forEach(player => {
            let totalScore = 0;
            let gamesPlayed = 0;
            
            // Temporary object to hold summed stats for visual reference
            const summedStats: PlayerGameStats = {
                playerId: player.id,
                kills:0, deaths:0, assists:0, cs:0,
                isMvp: false, firstBlood: false, 
                doubleKills:0, tripleKills:0, quadraKills:0, pentaKills:0,
                teamDamagePercentage:0, dragonsKilled:0, baronsKilled:0, damagePerMinute:0, visionScore:0, firstDragon:false,
                totalPoints: 0
            };

            games.forEach(game => {
                const pStats = game.stats[player.id];
                if (pStats) {
                    gamesPlayed++;
                    // Sum raw stats
                    summedStats.kills += pStats.kills;
                    summedStats.deaths += pStats.deaths;
                    summedStats.assists += pStats.assists;
                    summedStats.cs += pStats.cs;
                    summedStats.doubleKills += pStats.doubleKills;
                    summedStats.tripleKills += pStats.tripleKills;
                    summedStats.quadraKills += pStats.quadraKills;
                    summedStats.pentaKills += pStats.pentaKills;
                    
                    // Flags: if happened in ANY game
                    if (pStats.isMvp) summedStats.isMvp = true;
                    if (pStats.firstBlood) summedStats.firstBlood = true;
                    if (pStats.firstDragon) summedStats.firstDragon = true;

                    // Role specifics: Average or Sum? Usually Sum for these milestones works best or recalculate.
                    // For simplicity, we just sum for display, but points are calculated per game below.
                    summedStats.dragonsKilled += pStats.dragonsKilled;
                    summedStats.baronsKilled += pStats.baronsKilled;
                    
                    // Averages for these metrics
                    summedStats.teamDamagePercentage += pStats.teamDamagePercentage;
                    summedStats.damagePerMinute += pStats.damagePerMinute;
                    summedStats.visionScore += pStats.visionScore;

                    // Calculate score for THIS game specifically
                    const isGameWinner = game.winnerId === player.teamId;
                    const gameScore = fantasyService.calculatePoints(
                        { ...pStats, win: isGameWinner } as any, // Inject win bool
                        player.role,
                        false, // isCaptain handled later
                        match.bracketStage,
                        match.stage
                    );
                    totalScore += gameScore;
                }
            });

            if (gamesPlayed > 0) {
                // Normalize aggregated stats for display
                summedStats.teamDamagePercentage /= gamesPlayed;
                summedStats.damagePerMinute /= gamesPlayed;
                // Vision score is cumulative usually, but let's keep it clean
                
                // CRITICAL: Final Score is AVERAGE of games played
                // This replaces the multiplier. 
                // E.g. (Game 1 Score + Game 2 Score) / 2
                summedStats.totalPoints = parseFloat((totalScore / gamesPlayed).toFixed(2));
                
                aggregatedStats[player.id] = summedStats;
            }
        });

        // 3. Update Match Object
        // We determine the Series Winner based on game wins
        const winsA = games.filter(g => g.winnerId === match.teamA.id).length;
        const winsB = games.filter(g => g.winnerId === match.teamB.id).length;
        const seriesWinnerId = winsA > winsB ? match.teamA.id : (winsB > winsA ? match.teamB.id : null);

        const updatedMatch = { 
            ...match, 
            games: games, 
            stats: aggregatedStats, 
            winnerId: seriesWinnerId,
            isCompleted: true 
        };
        allMatches[index] = updatedMatch;
        
        await setDoc(doc(db, "admin_data", "matches"), { allMatches: cleanPayload(allMatches) }, { merge: true });

        // 4. Trigger Recalculation
        await this.recalculateAllFantasyScores(allMatches);
    },

    async recalculateAllFantasyScores(allMatches: Match[]) {
        const usersRef = collection(db, "users");
        const userSnapshot = await getDocs(usersRef);
        const users = userSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Map stats by Match ID -> Player ID
        const matchStatsMap: Record<string, Record<string, number>> = {};
        allMatches.forEach(m => {
            if (m.stats) {
                matchStatsMap[m.id] = {};
                Object.values(m.stats).forEach(s => {
                    matchStatsMap[m.id][s.playerId] = s.totalPoints;
                });
            }
        });

        const updates = users.map(async (user: any) => {
            let totalFantasyScore = 0;
            
            for (const roundConfig of FANTASY_SCHEDULE) {
                const roundId = roundConfig.id;
                const roundRef = doc(db, "users", user.id, "fantasy_rounds", `round_${roundId}`);
                const roundSnap = await getDoc(roundRef);
                
                if (roundSnap.exists()) {
                    const data = roundSnap.data();
                    const team = data.team;
                    const captain = data.captain;
                    let roundScore = 0;

                    const relevantMatches = allMatches.filter(m => {
                        if (roundConfig.stage === Stage.GROUPS) {
                            return m.stage === Stage.GROUPS && roundConfig.matchdays.includes(m.day || 0);
                        } else {
                            return m.stage !== Stage.GROUPS && roundConfig.matchdays.includes(m.day || 0);
                        }
                    });

                    Object.values(team).forEach((slot: any) => {
                        const pid = slot?.playerId || (typeof slot === 'string' ? slot : null);
                        if (pid) {
                            let playerRoundPoints = 0;
                            relevantMatches.forEach(m => {
                                const points = matchStatsMap[m.id]?.[pid] || 0;
                                playerRoundPoints += points;
                            });
                            
                            if (pid === captain) playerRoundPoints *= 1.5;
                            roundScore += playerRoundPoints;
                        }
                    });

                    await setDoc(roundRef, { score: parseFloat(roundScore.toFixed(2)) }, { merge: true });
                    totalFantasyScore += roundScore;
                }
            }

            const userDocRef = doc(db, "users", user.id);
            const userDocSnap = await getDoc(userDocRef);
            if(userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const breakdown = userData.scoreBreakdown || {};
                breakdown.fantasy = parseFloat(totalFantasyScore.toFixed(2));
                await setDoc(userDocRef, { scoreBreakdown: breakdown }, { merge: true });
            }
        });

        await Promise.all(updates);
    },

    // ... (rest of methods)
    async createMatch(matchData: any) {
        const docRef = doc(db, "admin_data", "matches");
        const docSnap = await getDoc(docRef);
        let allMatches: Match[] = (docSnap.exists() ? docSnap.data().allMatches : []) || [];

        const teamsRef = await this.getTeams();
        const teamA = teamsRef[matchData.team_a_id];
        const teamB = teamsRef[matchData.team_b_id];

        const newMatch: Match = {
            id: `custom-${Date.now()}`,
            teamA: teamA,
            teamB: teamB,
            startTime: matchData.start_time,
            stage: matchData.stage || Stage.GROUPS,
            isCompleted: matchData.status === 'finished',
            day: matchData.day || null,
            winnerId: null,
            bestOf: matchData.bestOf || 1,
            bracketStage: matchData.bracketStage
        };

        allMatches.push(newMatch);
        await setDoc(docRef, { allMatches: cleanPayload(allMatches) }, { merge: true });
    },

    async deleteMatch(matchId: string) {
        const docRef = doc(db, "admin_data", "matches");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            let allMatches: Match[] = docSnap.data().allMatches || [];
            const newMatches = allMatches.filter(m => m.id !== matchId);
            await setDoc(docRef, { allMatches: cleanPayload(newMatches) });
        }
    },

    async getAllUsers(): Promise<User[]> {
        try {
            const [allMatches, adminRanking, config, adminCrystalBall] = await Promise.all([
                this.getMatches(),
                this.getAdminRanking(),
                this.getDaysConfig(),
                this.getAdminCrystalBallResults()
            ]);

            const usersRef = collection(db, "users");
            const q = query(usersRef, orderBy("username"), limit(50));
            const snapshot = await getDocs(q);

            const users: User[] = await Promise.all(snapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                const userId = userDoc.id;

                const [picksSnap, rankingSnap, crystalSnap] = await Promise.all([
                    getDoc(doc(db, "users", userId, "picks", "winter_2026")),
                    getDoc(doc(db, "users", userId, "picks", "winter_2026_ranking")),
                    getDoc(doc(db, "users", userId, "picks", "winter_2026_crystal"))
                ]);

                const userPredictions = picksSnap.exists() ? picksSnap.data().list || [] : [];
                const userRanking = rankingSnap.exists() ? rankingSnap.data().order || [] : [];
                const userCrystalBall = crystalSnap.exists() ? crystalSnap.data().selections || {} : {};

                let matchdayScore = 0;
                const regularMatches = allMatches.filter(m => m.stage === Stage.GROUPS && m.winnerId);
                
                regularMatches.forEach(m => {
                    const pick = userPredictions.find((p: any) => p.matchId === m.id);
                    if (pick && pick.predictedWinnerId === m.winnerId) {
                        matchdayScore += 1;
                    }
                });

                let playoffsScore = 0;
                const playoffMatches = allMatches.filter(m => (m.stage === Stage.PLAYOFFS || m.stage === Stage.FINALS) && m.winnerId);
                const pointsPerRound: Record<number, number> = { 1: 3, 2: 4, 3: 6, 4: 8, 5: 10 };
                
                playoffMatches.forEach(m => {
                    const pick = userPredictions.find((p: any) => p.matchId === m.id);
                    if (pick && pick.predictedWinnerId === m.winnerId) {
                        playoffsScore += (pointsPerRound[m.day || 1] || 3);
                    }
                });

                let rankingScore = 0;
                if (adminRanking && adminRanking.length > 0 && userRanking.length > 0) {
                    userRanking.forEach((teamId: string, index: number) => {
                        const actualIndex = adminRanking.indexOf(teamId);
                        if (actualIndex !== -1) {
                            const diff = Math.abs(index - actualIndex);
                            if (diff === 0) rankingScore += 6;
                            else if (diff === 1) rankingScore += 3;
                        }
                    });
                }

                let crystalScore = 0;
                if (adminCrystalBall) {
                    const singles = ['winter_champ', 'mvp', 'rookie', 'best_top', 'best_jng', 'best_mid', 'best_adc', 'best_sup', 'total_pentakills'];
                    singles.forEach(key => {
                        if (userCrystalBall[key] && userCrystalBall[key] === adminCrystalBall[key]) {
                            crystalScore += (['winter_champ', 'mvp', 'rookie'].includes(key) ? 10 : 5);
                        }
                    });
                    const rankedCats = ['fastest_win_team', 'longest_win_team', 'highest_kda', 'most_picked', 'most_banned', 'highest_wr', 'lowest_wr', 'most_kills'];
                    rankedCats.forEach(cat => {
                        const userVal = userCrystalBall[cat];
                        if (userVal) {
                            if (userVal === adminCrystalBall[`${cat}_1`]) crystalScore += 5;
                            else if (userVal === adminCrystalBall[`${cat}_2`]) crystalScore += 3;
                            else if (userVal === adminCrystalBall[`${cat}_3`]) crystalScore += 1;
                        }
                    });
                }

                let fantasyTotal = 0;
                const fantasyHistory = [];
                for(let r=1; r<=7; r++) {
                    const roundRef = doc(db, "users", userId, "fantasy_rounds", `round_${r}`);
                    const roundSnap = await getDoc(roundRef);
                    const points = roundSnap.exists() ? (roundSnap.data().score || 0) : 0;
                    
                    const label = r <= 4 ? `J${FANTASY_SCHEDULE[r-1].matchdays.join('-')}` : `PO R${r-4}`;
                    fantasyHistory.push({ day: label, points: points });
                    fantasyTotal += points;
                }

                const pointsHistory: { day: string; points: number }[] = [];
                let currentCumulative = 0;

                for (let d = 1; d <= 11; d++) {
                    const dayMatches = allMatches.filter(m => m.stage === Stage.GROUPS && m.day === d && m.winnerId);
                    let dayPoints = 0;
                    dayMatches.forEach(m => {
                        const pick = userPredictions.find((p: any) => p.matchId === m.id);
                        if (pick && pick.predictedWinnerId === m.winnerId) {
                            dayPoints += 1;
                        }
                    });
                    currentCumulative += dayPoints;
                    pointsHistory.push({ day: `J${d}`, points: currentCumulative });
                }

                currentCumulative += rankingScore;
                pointsHistory.push({ day: 'Rank', points: currentCumulative });

                for (let d = 1; d <= 3; d++) {
                     let dayPoints = 0;
                     const targetRounds = (d === 3) ? [3, 4, 5] : [d];
                     const matchesInStep = playoffMatches.filter(m => targetRounds.includes(m.day || 0) && m.winnerId);
                     
                     matchesInStep.forEach(m => {
                        const pick = userPredictions.find((p: any) => p.matchId === m.id);
                        if (pick && pick.predictedWinnerId === m.winnerId) {
                            dayPoints += (pointsPerRound[m.day || 1] || 3);
                        }
                     });

                     currentCumulative += dayPoints;
                     pointsHistory.push({ day: `PO${d}`, points: currentCumulative });
                }

                const breakdown = {
                    matchday: matchdayScore,
                    ranking: rankingScore,
                    playoffs: playoffsScore,
                    crystalBall: crystalScore,
                    fantasy: parseFloat(fantasyTotal.toFixed(2))
                };

                const globalScore = breakdown.matchday + breakdown.ranking + breakdown.playoffs;

                // --- BADGE LOGIC: ORACLE (VIDENTE) ---
                // Verifica si el usuario acertó TODOS los partidos de alguna jornada COMPLETA.
                const completedDaysMap: Record<number, Match[]> = {};
                
                // Agrupamos partidos de fase regular por jornada
                const allGroupMatches = allMatches.filter(m => m.stage === Stage.GROUPS && m.day);
                allGroupMatches.forEach(m => {
                    if (!completedDaysMap[m.day!]) completedDaysMap[m.day!] = [];
                    completedDaysMap[m.day!].push(m);
                });

                let earnedOracle = false;

                Object.entries(completedDaysMap).forEach(([dayStr, dayMatches]) => {
                    // Una jornada solo cuenta si TODOS sus partidos tienen ganador (están terminados)
                    const isDayComplete = dayMatches.every(m => Boolean(m.winnerId));
                    
                    // Doble verificación: asegurarnos de que no hay partidos "pendientes" en esa jornada 
                    // que no hayamos cargado en 'dayMatches' (aunque el filtro inicial ya coge todos).
                    // Para seguridad:
                    const pendingMatches = allGroupMatches.filter(m => m.day === Number(dayStr) && !m.winnerId);

                    if (isDayComplete && pendingMatches.length === 0 && dayMatches.length >= 2) {
                        const correctCount = dayMatches.filter(m => {
                            const pick = userPredictions.find((p: any) => p.matchId === m.id);
                            return pick && pick.predictedWinnerId === m.winnerId;
                        }).length;

                        // Si acertó todos los partidos de esa jornada completa
                        if (correctCount === dayMatches.length) {
                            earnedOracle = true;
                        }
                    }
                });

                const currentBadges = new Set<string>(userData.badges || []);
                let hasBadgeChanges = false;

                if (earnedOracle && !currentBadges.has('oracle')) {
                    currentBadges.add('oracle');
                    hasBadgeChanges = true;
                }

                // Si encontramos nuevos logros, guardarlos en segundo plano para persistencia
                if (hasBadgeChanges) {
                    await this.updateUserProfile(userId, { badges: Array.from(currentBadges) });
                }

                return {
                    id: userId,
                    name: userData.username || 'Invocador',
                    avatar: userData.avatar_url || `https://ui-avatars.com/api/?name=${userData.username}&background=random`,
                    title: userData.title || '',
                    frame: userData.frame || '', 
                    banner: userData.banner || '', 
                    badges: Array.from(currentBadges), // Usar la lista actualizada
                    badgeProgress: userData.badgeProgress || {},
                    equippedBadges: userData.equippedBadges || [],
                    score: globalScore,
                    scoreBreakdown: breakdown,
                    rank: 0, 
                    pointsHistory: pointsHistory, 
                    fantasyHistory: fantasyHistory
                };
            }));
            
            return users.sort((a, b) => b.score - a.score);

        } catch (e) {
            console.error("Error fetching all users:", e);
            return [];
        }
    },

    async updateUserProfile(userId: string, updates: any) {
        const docRef = doc(db, "users", userId);
        await setDoc(docRef, cleanPayload(updates), { merge: true });
    },

    async getUserPredictions(userId: string) {
        try {
            const docRef = doc(db, "users", userId, "picks", "winter_2026");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data().list || [] : [];
        } catch (e) { return []; }
    },
    async savePredictions(predictions: any[]) {
        if (!predictions.length) return;
        const userId = predictions[0].user_id;
        const docRef = doc(db, "users", userId, "picks", "winter_2026");
        const docSnap = await getDoc(docRef);
        let currentPreds = docSnap.exists() ? docSnap.data().list || [] : [];
        predictions.forEach(newP => {
            const index = currentPreds.findIndex((p: any) => p.matchId === newP.match_id);
            if (index !== -1) currentPreds[index].predictedWinnerId = newP.predicted_winner_id;
            else currentPreds.push({ matchId: newP.match_id, predictedWinnerId: newP.predicted_winner_id });
        });
        await setDoc(docRef, { list: cleanPayload(currentPreds) }, { merge: true });
    },
    async getUserRanking(userId: string) {
        try {
            const snap = await getDoc(doc(db, "users", userId, "picks", "winter_2026_ranking"));
            return snap.exists() ? snap.data().order || [] : [];
        } catch (e) { return []; }
    },
    async saveUserRanking(userId: string, teamIds: string[]) {
        await setDoc(doc(db, "users", userId, "picks", "winter_2026_ranking"), { order: cleanPayload(teamIds) }, { merge: true });
    },
    async getAdminRanking() {
        try {
            const snap = await getDoc(doc(db, "admin_data", "results"));
            return snap.exists() ? snap.data().winter_2026_ranking || [] : [];
        } catch (e) { return []; }
    },
    async saveAdminRanking(teamIds: string[]) {
        await setDoc(doc(db, "admin_data", "results"), { winter_2026_ranking: cleanPayload(teamIds) }, { merge: true });
    },
    async getCrystalBall(userId: string) {
        try {
            const snap = await getDoc(doc(db, "users", userId, "picks", "winter_2026_crystal"));
            return snap.exists() ? snap.data().selections : {};
        } catch (e) { return {}; }
    },
    async saveCrystalBall(userId: string, selections: any) {
        await setDoc(doc(db, "users", userId, "picks", "winter_2026_crystal"), { selections: cleanPayload(selections) }, { merge: true });
    },
    async getAdminCrystalBallResults() {
        try {
            const snap = await getDoc(doc(db, "admin_data", "results"));
            return snap.exists() ? snap.data().winter_2026_crystal || {} : {};
        } catch (e) { return {}; }
    },
    async saveAdminCrystalBallResults(selections: any) {
        await setDoc(doc(db, "admin_data", "results"), { winter_2026_crystal: cleanPayload(selections) }, { merge: true });
    }
};
