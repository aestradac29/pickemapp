
import { Team, Player, Match, Role, Stage, User } from '../types';
import { TEAMS, PLAYERS, MATCHES, getMatchesForDay } from '../constants';
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
        playoffsAccessible?: boolean 
    }> {
        try {
            const docRef = doc(db, "admin_data", "config");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    visibleDays: data.activeDays || [1],
                    closedDays: data.closedDays || [],
                    // Separated config for Playoffs
                    playoffVisibleDays: data.playoffVisibleDays || [1],
                    playoffClosedDays: data.playoffClosedDays || [],
                    playoffRounds: data.playoffRounds || 5, // Default 5 rounds
                    playoffsAccessible: data.playoffsAccessible || false // Default locked
                };
            }
            return { 
                visibleDays: [1], closedDays: [], 
                playoffVisibleDays: [1], playoffClosedDays: [],
                playoffRounds: 5, playoffsAccessible: false 
            };
        } catch (e) {
            console.error("Error loading config", e);
            return { 
                visibleDays: [1], closedDays: [], 
                playoffVisibleDays: [1], playoffClosedDays: [],
                playoffRounds: 5, playoffsAccessible: false 
            };
        }
    },

    async updateGlobalConfig(config: { 
        visibleDays?: number[], 
        closedDays?: number[], 
        playoffVisibleDays?: number[], 
        playoffClosedDays?: number[],
        playoffRounds?: number, 
        playoffsAccessible?: boolean 
    }) {
        const docRef = doc(db, "admin_data", "config");
        const payload: any = {};
        
        if (config.visibleDays) payload.activeDays = config.visibleDays;
        if (config.closedDays) payload.closedDays = config.closedDays;
        
        if (config.playoffVisibleDays) payload.playoffVisibleDays = config.playoffVisibleDays;
        if (config.playoffClosedDays) payload.playoffClosedDays = config.playoffClosedDays;

        if (config.playoffRounds !== undefined) payload.playoffRounds = config.playoffRounds;
        if (config.playoffsAccessible !== undefined) payload.playoffsAccessible = config.playoffsAccessible;

        await setDoc(docRef, payload, { merge: true });
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

    // --- PLAYERS ---
    async getPlayers(): Promise<Player[]> {
        try {
            const docRef = doc(db, "admin_data", "players");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data().list as Player[];
            } else {
                console.log("Seeding Players to Database...");
                await setDoc(docRef, { list: cleanPayload(PLAYERS) });
                return PLAYERS;
            }
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
                console.log("Seeding Matches (Days 1-11) to Database...");
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
            bracketStage: updates.bracketStage || currentMatch.bracketStage
        };

        allMatches[index] = updatedMatch;
        await setDoc(docRef, { allMatches: cleanPayload(allMatches) }, { merge: true });
    },

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

    // --- USERS & LEADERBOARD ---
    async getAllUsers(): Promise<User[]> {
        try {
            // 1. Obtener datos maestros
            const [matches, adminRanking, config, adminCrystalBall] = await Promise.all([
                this.getMatches(),
                this.getAdminRanking(),
                this.getDaysConfig(),
                this.getAdminCrystalBallResults()
            ]);
            
            const maxPlayoffRounds = config.playoffRounds || 5;
            
            // PRE-CALCULATION PLAYOFFS
            const playoffMatches = matches.filter(m => m.stage === Stage.PLAYOFFS || m.stage === Stage.FINALS)
                                          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            
            let grandFinal = playoffMatches.find(m => m.stage === Stage.FINALS);
            let winnersMatches = playoffMatches.filter(m => m.bracketStage === 'winners' && m.stage !== Stage.FINALS);
            if (!grandFinal && winnersMatches.length > 7) {
                grandFinal = winnersMatches[winnersMatches.length - 1];
                winnersMatches = winnersMatches.slice(0, winnersMatches.length - 1);
            }
            const losersMatches = playoffMatches.filter(m => m.bracketStage === 'losers' && m.stage !== Stage.FINALS);

            const matchPointsMap = new Map<string, number>();
            if (grandFinal) matchPointsMap.set(grandFinal.id, 10);
            winnersMatches.forEach((m, idx) => {
                if (idx < 4) matchPointsMap.set(m.id, 3);
                else if (idx < 6) matchPointsMap.set(m.id, 4);
                else matchPointsMap.set(m.id, 8);
            });
            losersMatches.forEach((m, idx) => {
                if (idx < 2) matchPointsMap.set(m.id, 3);
                else if (idx < 4) matchPointsMap.set(m.id, 4);
                else if (idx === 4) matchPointsMap.set(m.id, 6);
                else matchPointsMap.set(m.id, 8);
            });

            const matchMap = new Map<string, { winnerId: string | null, day: number, stage: Stage, pointsValue: number }>();
            matches.forEach(m => {
                matchMap.set(m.id, { 
                    winnerId: m.winnerId || null, 
                    day: m.day || 0,
                    stage: m.stage,
                    pointsValue: matchPointsMap.get(m.id) || 1
                });
            });

            // 2. Obtener Usuarios
            const usersRef = collection(db, "users");
            const q = query(usersRef, orderBy("username"), limit(50));
            const snapshot = await getDocs(q);

            // PHASE 1: Pre-calculate raw scores for everyone
            const processedUsers = await Promise.all(snapshot.docs.map(async (userDoc) => {
                const data = userDoc.data();
                const userId = userDoc.id;

                // A. PREDICCIONES MATCHDAY & PLAYOFFS
                const picksRef = doc(db, "users", userId, "picks", "winter_2026");
                const picksSnap = await getDoc(picksRef);
                const userPicks = picksSnap.exists() ? (picksSnap.data().list || []) : [];

                const regularSeasonPointsPerDay = new Array(12).fill(0);
                const playoffPointsPerRound = new Array(maxPlayoffRounds + 1).fill(0);
                let playoffsScoreTotal = 0;

                userPicks.forEach((pick: any) => {
                    const info = matchMap.get(pick.matchId);
                    if (info && info.winnerId && pick.predictedWinnerId === info.winnerId) {
                        if (info.stage === Stage.GROUPS) {
                            if (info.day >= 1 && info.day <= 11) {
                                regularSeasonPointsPerDay[info.day] += 1;
                            }
                        } else {
                            playoffsScoreTotal += info.pointsValue;
                            if (info.day >= 1 && info.day <= maxPlayoffRounds) {
                                playoffPointsPerRound[info.day] += info.pointsValue;
                            }
                        }
                    }
                });

                // B. PUNTUACIÓN DE RANKING
                let rankingScore = 0;
                const rankingRef = doc(db, "users", userId, "picks", "winter_2026_ranking");
                const rankingSnap = await getDoc(rankingRef);
                const userRankingIds = rankingSnap.exists() ? rankingSnap.data().order || [] : [];

                if (adminRanking.length > 0 && userRankingIds.length > 0) {
                    userRankingIds.forEach((teamId: string, userIndex: number) => {
                         const adminIndex = adminRanking.indexOf(teamId);
                         if (adminIndex !== -1) {
                             const diff = Math.abs(userIndex - adminIndex);
                             if (diff === 0) rankingScore += 6;
                             else if (diff === 1) rankingScore += 3;
                         }
                    });
                }

                // C. PUNTUACIÓN DE BOLA DE CRISTAL
                let crystalBallScore = 0;
                const crystalBallRef = doc(db, "users", userId, "picks", "winter_2026_crystal");
                const crystalBallSnap = await getDoc(crystalBallRef);
                const userCrystalBall = crystalBallSnap.exists() ? crystalBallSnap.data().selections : {};

                if (Object.keys(adminCrystalBall).length > 0 && Object.keys(userCrystalBall).length > 0) {
                    const MAJOR_TITLES = ['winter_champ', 'mvp', 'rookie']; // 10 pts
                    const STANDARD_CATEGORIES = ['best_top', 'best_jng', 'best_mid', 'best_adc', 'best_sup', 'total_pentakills']; // 5 pts
                    const RANKED_CATEGORIES = [
                        'fastest_win_team', 'longest_win_team',
                        'highest_kda',
                        'most_picked', 'most_banned', 'highest_wr', 'lowest_wr', 'most_kills'
                    ];

                    MAJOR_TITLES.forEach(key => {
                        if (userCrystalBall[key] && userCrystalBall[key] === adminCrystalBall[key]) crystalBallScore += 10;
                    });
                    STANDARD_CATEGORIES.forEach(key => {
                        if (userCrystalBall[key] && userCrystalBall[key] === adminCrystalBall[key]) crystalBallScore += 5;
                    });
                    RANKED_CATEGORIES.forEach(key => {
                        const userVal = userCrystalBall[key];
                        if (userVal) {
                            if (userVal === adminCrystalBall[`${key}_1`]) crystalBallScore += 5;
                            else if (userVal === adminCrystalBall[`${key}_2`]) crystalBallScore += 3;
                            else if (userVal === adminCrystalBall[`${key}_3`]) crystalBallScore += 1;
                        }
                    });
                }

                return {
                    id: userId,
                    data,
                    regularSeasonPointsPerDay,
                    playoffPointsPerRound,
                    playoffsScoreTotal,
                    rankingScore,
                    crystalBallScore,
                    userRankingIds,
                    userCrystalBall
                };
            }));

            // PHASE 2: Determine Historical Ranking Leaders (For Pro Badge Streak)
            // We calculate the cumulative score for each day (1-11) for all users
            // and identify who was Rank 1 (highest score) at the end of each day.
            const dailyLeaders = new Array(12).fill(null).map(() => new Set<string>()); // index 1-11 used
            
            for (let day = 1; day <= 11; day++) {
                // Calculate cumulative score up to this day for everyone
                const dayScores = processedUsers.map(u => {
                    let sum = 0;
                    // Sum matchday points up to current day loop
                    for(let d = 1; d <= day; d++) sum += u.regularSeasonPointsPerDay[d];
                    return { id: u.id, score: sum };
                });

                const maxScore = Math.max(...dayScores.map(s => s.score));
                
                // If there is a valid score > 0, find leaders
                if (maxScore > 0) {
                    dayScores.filter(s => s.score === maxScore).forEach(s => dailyLeaders[day].add(s.id));
                }
            }

            // PHASE 3: Construct Final User Objects with Badges
            const users: User[] = processedUsers.map((u) => {
                const { 
                    id, data, regularSeasonPointsPerDay, playoffPointsPerRound, 
                    playoffsScoreTotal, rankingScore, crystalBallScore, 
                    userRankingIds, userCrystalBall 
                } = u;

                // Construct History
                const pointsHistory = [];
                let cumulative = 0;
                for (let i = 1; i <= 11; i++) {
                    cumulative += regularSeasonPointsPerDay[i];
                    pointsHistory.push({ day: `J${i}`, points: cumulative });
                }
                
                let midSeasonBoost = rankingScore + crystalBallScore;
                if (midSeasonBoost > 0) {
                    cumulative += midSeasonBoost;
                    pointsHistory.push({ day: 'Bonus', points: cumulative });
                }

                for (let i = 1; i <= maxPlayoffRounds; i++) {
                    cumulative += playoffPointsPerRound[i];
                    pointsHistory.push({ day: `PO${i}`, points: cumulative });
                }

                let matchdayTotal = 0;
                for(let i=1; i<=11; i++) matchdayTotal += regularSeasonPointsPerDay[i];

                const breakdown = data.scoreBreakdown || { crystalBall: 0, fantasy: 0 };
                breakdown.matchday = matchdayTotal;
                breakdown.playoffs = playoffsScoreTotal;
                breakdown.ranking = rankingScore;
                breakdown.crystalBall = crystalBallScore;

                const globalScore = matchdayTotal + playoffsScoreTotal + rankingScore + crystalBallScore;

                // Mock Fantasy
                const fantasyTotal = breakdown.fantasy || 0;
                const fantasyHistory = Array.from({ length: 12 }, (_, i) => {
                    const label = i === 11 ? 'Playoffs' : `J${i + 1}`;
                    const points = Math.floor((fantasyTotal / 12) * (i + 1));
                    return { day: label, points: points }; 
                });

                // BADGES LOGIC
                const badges: string[] = [];
                const badgeProgress: Record<string, { current: number, target: number }> = {};

                // 1. Veteran
                if (globalScore > 100) badges.push('veteran');
                badgeProgress['veteran'] = { current: globalScore, target: 100 };

                // 2. Oracle
                const maxDailyHits = Math.max(...regularSeasonPointsPerDay);
                if (maxDailyHits >= 6) badges.push('oracle');
                badgeProgress['oracle'] = { current: maxDailyHits, target: 6 };

                // 3. Strategist
                let correctRankingCount = 0;
                if (adminRanking.length >= 3 && userRankingIds.length >= 3) {
                    if (adminRanking[0] === userRankingIds[0]) correctRankingCount++;
                    if (adminRanking[1] === userRankingIds[1]) correctRankingCount++;
                    if (adminRanking[2] === userRankingIds[2]) correctRankingCount++;
                }
                if (correctRankingCount === 3) badges.push('strategist');
                badgeProgress['strategist'] = { current: correctRankingCount, target: 3 };

                // 4. Analyst
                const hasCorrectMVP = adminCrystalBall?.mvp && userCrystalBall?.mvp === adminCrystalBall.mvp;
                if (hasCorrectMVP) badges.push('analyst');
                badgeProgress['analyst'] = { current: hasCorrectMVP ? 1 : 0, target: 1 };

                // 5. On Fire
                let consecutiveHighScores = 0;
                let maxConsecutive = 0;
                for (let i = 1; i <= 11; i++) {
                    if (regularSeasonPointsPerDay[i] >= 5) {
                        consecutiveHighScores++;
                    } else {
                        consecutiveHighScores = 0;
                    }
                    if (consecutiveHighScores > maxConsecutive) maxConsecutive = consecutiveHighScores;
                }
                if (maxConsecutive >= 3) badges.push('on_fire');
                badgeProgress['on_fire'] = { current: maxConsecutive, target: 3 };

                // 6. Collector
                const level = Math.floor(globalScore / 50) + 1;
                const unlockedRewards = level; 
                if (unlockedRewards >= 10) badges.push('collector');
                badgeProgress['collector'] = { current: unlockedRewards, target: 10 };

                // 7. Pro (Consecutive Rank 1 Logic)
                let maxStreak = 0;
                let currentStreak = 0;
                // Check streaks in days 1-11
                for (let d = 1; d <= 11; d++) {
                    if (dailyLeaders[d].has(id)) {
                        currentStreak++;
                    } else {
                        currentStreak = 0;
                    }
                    if (currentStreak > maxStreak) maxStreak = currentStreak;
                }
                if (maxStreak >= 4) badges.push('pro');
                badgeProgress['pro'] = { current: maxStreak, target: 4 };

                let equippedBadges = data.equippedBadges || [];

                return {
                    id: id,
                    name: data.username || 'Invocador',
                    avatar: data.avatar_url || `https://ui-avatars.com/api/?name=${data.username || 'User'}&background=random`,
                    title: data.title || '',
                    frame: data.frame || '', 
                    banner: data.banner || '', 
                    badges: badges,
                    badgeProgress: badgeProgress,
                    equippedBadges: equippedBadges,
                    score: globalScore,
                    scoreBreakdown: breakdown,
                    rank: 0, 
                    pointsHistory: pointsHistory, 
                    fantasyHistory: fantasyHistory
                };
            });
            
            // --- POST-PROCESSING SORT & RELATIVE BADGES ---

            // A. Sort by Score
            const sortedUsers = users.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return b.scoreBreakdown.matchday - a.scoreBreakdown.matchday;
            });
            
            // B. Calculate Max Fantasy in League for MVP Badge
            const maxFantasyScore = Math.max(...sortedUsers.map(u => u.scoreBreakdown.fantasy));

            // C. Assign Ranks & Finalize Badges
            let currentRank = 1;
            sortedUsers.forEach((u, i) => {
                if (i > 0) {
                    const prev = sortedUsers[i-1];
                    const isTied = prev.score === u.score && prev.scoreBreakdown.matchday === u.scoreBreakdown.matchday;
                    if (isTied) {
                        // Share rank (keep currentRank)
                    } else {
                        currentRank = i + 1;
                    }
                } else {
                    currentRank = 1;
                }
                
                u.rank = currentRank;

                // BADGE: MANAGER MVP (Highest Fantasy Score & > 0)
                if (u.scoreBreakdown.fantasy === maxFantasyScore && maxFantasyScore > 0) {
                    u.badges?.push('mvp_fantasy');
                }
            });
            
            return sortedUsers;

        } catch (e) {
            console.error("Error fetching all users:", e);
            return [];
        }
    },

    // --- OTHER METHODS ---
    async updateUserProfile(userId: string, updates: { avatar_url?: string, title?: string, frame?: string, banner?: string }) {
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
    async clearAllUserPredictions(userId: string) {
        await deleteDoc(doc(db, "users", userId, "picks", "winter_2026"));
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
    },
    async getFantasyTeam(userId: string) {
        try {
            const snap = await getDoc(doc(db, "users", userId, "fantasy", "winter_2026"));
            return snap.exists() ? snap.data().team : null;
        } catch (e) { return null; }
    },
    async saveFantasyTeam(userId: string, team: any) {
        await setDoc(doc(db, "users", userId, "fantasy", "winter_2026"), { team: cleanPayload(team) }, { merge: true });
    }
};
