
import { Team, Player, Match, Role, Stage, User, PlayerGameStats, FantasyTeamState, FantasySlot, MatchGame, Notification, Card, UserCard, TradeOffer, UserPackState, CardType, Region } from '../types';
import { TEAMS, PLAYERS, MATCHES, getMatchesForDay, getFantasySchedule } from '../constants';
import { fantasyService } from './fantasyService';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, orderBy, limit, addDoc, updateDoc, where, onSnapshot } from "firebase/firestore";
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

// Helper CRÍTICO: Elimina recursivamente cualquier campo 'undefined' del objeto.
const cleanPayload = (data: any): any => {
    return JSON.parse(JSON.stringify(data));
};

export const dataService = {
    _getCurrentSplitId(): string {
        const split = localStorage.getItem('selectedSplit');
        if (split && split.toLowerCase().includes('spring')) {
            return 'spring_2026';
        }
        return 'winter_2026';
    },

    _normalizeSplitId(splitId?: string): string {
        if (!splitId) return this._getCurrentSplitId();
        const s = splitId.toLowerCase();
        if (s.includes('spring')) return 'spring_2026';
        if (s.includes('summer')) return 'summer_2026';
        return 'winter_2026';
    },

    _getDocName(baseName: string, splitId?: string): string {
        const targetSplitId = this._normalizeSplitId(splitId);
        if (targetSplitId === 'winter_2026') {
            return baseName;
        }
        return `${baseName}_${targetSplitId}`;
    },

    // --- UTILS ---
    getDeterministicWinner(userId: string, match: Match): string {
        const teamAId = (match.teamA && typeof match.teamA === 'object' && 'id' in match.teamA) ? match.teamA.id : (match.teamA as any);
        const teamBId = (match.teamB && typeof match.teamB === 'object' && 'id' in match.teamB) ? match.teamB.id : (match.teamB as any);

        if (!teamAId || !teamBId || teamAId === 'tbd' || teamBId === 'tbd') return 'tbd';
        
        const str = userId + match.id;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % 2; 
        return index === 0 ? teamAId : teamBId;
    },

    // --- CONFIGURATION (Active Days & Locks) ---
    async getDaysConfig(splitId?: string): Promise<{ 
        visibleDays: number[], 
        closedDays: number[], 
        openedDays?: number[],
        playoffVisibleDays: number[], 
        playoffClosedDays: number[],
        playoffRounds?: number, 
        playoffsAccessible?: boolean,
        fantasyRound?: number, // Current active fantasy round
        fantasyLocked?: boolean, // Is current fantasy round locked?
        albumEnabled?: boolean // Is the album feature enabled?
    }> {
        const docName = this._getDocName("config", splitId);
        const path = `admin_data/${docName}`;
        try {
            const docRef = doc(db, "admin_data", docName);
            const docSnap = await getDoc(docRef);
            
            // Default Values
            let config = {
                visibleDays: [1], closedDays: [], openedDays: [],
                playoffVisibleDays: [1], playoffClosedDays: [],
                playoffRounds: 3, playoffsAccessible: false,
                fantasyRound: 1, fantasyLocked: false,
                albumEnabled: true
            };

            if (docSnap.exists()) {
                const data = docSnap.data();
                config = {
                    visibleDays: data.visibleDays || data.activeDays || [1],
                    closedDays: data.closedDays || [],
                    openedDays: data.openedDays || [],
                    playoffVisibleDays: data.playoffVisibleDays || [1],
                    playoffClosedDays: data.playoffClosedDays || [],
                    playoffRounds: data.playoffRounds || 3, 
                    playoffsAccessible: data.playoffsAccessible || false,
                    fantasyRound: data.fantasyRound || 1,
                    fantasyLocked: data.fantasyLocked || false, // Manual Override
                    albumEnabled: data.albumEnabled !== undefined ? data.albumEnabled : true
                };
            }

            // --- AUTOMATIC LOCK LOGIC ---
            // If manual lock is FALSE, check the time of the first match of the current fantasy round
            if (!config.fantasyLocked) {
                const currentRoundDef = getFantasySchedule(splitId || this._getCurrentSplitId()).find(r => r.id === config.fantasyRound);
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
        } catch (e: any) {
            if (e.message?.includes('permission') || e.code === 'permission-denied') {
                handleFirestoreError(e, OperationType.GET, path);
            }
            console.error("Error loading config", e);
            return { 
                visibleDays: [1], closedDays: [], 
                playoffVisibleDays: [1], playoffClosedDays: [],
                playoffRounds: 3, playoffsAccessible: false,
                fantasyRound: 1, fantasyLocked: false,
                albumEnabled: true
            };
        }
    },

    async updateGlobalConfig(config: any, splitId?: string) {
        const docRef = doc(db, "admin_data", this._getDocName("config", splitId));
        await setDoc(docRef, cleanPayload(config), { merge: true });
    },

    // Helper to get points for a playoff match based on its position
    getPlayoffMatchPoints(match: Match, allPlayoffMatches: Match[]): number {
        const isSpring = this._getCurrentSplitId() === 'spring_2026';
        const sorted = [...allPlayoffMatches].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        const winners = sorted.filter(m => m.bracketStage === 'winners' && m.stage !== Stage.FINALS);
        const losers = sorted.filter(m => m.bracketStage === 'losers');
        const final = sorted.find(m => m.stage === Stage.FINALS || m.bracketStage === 'finals');

        if (isSpring) {
            // Spring Scoring:
            // R1 & R1-L: 7 pts
            if (winners.slice(0, 2).some(w => w.id === match.id)) return 7;
            if (losers.slice(0, 2).some(l => l.id === match.id)) return 7;

            // L-SEMI: 8 pts
            if (losers.slice(2, 3).some(l => l.id === match.id)) return 8;

            // FINAL-W & L-FINAL: 10 pts
            if (winners.slice(2, 3).some(w => w.id === match.id)) return 10;
            if (losers.slice(3, 4).some(l => l.id === match.id)) return 10;

            // GRAN FINAL: 12 pts
            if (final && final.id === match.id) return 12;

            return 7; // Default for Spring
        }

        // Winter Scoring (Default):
        // R1 / L-R1: 3 pts
        if (winners.slice(0, 4).some(w => w.id === match.id)) return 3;
        if (losers.slice(0, 2).some(l => l.id === match.id)) return 3;

        // R2 / L-R2: 4 pts
        if (winners.slice(4, 6).some(w => w.id === match.id)) return 4;
        if (losers.slice(2, 4).some(l => l.id === match.id)) return 4;

        // L-Semi: 6 pts
        if (losers.slice(4, 5).some(l => l.id === match.id)) return 6;

        // Final W / L-Final: 8 pts
        if (winners.slice(6, 7).some(w => w.id === match.id)) return 8;
        if (losers.slice(5, 6).some(l => l.id === match.id)) return 8;

        // Gran Final: 10 pts
        if (final && final.id === match.id) return 10;

        return 3; // Default
    },
    async getNotifications(): Promise<Notification[]> {
        try {
            const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(10));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        } catch (e) {
            console.error("Error fetching notifications:", e);
            return [];
        }
    },

    async createNotification(notification: Omit<Notification, 'id' | 'createdAt'>) {
        try {
            await addDoc(collection(db, "notifications"), {
                ...notification,
                createdAt: new Date().toISOString()
            });
        } catch (e) {
            console.error("Error creating notification:", e);
            throw e;
        }
    },

    async deleteNotification(id: string) {
        try {
            await deleteDoc(doc(db, "notifications", id));
        } catch (e) {
            console.error("Error deleting notification:", e);
            throw e;
        }
    },

    // NEW: Handle Round Transitions (Price Updates)
    async processRoundTransition(newRound: number, splitId?: string) {
        // 1. Get current state (Using fresh stats)
        const currentPlayers = await this.getPlayers(false, splitId);
        const matches = await this.getMatches(undefined, splitId);
        const schedule = getFantasySchedule(this._normalizeSplitId(splitId));
        const previousRound = newRound - 1;
        const roundConfig = schedule.find(r => r.id === previousRound);
        
        const teamStats: Record<string, { wins: number, total: number }> = {};
        if (roundConfig) {
            const roundMatches = matches.filter(m => {
                if (roundConfig.stage === Stage.GROUPS) {
                    return m.stage === Stage.GROUPS && roundConfig.matchdays.includes(m.day || 0);
                }
                return m.stage !== Stage.GROUPS && roundConfig.matchdays.includes(m.day || 0);
            });
            
            roundMatches.forEach(m => {
                if (m.isCompleted && m.winnerId) {
                    const teamAId = (m.teamA && typeof m.teamA === 'object' && 'id' in m.teamA) ? m.teamA.id : (m.teamA as any);
                    const teamBId = (m.teamB && typeof m.teamB === 'object' && 'id' in m.teamB) ? m.teamB.id : (m.teamB as any);
                    
                    [teamAId, teamBId].forEach(tId => {
                        if (!teamStats[tId]) teamStats[tId] = { wins: 0, total: 0 };
                        teamStats[tId].total++;
                        if (tId === m.winnerId) teamStats[tId].wins++;
                    });
                }
            });
        }
        
        // 2. Calculate new prices based on performance (Last Round vs Average)
        const updatedPlayers = currentPlayers.map(p => {
            const avg = p.averagePoints || 0;
            // Target price based on performance (Multiplier 15 is more sustainable)
            const targetPrice = avg * 15; 
            let change = 0;
            const currentCost = p.cost || 250; // Fallback cost if missing

            // Only change price if they have played at least 1 game
            if ((p.totalPoints || 0) > 0) {
                const stats = teamStats[p.teamId];
                const winRate = stats ? stats.wins / stats.total : 0.5; // 0.0 to 1.0
                
                // Asymmetric Logic:
                // If winRate < 0.5 (more losses): Strong penalty
                // If winRate > 0.5 (more wins): Moderate boost
                // If winRate == 0.5 (1-1): Slight decrease to combat inflation
                
                if (winRate < 0.5) {
                    // Penalización directa: Bajada fuerte (-4% a -8% del precio)
                    change = Math.floor((currentCost * -0.06) * (1 + (0.5 - winRate) * 2));
                } else if (winRate > 0.5) {
                    // Subida moderada: (+2% a +4% del precio)
                    change = Math.ceil((currentCost * 0.03) * (1 + (winRate - 0.5) * 2));
                } else {
                    // Empate (1-1): Bajada ligera para corregir inflación (-1%)
                    change = Math.floor(currentCost * -0.01);
                }
            }

            // Apply Change & Integers only
            let newCost = Math.round(currentCost + change);
            // Floor at 150, Cap at 550 (Soft limits)
            newCost = Math.max(150, Math.min(550, newCost));

            return {
                ...p,
                cost: newCost,
                priceChange: change // Store trend for UI
            };
        });

        // 3. Save new player list
        const targetSplitId = this._normalizeSplitId(splitId);
        const docName = targetSplitId === 'winter_2026' ? 'players' : `players_${targetSplitId}`;
        const playersDocRef = doc(db, "admin_data", docName);
        await setDoc(playersDocRef, { list: cleanPayload(updatedPlayers) }, { merge: true });

        // 3.5. CARRY OVER TEAMS (Rollover Lineups)
        // This ensures every user starts the new round with their previous team physically saved.
        await this.carryOverFantasyTeams(newRound, splitId);

        // 4. Update Config to new round & UNLOCK explicitly (admin triggers next round, so it starts open)
        await this.updateGlobalConfig({ 
            fantasyRound: newRound,
            fantasyLocked: false // Reset manual lock if it was set
        });
    },

    // Explicitly copy previous teams to the new round for all users
    async carryOverFantasyTeams(newRound: number, splitId?: string) {
        if (newRound <= 1) return; // No rollover for first round

        const usersRef = collection(db, "users");
        const userSnapshot = await getDocs(usersRef);
        const currentSplitId = this._normalizeSplitId(splitId || this._getCurrentSplitId());
        
        // Fetch players to infer legacy costs if missing
        const players = await this.getPlayers(false, currentSplitId);
        const playerMap = new Map<string, Player>(players.map(p => [p.id, p]));
        
        const updates = userSnapshot.docs.map(async (userDoc) => {
            const userId = userDoc.id;
            const targetDocName = this._getFantasyRoundDocName(newRound, currentSplitId);
            const targetRef = doc(db, "users", userId, "fantasy_rounds", targetDocName);
            
            // Check if new round already exists (avoid overwriting if re-running manually)
            const targetSnap = await getDoc(targetRef);
            if (targetSnap.exists()) return; 

            // Find best previous team
            let teamToCopy = null;
            let captainToCopy = null;

            // Strategy 1: Look backwards in round history (Priority)
            for (let r = newRound - 1; r >= 1; r--) {
                const prevDocName = this._getFantasyRoundDocName(r, currentSplitId);
                const prevRef = doc(db, "users", userId, "fantasy_rounds", prevDocName);
                const prevSnap = await getDoc(prevRef);
                if (prevSnap.exists()) {
                    const data = prevSnap.data();
                    if (data.team) {
                        teamToCopy = data.team;
                        captainToCopy = data.captain;
                        break;
                    }
                }
            }

            // Strategy 2: If history is broken/missing, check the 'current active' snapshot
            // This acts as a safety net if round_4 didn't save correctly but fantasy/winter_2026 has data
            if (!teamToCopy) {
                const mainRef = doc(db, "users", userId, "fantasy", currentSplitId);
                const mainSnap = await getDoc(mainRef);
                if (mainSnap.exists()) {
                    const data = mainSnap.data();
                    if (data.team) {
                        teamToCopy = data.team;
                        captainToCopy = data.captain;
                    }
                }
            }

            if (teamToCopy) {
                // Ensure purchaseCost is preserved in the copy
                const preservedTeam: Record<string, any> = {};
                Object.keys(teamToCopy).forEach(key => {
                    const slot = teamToCopy[key];
                    let playerId = null;
                    let purchaseCost = undefined;

                    if (slot && typeof slot === 'object') {
                        playerId = slot.playerId || null;
                        purchaseCost = slot.purchaseCost;
                    } else if (typeof slot === 'string') {
                        playerId = slot;
                    }

                    if (playerId && purchaseCost === undefined) {
                        const player = playerMap.get(playerId as string);
                        if (player) {
                            purchaseCost = player.cost - (player.priceChange || 0);
                        }
                    }

                    preservedTeam[key] = {
                        playerId,
                        purchaseCost
                    };
                });

                await setDoc(targetRef, {
                    team: cleanPayload(preservedTeam),
                    captain: captainToCopy || null,
                    roundId: newRound,
                    score: 0,
                    updatedAt: new Date().toISOString(),
                    rolledOver: true // Flag to indicate auto-copy
                });
            }
        });

        await Promise.all(updates);
    },

    async getSplits() {
        return [
            { id: 'winter_2026', name: 'Winter 2026', status: 'completed' },
            { id: 'spring_2026', name: 'Spring 2026', status: 'active' },
            { id: 'summer_2026', name: 'Summer 2026', status: 'upcoming' }
        ];
    },

    // --- TEAMS ---
    async getTeams(ignoreSplit: boolean = false, splitId?: string): Promise<Record<string, Team>> {
        try {
            const targetSplitId = this._normalizeSplitId(splitId);
            const docName = targetSplitId === 'winter_2026' ? 'teams' : `teams_${targetSplitId}`;
            const docRef = doc(db, "admin_data", docName);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const dbTeams = docSnap.data().data as Record<string, Team>;
                
                // Force update Fnatic logo from constants (Hotfix for stale DB data)
                if (dbTeams['fnc'] && TEAMS['fnc']) {
                    // Ensure we use the updated URL and COLOR (for contrast)
                    dbTeams['fnc'].logo = TEAMS['fnc'].logo;
                    dbTeams['fnc'].color = TEAMS['fnc'].color;
                }

                // Ensure TBD is present if not in DB (from constants)
                if (!dbTeams['tbd'] && TEAMS.tbd) {
                     return { ...dbTeams, tbd: TEAMS.tbd };
                }
                
                // Fix BDS id if it's incorrectly set to 'shf' in DB
                if (dbTeams['bds']) {
                    delete dbTeams['bds'];
                }

                // If ignoreSplit is true, ensure we have teams from other splits
                if (ignoreSplit && targetSplitId === 'spring_2026') {
                    if (!dbTeams['rat'] && TEAMS['rat']) dbTeams['rat'] = TEAMS['rat'];
                    if (!dbTeams['kcb'] && TEAMS['kcb']) dbTeams['kcb'] = TEAMS['kcb'];
                }

                // Filter out teams for Spring Split
                if (!ignoreSplit && targetSplitId === 'spring_2026') {
                    if (dbTeams['rat']) delete dbTeams['rat'];
                    if (dbTeams['kcb']) delete dbTeams['kcb'];
                }
                
                return dbTeams;
            } else {
                console.log("Seeding Teams to Database...");
                try {
                    await setDoc(docRef, { data: cleanPayload(TEAMS) });
                } catch (e) {
                    console.warn("Could not seed teams (permission issue), using constants.", e);
                }
                
                const result = { ...TEAMS };
                if (!ignoreSplit && targetSplitId === 'spring_2026') {
                    if (result['rat']) delete result['rat'];
                    if (result['kcb']) delete result['kcb'];
                }
                return result;
            }
        } catch (e) {
            console.error("Error getting teams:", e);
            const result = { ...TEAMS };
            const targetSplitId = this._normalizeSplitId(splitId);
            if (!ignoreSplit && targetSplitId === 'spring_2026') {
                if (result['rat']) delete result['rat'];
                if (result['kcb']) delete result['kcb'];
            }
            return result;
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
    async getPlayers(ignoreSplit: boolean = false, splitId?: string): Promise<Player[]> {
        try {
            const targetSplitId = this._normalizeSplitId(splitId);
            const docName = targetSplitId === 'winter_2026' ? 'players' : `players_${targetSplitId}`;
            const playersDocRef = doc(db, "admin_data", docName);
            const playersSnap = await getDoc(playersDocRef);
            let playersList: Player[] = [];

            if (playersSnap.exists()) {
                playersList = playersSnap.data().list as Player[];
                
                // If ignoreSplit is true, ensure we have players from other splits (like rat and kcb)
                if (ignoreSplit && targetSplitId === 'spring_2026') {
                    try {
                        const basePlayersDocRef = doc(db, "admin_data", "players");
                        const basePlayersSnap = await getDoc(basePlayersDocRef);
                        let basePlayersList = PLAYERS; // Fallback to constants
                        if (basePlayersSnap.exists()) {
                            basePlayersList = basePlayersSnap.data().list as Player[];
                        }
                        const existingIds = new Set(playersList.map(p => p.id));
                        for (const bp of basePlayersList) {
                            if (!existingIds.has(bp.id)) {
                                playersList.push(bp);
                            }
                        }
                    } catch (e) {
                        console.warn("Could not fetch base players for ignoreSplit merge", e);
                        // Fallback to constants on error
                        const existingIds = new Set(playersList.map(p => p.id));
                        for (const bp of PLAYERS) {
                            if (!existingIds.has(bp.id)) {
                                playersList.push(bp);
                            }
                        }
                    }
                }
            }

            // If list is empty or seems invalid (e.g. < 10 players), try to re-seed from Winter data
            if (playersList.length < 10) {
                if (targetSplitId !== 'winter_2026') {
                    const basePlayersDocRef = doc(db, "admin_data", "players");
                    const basePlayersSnap = await getDoc(basePlayersDocRef);
                    
                    if (basePlayersSnap.exists()) {
                        playersList = basePlayersSnap.data().list as Player[];
                        
                        // Filter for Spring
                        if (!ignoreSplit && targetSplitId === 'spring_2026') {
                            playersList = playersList.filter(p => p.teamId !== 'rat' && p.teamId !== 'kcb');
                        }
                        
                        // Try to save, but don't block if it fails (e.g. permissions)
                        try {
                            await setDoc(playersDocRef, { list: cleanPayload(playersList) });
                        } catch (e) {
                            console.warn("Could not save seeded players (likely permission issue), but returning seeded list.", e);
                        }
                    } else {
                        // Fallback to constants if Winter data is also missing
                        playersList = PLAYERS;
                        try {
                            await setDoc(playersDocRef, { list: cleanPayload(playersList) });
                        } catch (e) {}
                    }
                } else {
                    // Winter case: fallback to constants
                    playersList = PLAYERS;
                    try {
                        await setDoc(playersDocRef, { list: cleanPayload(playersList) });
                    } catch (e) {}
                }
            }

            // Ensure filter is applied (redundant if seeded correctly, but safe)
            if (!ignoreSplit && targetSplitId === 'spring_2026') {
                playersList = playersList.filter(p => p.teamId !== 'rat' && p.teamId !== 'kcb');
            }

            const matches = await this.getMatches();
            
            const updatedPlayers = playersList.map(player => {
                let totalKills = 0, totalDeaths = 0, totalAssists = 0, totalPoints = 0, gamesPlayed = 0;
                let highlight: string | undefined = undefined;
                let lastMatchPoints: number | undefined = undefined;

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
                        
                        // Set lastMatchPoints on the first valid match found (most recent)
                        if (lastMatchPoints === undefined) {
                            lastMatchPoints = s.totalPoints;
                        }

                        // For average calculation, we treat a BO3 series as "1 Unit" of stats in this aggregation loop
                        // because match.stats[player.id] contains the aggregated (previously averaged, now summed) stats for that match.
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
                    lastMatchPoints: lastMatchPoints,
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
        const docRef = doc(db, "admin_data", this._getDocName("players"));
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;
        let currentList: Player[] = docSnap.data().list || [];
        const index = currentList.findIndex(p => p.id === playerId);
        if (index === -1) throw new Error("Player not found");
        currentList[index] = { ...currentList[index], ...updates };
        await setDoc(docRef, { list: cleanPayload(currentList) }, { merge: true });
    },

    // NEW: Bulk update for Players to avoid Race Conditions
    async updatePlayersBulk(updates: { id: string, data: Partial<Player> }[]) {
        const docRef = doc(db, "admin_data", this._getDocName("players"));
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return;
        
        let currentList: Player[] = docSnap.data().list || [];
        
        // Iterate through updates and apply to memory list
        updates.forEach(update => {
            const index = currentList.findIndex(p => p.id === update.id);
            if (index !== -1) {
                currentList[index] = { ...currentList[index], ...update.data };
            }
        });

        // Single write operation
        await setDoc(docRef, { list: cleanPayload(currentList) }, { merge: true });
    },

    // --- MATCHES ---
    async getMatches(day?: number, splitId?: string): Promise<Match[]> {
        const targetSplitId = this._normalizeSplitId(splitId);
        const matchesDocName = this._getDocName("matches", targetSplitId);
        const path = `admin_data/${matchesDocName}`;
        try {
            const [matchesSnap, teamsSnap] = await Promise.all([
                getDoc(doc(db, "admin_data", matchesDocName)),
                getDoc(doc(db, "admin_data", this._getDocName("teams", targetSplitId)))
            ]);
            
            let teamsMap: Record<string, Team> = TEAMS; 
            if (teamsSnap.exists()) {
                teamsMap = teamsSnap.data().data as Record<string, Team>;
            }

            let allMatches: Match[] = [];

            if (matchesSnap.exists()) {
                const rawMatches = matchesSnap.data().allMatches || [];
                allMatches = rawMatches.filter(Boolean).map((m: Match) => {
                    let finalDay = m.day;
                    if (!finalDay && m.id.startsWith('d') && m.id.includes('-m')) {
                        try {
                            const dayPart = m.id.split('-')[0].replace('d', '');
                            finalDay = parseInt(dayPart);
                        } catch(e) {}
                    }

                    // --- PLAYOFF DAY ASSIGNMENT LOGIC (User Requested) ---
                    if (m.stage === Stage.PLAYOFFS || m.stage === Stage.FINALS) {
                        // We need to identify the match type to assign the correct day (1, 2, 3)
                        // Jornada 1: R1 1-4
                        // Jornada 2: R2 1-2, L-R1 1-2, L-R2 1-2, Final Winners
                        // Jornada 3: L-Semi, L-Final, Gran Final
                        
                        // To do this accurately without sorting the whole array every time, 
                        // we use the bracketStage and some known IDs or properties if available.
                        // However, for consistency, we'll apply a post-processing step below.
                    }

                    return {
                        ...m,
                        day: finalDay,
                        teamA: (m.teamA && teamsMap[m.teamA.id]) || m.teamA || { id: 'tbd', name: 'TBD', shortName: 'TBD', region: Region.LEC, color: '#6b7280' }, 
                        teamB: (m.teamB && teamsMap[m.teamB.id]) || m.teamB || { id: 'tbd', name: 'TBD', shortName: 'TBD', region: Region.LEC, color: '#6b7280' }
                    };
                });

                // --- POST-PROCESS PLAYOFF DAYS ---
                const playoffMatches = allMatches.filter(m => m.stage === Stage.PLAYOFFS || m.stage === Stage.FINALS);
                const sortedPlayoffs = [...playoffMatches].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                
                const winners = sortedPlayoffs.filter(m => m.bracketStage === 'winners' && m.stage !== Stage.FINALS);
                const losers = sortedPlayoffs.filter(m => m.bracketStage === 'losers');
                const final = sortedPlayoffs.find(m => m.stage === Stage.FINALS || m.bracketStage === 'finals');

                allMatches = allMatches.map(m => {
                    if (m.stage !== Stage.PLAYOFFS && m.stage !== Stage.FINALS) return m;

                    let assignedDay = m.day;
                    const isSpring = targetSplitId === 'spring_2026';

                    if (isSpring) {
                        // Spring Playoffs (6 teams)
                        // Jornada 1: R1 (First 2 winners)
                        if (winners.slice(0, 2).some(w => w.id === m.id)) assignedDay = 1;
                        
                        // Jornada 2: Final W (1), L-R1 (2)
                        else if (winners.slice(2, 3).some(w => w.id === m.id)) assignedDay = 2; // Final W
                        else if (losers.slice(0, 2).some(l => l.id === m.id)) assignedDay = 2;  // L-R1
                        
                        // Jornada 3: L-Semi, L-Final, Gran Final
                        else if (losers.slice(2, 3).some(l => l.id === m.id)) assignedDay = 3;  // L-Semi
                        else if (losers.slice(3, 4).some(l => l.id === m.id)) assignedDay = 3;  // L-Final
                        else if (final && final.id === m.id) assignedDay = 3;                  // Gran Final
                    } else {
                        // Winter Playoffs (8 teams)
                        // Jornada 1: R1 1-4 (First 4 winners)
                        if (winners.slice(0, 4).some(w => w.id === m.id)) assignedDay = 1;
                        
                        // Jornada 2: R2 1-2, L-R1 1-2, L-R2 1-2, Final Winners
                        else if (winners.slice(4, 6).some(w => w.id === m.id)) assignedDay = 2; // R2
                        else if (winners.slice(6, 7).some(w => w.id === m.id)) assignedDay = 2; // Final Winners
                        else if (losers.slice(0, 2).some(l => l.id === m.id)) assignedDay = 2;  // L-R1
                        else if (losers.slice(2, 4).some(l => l.id === m.id)) assignedDay = 2;  // L-R2
                        
                        // Jornada 3: L-Semi, L-Final, Gran Final
                        else if (losers.slice(4, 5).some(l => l.id === m.id)) assignedDay = 3;  // L-Semi
                        else if (losers.slice(5, 6).some(l => l.id === m.id)) assignedDay = 3;  // L-Final
                        else if (final && final.id === m.id) assignedDay = 3;                  // Gran Final
                    }

                    return { ...m, day: assignedDay };
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
                await setDoc(doc(db, "admin_data", this._getDocName("matches", targetSplitId)), { allMatches: cleanPayload(allMatches) });
            }

            if (day) {
                return allMatches.filter(m => m.day === day);
            }
            return allMatches;

        } catch (e: any) {
            if (e.message?.includes('permission') || e.code === 'permission-denied') {
                handleFirestoreError(e, OperationType.GET, path);
            }
            console.error("Error getting matches:", e);
            return [];
        }
    },

    async updateMatch(matchId: string, updates: any) {
        const docRef = doc(db, "admin_data", this._getDocName("matches"));
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

    _getFantasyRoundDocName(round: number, splitId: string): string {
        const normalized = this._normalizeSplitId(splitId);
        if (normalized === 'winter_2026') {
            return `round_${round}`;
        }
        if (normalized === 'spring_2026') {
            return `Spring 2026_round_${round}`;
        }
        return `${splitId}_round_${round}`;
    },

    // --- FANTASY SCORING SYSTEM & STORAGE ---
    
    async saveFantasyTeam(userId: string, team: Record<Role, FantasySlot>, captain: string | null, round: number, splitId: string) {
        const roundDocName = this._getFantasyRoundDocName(round, splitId);
        const roundDocRef = doc(db, "users", userId, "fantasy_rounds", roundDocName);
        await setDoc(roundDocRef, { team: cleanPayload(team), captain, roundId: round, updatedAt: new Date().toISOString() }, { merge: true });
        
        const normalizedSplitId = this._normalizeSplitId(splitId);
        const currentRef = doc(db, "users", userId, "fantasy", normalizedSplitId);
        await setDoc(currentRef, { team: cleanPayload(team), captain }, { merge: true });
    },

    async getFantasyTeam(userId: string, round: number, splitId: string): Promise<FantasyTeamState | null> {
        try {
            const roundDocName = this._getFantasyRoundDocName(round, splitId);
            const roundDocRef = doc(db, "users", userId, "fantasy_rounds", roundDocName);
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
            } else {
                // FALLBACK: INHERITANCE FROM ANY PREVIOUS ROUND (WITHIN SAME SPLIT)
                // If current round doesn't exist, search backwards for the most recent submitted lineup
                for (let r = round - 1; r >= 1; r--) {
                    const prevDocName = this._getFantasyRoundDocName(r, splitId);
                    const prevDocRef = doc(db, "users", userId, "fantasy_rounds", prevDocName);
                    const prevSnap = await getDoc(prevDocRef);

                    if (prevSnap.exists()) {
                        const data = prevSnap.data();
                        const inheritedTeam: Record<Role, FantasySlot> = {
                            [Role.TOP]: { playerId: null }, [Role.JUNGLE]: { playerId: null }, [Role.MID]: { playerId: null }, 
                            [Role.ADC]: { playerId: null }, [Role.SUPPORT]: { playerId: null }
                        };
                        const rawTeam = data.team || {};
                        
                        Object.keys(rawTeam).forEach(key => {
                            const val = rawTeam[key];
                            // IMPORTANT: Carry over the 'purchaseCost' to maintain price protection!
                            if (typeof val === 'string' || val === null) {
                                inheritedTeam[key as Role] = { playerId: val }; 
                            } else {
                                inheritedTeam[key as Role] = {
                                    playerId: val.playerId,
                                    purchaseCost: val.purchaseCost 
                                };
                            }
                        });

                        return {
                            team: inheritedTeam, 
                            captain: data.captain,
                            score: 0 // New round score starts at 0, calculated later
                        };
                    }
                }
            }
            return null;
        } catch (e) { return null; }
    },

    // MANUAL FORCE RECALCULATION WRAPPER
    async forceRecalculateAll(splitId?: string) {
        const matches = await this.getMatches(undefined, splitId);
        await this.recalculateAllFantasyScores(matches);
    },

    // ** MAJOR UPDATE ** : Supports aggregation of multiple games in BO3/BO5
    async saveMatchStatsAndCalculate(matchId: string, games: MatchGame[], splitId?: string) {
        // 1. Get Match & Players
        const [docSnap, players] = await Promise.all([
            getDoc(doc(db, "admin_data", this._getDocName("matches", splitId))),
            this.getPlayers(undefined, splitId)
        ]);
        if (!docSnap.exists()) return;

        let allMatches: Match[] = docSnap.data().allMatches || [];
        const index = allMatches.findIndex(m => m.id === matchId);
        if (index === -1) throw new Error("Match not found");

        const match = allMatches[index];

        // 2. Aggregate Stats Logic (Normalization)
        // We will sum up all raw stats to store them for posterity.
        // ** CHANGE **: totalPoints is now the SUM of all games, not average.
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
                teamDamagePercentage:0, turretDamage: 0, minionsPerMinute: 0, dragonsKilled:0, baronsKilled:0, damagePerMinute:0, visionScore:0, firstDragon:false,
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

                    // Role specifics: Sum
                    summedStats.dragonsKilled += pStats.dragonsKilled;
                    summedStats.baronsKilled += pStats.baronsKilled;
                    
                    // Averages for these metrics (purely for display/reference, not for point calc)
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
                        match.stage,
                        match.splitId,
                        match.bestOf || 1
                    );
                    totalScore += gameScore;
                }
            });

            if (gamesPlayed > 0) {
                // Normalize aggregated stats for display (averages)
                summedStats.teamDamagePercentage /= gamesPlayed;
                summedStats.damagePerMinute /= gamesPlayed;
                // Vision score is cumulative usually, but let's keep it simple for display
                
                // CRITICAL CHANGE: Final Score is SUM of games played in the series
                // Used for Fantasy BO3/BO5 scoring
                summedStats.totalPoints = parseFloat(totalScore.toFixed(2));
                
                aggregatedStats[player.id] = summedStats;
            }
        });

        // 3. Update Match Object
        // We determine the Series Winner based on game wins
        const winsA = games.filter(g => g.winnerId === match.teamA.id).length;
        const winsB = games.filter(g => g.winnerId === match.teamB.id).length;
        
        const bestOf = match.bestOf || 1;
        const winsNeeded = Math.ceil(bestOf / 2);
        
        let seriesWinnerId: string | null = null;
        let isSeriesCompleted = false;

        if (winsA >= winsNeeded) {
            seriesWinnerId = match.teamA.id;
            isSeriesCompleted = true;
        } else if (winsB >= winsNeeded) {
            seriesWinnerId = match.teamB.id;
            isSeriesCompleted = true;
        }

        const updatedMatch = { 
            ...match, 
            games: games, 
            stats: aggregatedStats, 
            winnerId: seriesWinnerId,
            isCompleted: isSeriesCompleted 
        };
        allMatches[index] = updatedMatch;
        
        await setDoc(doc(db, "admin_data", this._getDocName("matches")), { allMatches: cleanPayload(allMatches) }, { merge: true });

        // 4. Trigger Recalculation
        await this.recalculateAllFantasyScores(allMatches);
    },

    async recalculateAllFantasyScores(allMatches: Match[]) {
        const usersRef = collection(db, "users");
        const userSnapshot = await getDocs(usersRef);
        const users = userSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const currentSplitId = this._getCurrentSplitId();

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
            
            for (const roundConfig of getFantasySchedule(currentSplitId)) {
                const roundId = roundConfig.id;
                const roundDocName = this._getFantasyRoundDocName(roundId, currentSplitId);
                const roundRef = doc(db, "users", user.id, "fantasy_rounds", roundDocName);
                const roundSnap = await getDoc(roundRef);
                
                // FIND TEAM: Current or Inherited
                let teamToScore = null;
                let captainToScore = null;

                if (roundSnap.exists()) {
                    const data = roundSnap.data();
                    teamToScore = data.team;
                    captainToScore = data.captain;
                } else {
                    // Try backwards inheritance (WITHIN SAME SPLIT)
                    for (let r = roundId - 1; r >= 1; r--) {
                        const prevDocName = this._getFantasyRoundDocName(r, currentSplitId);
                        const prevRef = doc(db, "users", user.id, "fantasy_rounds", prevDocName);
                        const prevSnap = await getDoc(prevRef);
                        if (prevSnap.exists()) {
                            teamToScore = prevSnap.data().team;
                            captainToScore = prevSnap.data().captain;
                            break; // Found most recent
                        }
                    }
                }

                if (teamToScore) {
                    let roundScore = 0;
                    const relevantMatches = allMatches.filter(m => {
                        if (roundConfig.stage === Stage.GROUPS) {
                            return m.stage === Stage.GROUPS && roundConfig.matchdays.includes(m.day || 0);
                        } else {
                            return m.stage !== Stage.GROUPS && roundConfig.matchdays.includes(m.day || 0);
                        }
                    });

                    Object.values(teamToScore).forEach((slot: any) => {
                        const pid = slot?.playerId || (typeof slot === 'string' ? slot : null);
                        if (pid) {
                            let playerRoundPoints = 0;
                            relevantMatches.forEach(m => {
                                const points = matchStatsMap[m.id]?.[pid] || 0;
                                playerRoundPoints += points;
                            });
                            
                            if (pid === captainToScore) playerRoundPoints *= 1.5;
                            roundScore += playerRoundPoints;
                        }
                    });

                    // SAVE THE SCORE (And populate the round doc if it was missing)
                    await setDoc(roundRef, { 
                        team: cleanPayload(teamToScore),
                        captain: captainToScore,
                        score: parseFloat(roundScore.toFixed(2)),
                        inherited: !roundSnap.exists() // Flag to know it was auto-filled
                    }, { merge: true });
                    
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
        const docRef = doc(db, "admin_data", this._getDocName("matches"));
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
        const docRef = doc(db, "admin_data", this._getDocName("matches"));
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            let allMatches: Match[] = docSnap.data().allMatches || [];
            const newMatches = allMatches.filter(m => m.id !== matchId);
            await setDoc(docRef, { allMatches: cleanPayload(newMatches) });
        }
    },

    async getAllUsers(splitId?: string): Promise<User[]> {
        try {
            const targetSplitId = this._normalizeSplitId(splitId);
            const [allMatches, adminRanking, config] = await Promise.all([
                this.getMatches(undefined, targetSplitId),
                this.getAdminRanking(targetSplitId),
                this.getDaysConfig(targetSplitId)
            ]);

            const usersRef = collection(db, "users");
            const q = query(usersRef, orderBy("username"), limit(50));
            const snapshot = await getDocs(q);

            const users: User[] = await Promise.all(snapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                const userId = userDoc.id;

                const [picksSnap, rankingSnap] = await Promise.all([
                    getDoc(doc(db, "users", userId, "picks", targetSplitId)),
                    getDoc(doc(db, "users", userId, "picks", `${targetSplitId}_ranking`))
                ]);

                const userPredictions = picksSnap.exists() ? picksSnap.data().list || [] : [];
                const userRanking = rankingSnap.exists() ? rankingSnap.data().order || [] : [];

                let matchdayScore = 0;
                let matchdayCount = 0;
                const regularMatches = allMatches.filter(m => m.stage === Stage.GROUPS && m.winnerId);
                
                regularMatches.forEach(m => {
                    let predictedWinnerId = null;
                    const pick = userPredictions.find((p: any) => p.matchId === m.id);
                    let isRandom = false;
                    
                    if (pick && pick.predictedWinnerId) {
                        predictedWinnerId = pick.predictedWinnerId;
                    } else {
                        predictedWinnerId = this.getDeterministicWinner(userId, m);
                        isRandom = true;
                    }

                    // Random picks only count if match is on/after Feb 21, 2026
                    if (isRandom) {
                        const matchTime = new Date(m.startTime).getTime();
                        const cutoff = new Date('2026-02-21T00:00:00').getTime();
                        if (matchTime < cutoff) {
                            predictedWinnerId = null;
                        }
                    }

                    if (predictedWinnerId === m.winnerId) {
                        const isSpring = targetSplitId === 'spring_2026';
                        matchdayScore += isSpring ? 1.5 : 1;
                        matchdayCount++;
                    }
                });

                let playoffsScore = 0;
                const playoffMatches = allMatches.filter(m => (m.stage === Stage.PLAYOFFS || m.stage === Stage.FINALS) && m.winnerId);
                const pointsPerRound: Record<number, number> = { 1: 3, 2: 4, 3: 6, 4: 8, 5: 10 };
                
                playoffMatches.forEach(m => {
                    let predictedWinnerId = null;
                    const pick = userPredictions.find((p: any) => p.matchId === m.id);
                    let isRandom = false;

                    if (pick && pick.predictedWinnerId) {
                        predictedWinnerId = pick.predictedWinnerId;
                    } else {
                        predictedWinnerId = this.getDeterministicWinner(userId, m);
                        isRandom = true;
                    }

                    // Random picks only count if match is on/after Feb 21, 2026
                    if (isRandom) {
                        const matchTime = new Date(m.startTime).getTime();
                        const cutoff = new Date('2026-02-21T00:00:00').getTime();
                        if (matchTime < cutoff) {
                            predictedWinnerId = null;
                        }
                    }

                    if (predictedWinnerId === m.winnerId) {
                        playoffsScore += this.getPlayoffMatchPoints(m, playoffMatches);
                    }
                });

                let rankingScore = 0;
                if (adminRanking && adminRanking.length > 0 && userRanking.length > 0) {
                    const isSpring = targetSplitId === 'spring_2026';
                    userRanking.forEach((teamId: string, index: number) => {
                        const actualIndex = adminRanking.indexOf(teamId);
                        if (actualIndex !== -1) {
                            const diff = Math.abs(index - actualIndex);
                            if (diff === 0) rankingScore += isSpring ? 6.75 : 6;
                            else if (diff === 1) rankingScore += isSpring ? 3.5 : 3;
                            else if (isSpring && index < 6 && actualIndex < 6) rankingScore += 1;
                        }
                    });
                }

                let fantasyTotal = 0;
                const fantasyHistory = [];
                const schedule = getFantasySchedule(targetSplitId);
                for(const roundConfig of schedule) {
                    const r = roundConfig.id;
                    const roundDocName = this._getFantasyRoundDocName(r, targetSplitId);
                    const roundRef = doc(db, "users", userId, "fantasy_rounds", roundDocName);
                    const roundSnap = await getDoc(roundRef);
                    const points = roundSnap.exists() ? (roundSnap.data().score || 0) : 0;
                    
                    const label = roundConfig.stage === Stage.GROUPS ? `J${roundConfig.matchdays.join('-')}` : roundConfig.label.replace('Playoffs R', 'PO R');
                    fantasyHistory.push({ day: label, points: points });
                    fantasyTotal += points;
                }

                const pointsHistory: { day: string; points: number }[] = [];
                let currentCumulative = 0;
                const isSpring = targetSplitId === 'spring_2026';
                const maxDays = isSpring ? 7 : 11;

                for (let d = 1; d <= maxDays; d++) {
                    const dayMatches = allMatches.filter(m => m.stage === Stage.GROUPS && m.day === d && m.winnerId);
                    let dayPoints = 0;
                    dayMatches.forEach(m => {
                        let predictedWinnerId = null;
                        const pick = userPredictions.find((p: any) => p.matchId === m.id);
                        let isRandom = false;
                        
                        if (pick && pick.predictedWinnerId) {
                            predictedWinnerId = pick.predictedWinnerId;
                        } else {
                            predictedWinnerId = this.getDeterministicWinner(userId, m);
                            isRandom = true;
                        }

                        if (isRandom) {
                            const matchTime = new Date(m.startTime).getTime();
                            const cutoff = new Date('2026-02-21T00:00:00').getTime();
                            if (matchTime < cutoff) {
                                predictedWinnerId = null;
                            }
                        }

                        if (predictedWinnerId === m.winnerId) {
                            const isSpring = this._getCurrentSplitId() === 'spring_2026';
                            dayPoints += isSpring ? 1.5 : 1;
                        }
                    });
                    currentCumulative += dayPoints;
                    pointsHistory.push({ day: `J${d}`, points: currentCumulative });
                }

                currentCumulative += rankingScore;
                pointsHistory.push({ day: 'Rank', points: currentCumulative });

                for (let d = 1; d <= 3; d++) {
                     let dayPoints = 0;
                     const matchesInStep = playoffMatches.filter(m => m.day === d && m.winnerId);
                     
                     matchesInStep.forEach(m => {
                        let predictedWinnerId = null;
                        const pick = userPredictions.find((p: any) => p.matchId === m.id);
                        let isRandom = false;
                        
                        if (pick && pick.predictedWinnerId) {
                            predictedWinnerId = pick.predictedWinnerId;
                        } else {
                            predictedWinnerId = this.getDeterministicWinner(userId, m);
                            isRandom = true;
                        }

                        if (isRandom) {
                            const matchTime = new Date(m.startTime).getTime();
                            const cutoff = new Date('2026-02-21T00:00:00').getTime();
                            if (matchTime < cutoff) {
                                predictedWinnerId = null;
                            }
                        }

                        if (predictedWinnerId === m.winnerId) {
                            dayPoints += this.getPlayoffMatchPoints(m, playoffMatches);
                        }
                     });

                     currentCumulative += dayPoints;
                     pointsHistory.push({ day: `PO${d}`, points: currentCumulative });
                }

                const breakdown = {
                    matchday: matchdayScore,
                    matchdayCount: matchdayCount,
                    ranking: rankingScore,
                    playoffs: playoffsScore,
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
                            let predictedWinnerId = null;
                            const pick = userPredictions.find((p: any) => p.matchId === m.id);
                            let isRandom = false;
                            
                            if (pick && pick.predictedWinnerId) {
                                predictedWinnerId = pick.predictedWinnerId;
                            } else {
                                predictedWinnerId = this.getDeterministicWinner(userId, m);
                                isRandom = true;
                            }

                            if (isRandom) {
                                const matchTime = new Date(m.startTime).getTime();
                                const cutoff = new Date('2026-02-21T00:00:00').getTime();
                                if (matchTime < cutoff) {
                                    predictedWinnerId = null;
                                }
                            }
                            
                            return predictedWinnerId === m.winnerId;
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

                const splitScores = userData.splitScores || {};
                let hasScoreChanges = false;
                if (splitScores[targetSplitId] !== globalScore) {
                    splitScores[targetSplitId] = globalScore;
                    hasScoreChanges = true;
                }
                const totalScore: number = (Object.values(splitScores) as number[]).reduce((sum: number, score: number) => sum + (Number(score) || 0), 0);

                // Si encontramos nuevos logros o cambios en el score, guardarlos en segundo plano para persistencia
                if (hasBadgeChanges || hasScoreChanges) {
                    const updates: any = {};
                    if (hasBadgeChanges) updates.badges = Array.from(currentBadges);
                    if (hasScoreChanges) updates.splitScores = splitScores;
                    this.updateUserProfile(userId, updates).catch(console.error);
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
                    totalScore: totalScore,
                    scoreBreakdown: breakdown,
                    rank: 0, // Placeholder, calculated below
                    pointsHistory: pointsHistory, 
                    fantasyHistory: fantasyHistory
                };
            }));
            
            // SORTING LOGIC: Total Score > Matchday Hits (Tiebreaker)
            users.sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                return b.scoreBreakdown.matchday - a.scoreBreakdown.matchday;
            });

            // ASSIGN RANKS (Dense Ranking: 1, 2, 2, 4...)
            for (let i = 0; i < users.length; i++) {
                if (i > 0) {
                    const prev = users[i-1];
                    const curr = users[i];
                    
                    // Check if scores are identical including tie-breaker
                    if (prev.score === curr.score && prev.scoreBreakdown.matchday === curr.scoreBreakdown.matchday) {
                        curr.rank = prev.rank;
                    } else {
                        curr.rank = i + 1;
                    }
                } else {
                    users[i].rank = 1;
                }
            }
            
            return users;

        } catch (e) {
            console.error("Error fetching all users:", e);
            return [];
        }
    },

    subscribeToUsers(callback: () => void) {
        const usersRef = collection(db, "users");
        return onSnapshot(usersRef, () => {
            callback();
        }, (error) => {
            console.warn("Firestore Subscription Error (users):", error);
        });
    },

    async updateUserProfile(userId: string, updates: any) {
        const docRef = doc(db, "users", userId);
        await setDoc(docRef, cleanPayload(updates), { merge: true });
    },

    async getUserPredictions(userId: string, splitId?: string) {
        try {
            const docRef = doc(db, "users", userId, "picks", this._normalizeSplitId(splitId));
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data().list || [] : [];
        } catch (e) { return []; }
    },
    async savePredictions(predictions: any[], splitId?: string) {
        if (!predictions.length) return;
        const userId = predictions[0].user_id;
        const docRef = doc(db, "users", userId, "picks", this._normalizeSplitId(splitId));
        const docSnap = await getDoc(docRef);
        let currentPreds = docSnap.exists() ? docSnap.data().list || [] : [];
        predictions.forEach(newP => {
            const index = currentPreds.findIndex((p: any) => p.matchId === newP.match_id);
            if (index !== -1) currentPreds[index].predictedWinnerId = newP.predicted_winner_id;
            else currentPreds.push({ matchId: newP.match_id, predictedWinnerId: newP.predicted_winner_id });
        });
        await setDoc(docRef, { list: cleanPayload(currentPreds) }, { merge: true });
    },
    async getUserRanking(userId: string, splitId?: string) {
        try {
            const targetSplitId = this._normalizeSplitId(splitId);
            const snap = await getDoc(doc(db, "users", userId, "picks", `${targetSplitId}_ranking`));
            return snap.exists() ? snap.data().order || [] : [];
        } catch (e) { return []; }
    },
    async saveUserRanking(userId: string, teamIds: string[], splitId?: string) {
        const targetSplitId = this._normalizeSplitId(splitId);
        await setDoc(doc(db, "users", userId, "picks", `${targetSplitId}_ranking`), { order: cleanPayload(teamIds) }, { merge: true });
    },
    async getAdminRanking(splitId?: string) {
        try {
            const targetSplitId = this._normalizeSplitId(splitId);
            const snap = await getDoc(doc(db, "admin_data", this._getDocName("results", targetSplitId)));
            return snap.exists() ? snap.data()[`${targetSplitId}_ranking`] || [] : [];
        } catch (e) { return []; }
    },
    async saveAdminRanking(teamIds: string[], splitId?: string) {
        const targetSplitId = this._normalizeSplitId(splitId);
        await setDoc(doc(db, "admin_data", this._getDocName("results", targetSplitId)), { [`${targetSplitId}_ranking`]: cleanPayload(teamIds) }, { merge: true });
    },

    // --- CARD COLLECTION SYSTEM ---
    async getCardsForSplit(splitId: string): Promise<Card[]> {
        try {
            const docRef = doc(db, "admin_data", `cards_${splitId}`);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const existingCards = docSnap.data().cards || [];
                // Re-seed if winter and missing rat/kcb cards (should be 72 cards total)
                if (splitId === 'winter_2026' && existingCards.length < 70) {
                    console.log("Re-seeding winter cards to include missing teams...");
                } 
                // Re-seed if spring and has rat/kcb cards (should be 60 cards total)
                else if (splitId === 'spring_2026' && existingCards.length > 65) {
                    console.log("Re-seeding spring cards to remove extra teams...");
                }
                else {
                    return existingCards;
                }
            }
            
            // Seed initial cards
            const isWinter = splitId === 'winter_2026';
                const players = await this.getPlayers(isWinter, splitId);
                const teams = await this.getTeams(isWinter, splitId);
                
                const cards: Card[] = [];
                
                // Add Team Cards (exclude TBD)
                Object.values(teams).forEach((team: any) => {
                    if (team.id !== 'tbd') {
                        cards.push({
                            id: `card_team_${team.id}`,
                            splitId,
                            type: CardType.TEAM,
                            referenceId: team.id
                        });
                    }
                });

                // Add Player Cards
                players.forEach(player => {
                    cards.push({
                        id: `card_player_${player.id}`,
                        splitId,
                        type: CardType.PLAYER,
                        referenceId: player.id
                    });
                });

                await setDoc(docRef, { cards: cleanPayload(cards) });
                return cards;
        } catch (e) {
            console.error("Error getting cards:", e);
            return [];
        }
    },

    async saveCardsForSplit(splitId: string, cards: Card[]): Promise<void> {
        try {
            const docRef = doc(db, "admin_data", `cards_${splitId}`);
            await setDoc(docRef, { cards: cleanPayload(cards) });
        } catch (e) {
            console.error("Error saving cards:", e);
            throw e;
        }
    },

    async getUserCollection(userId: string, splitId: string): Promise<UserCard[]> {
        try {
            const collectionRef = collection(db, "users", userId, `collection_${splitId}`);
            const snapshot = await getDocs(collectionRef);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserCard));
        } catch (e) {
            console.error("Error getting user collection:", e);
            return [];
        }
    },

    async getUserPackState(userId: string, splitId: string): Promise<UserPackState | null> {
        try {
            const docRef = doc(db, "users", userId, "pack_states", splitId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as UserPackState;
            }
            return null;
        } catch (e) {
            console.error("Error getting pack state:", e);
            return null;
        }
    },

    async getUserInventory(userId: string, splitId: string): Promise<UserCard[]> {
        try {
            const inventoryRef = collection(db, "users", userId, `inventory_${splitId}`);
            const snapshot = await getDocs(inventoryRef);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserCard));
        } catch (e) {
            console.error("Error getting user inventory:", e);
            return [];
        }
    },

    async moveCardToCollection(userId: string, splitId: string, inventoryItemId: string, cardId: string) {
        try {
            // 1. Add to Collection
            const collectionRef = collection(db, "users", userId, `collection_${splitId}`);
            const currentCollection = await this.getUserCollection(userId, splitId);
            const existingInCollection = currentCollection.find(uc => uc.cardId === cardId);

            if (existingInCollection) {
                // Duplicate prevention: if already in collection, don't add more.
                // Duplicate cards stay in inventory.
                return;
            } else {
                await addDoc(collectionRef, {
                    userId,
                    cardId,
                    quantity: 1
                });
            }

            // 2. Update Inventory
            const inventoryDocRef = doc(db, "users", userId, `inventory_${splitId}`, inventoryItemId);
            const inventoryDoc = await getDoc(inventoryDocRef);
            
            if (inventoryDoc.exists()) {
                const currentQty = inventoryDoc.data().quantity || 1;
                if (currentQty > 1) {
                    await updateDoc(inventoryDocRef, { quantity: currentQty - 1 });
                } else {
                    await deleteDoc(inventoryDocRef);
                }
            }

        } catch (e) {
            console.error("Error moving card to collection:", e);
            throw e;
        }
    },

    async deleteUserCollection(userId: string, splitId: string) {
        try {
            // Delete Collection
            const collectionRef = collection(db, "users", userId, `collection_${splitId}`);
            const snapshot = await getDocs(collectionRef);
            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            // Delete Inventory
            const inventoryRef = collection(db, "users", userId, `inventory_${splitId}`);
            const invSnapshot = await getDocs(inventoryRef);
            const invDeletePromises = invSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(invDeletePromises);

            // Reset Pack State (optional, but good for full reset)
            const packStateRef = doc(db, "users", userId, "pack_states", splitId);
            await deleteDoc(packStateRef);

        } catch (e) {
            console.error("Error deleting user collection:", e);
            throw e;
        }
    },

    async openDailyPack(userId: string, splitId: string): Promise<Card[]> {
        try {
            // INFINITE PACKS ENABLED: Cooldown check removed for testing
            /*
            const packState = await this.getUserPackState(userId, splitId);
            const now = new Date();
            
            // Check if 24 hours have passed
            if (packState && packState.lastOpenedAt) {
                const lastOpened = new Date(packState.lastOpenedAt);
                const diffHours = Math.abs(now.getTime() - lastOpened.getTime()) / 36e5;
                if (diffHours < 24) {
                    throw new Error(`Debes esperar ${Math.ceil(24 - diffHours)} horas para abrir otro sobre.`);
                }
            }
            */
            const now = new Date();

            // Get all possible cards
            const allCards = await this.getCardsForSplit(splitId);
            if (allCards.length === 0) throw new Error("No hay cartas disponibles en este split.");

            // Generate 3 random cards
            const drawnCards: Card[] = [];
            for (let i = 0; i < 3; i++) {
                const randomIndex = Math.floor(Math.random() * allCards.length);
                drawnCards.push(allCards[randomIndex]);
            }

            // Save to user INVENTORY (not collection directly)
            const inventoryRef = collection(db, "users", userId, `inventory_${splitId}`);
            const currentInventory = await this.getUserInventory(userId, splitId);
            
            const batchUpdates = drawnCards.map(async (card) => {
                const existing = currentInventory.find(inv => inv.cardId === card.id);
                if (existing) {
                    const docRef = doc(db, "users", userId, `inventory_${splitId}`, existing.id);
                    await updateDoc(docRef, { quantity: existing.quantity + 1 });
                } else {
                    await addDoc(inventoryRef, {
                        userId,
                        cardId: card.id,
                        quantity: 1,
                        obtainedAt: now.toISOString()
                    });
                }
            });

            await Promise.all(batchUpdates);

            // Update Pack State
            const stateRef = doc(db, "users", userId, "pack_states", splitId);
            await setDoc(stateRef, {
                userId,
                splitId,
                lastOpenedAt: now.toISOString()
            }, { merge: true });

            return drawnCards;

        } catch (e) {
            console.error("Error opening pack:", e);
            throw e;
        }
    },

    // --- TRADING SYSTEM ---
    async getAllDuplicateCards(splitId: string): Promise<{userId: string, username: string, cardId: string, quantity: number}[]> {
        try {
            const usersRef = collection(db, "users");
            const usersSnap = await getDocs(usersRef);
            
            const duplicates: {userId: string, username: string, cardId: string, quantity: number}[] = [];
            
            for (const userDoc of usersSnap.docs) {
                const userData = userDoc.data();
                const userId = userDoc.id;
                const username = userData.username || 'Invocador';
                
                const inventoryRef = collection(db, "users", userId, `inventory_${splitId}`);
                const invSnap = await getDocs(inventoryRef);
                
                invSnap.docs.forEach(doc => {
                    const cardData = doc.data() as UserCard;
                    // In the new system, everything in inventory is a "duplicate" (or unpasted card)
                    // But we only want to show it if they already have it in collection
                    duplicates.push({
                        userId,
                        username,
                        cardId: cardData.cardId,
                        quantity: cardData.quantity
                    });
                });
            }
            return duplicates;
        } catch (e) {
            console.error("Error getting duplicate cards:", e);
            return [];
        }
    },

    async createTradeOffer(offer: Omit<TradeOffer, 'id' | 'createdAt'>): Promise<void> {
        try {
            await addDoc(collection(db, "trade_offers"), {
                ...offer,
                createdAt: new Date().toISOString()
            });
        } catch (e) {
            console.error("Error creating trade offer:", e);
            throw e;
        }
    },

    async getUserTradeOffers(userId: string): Promise<TradeOffer[]> {
        const offersRef = collection(db, "trade_offers");
        const offersMap = new Map<string, TradeOffer>();
        
        try {
            // Try to get offers sent by user
            try {
                const qFrom = query(offersRef, where("senderId", "==", userId));
                const snapFrom = await getDocs(qFrom);
                snapFrom.docs.forEach(doc => {
                    offersMap.set(doc.id, { id: doc.id, ...doc.data() } as TradeOffer);
                });
            } catch (e) {
                console.warn("Error getting sent offers (likely permission issue):", e);
            }

            // Try to get offers received by user
            try {
                const qTo = query(offersRef, where("receiverId", "==", userId));
                const snapTo = await getDocs(qTo);
                snapTo.docs.forEach(doc => {
                    offersMap.set(doc.id, { id: doc.id, ...doc.data() } as TradeOffer);
                });
            } catch (e) {
                console.warn("Error getting received offers (likely permission issue):", e);
            }
            
            return Array.from(offersMap.values())
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch (e) {
            console.error("Error in getUserTradeOffers:", e);
            return [];
        }
    },

    async respondToTradeOffer(offerId: string, status: 'ACCEPTED' | 'REJECTED', splitId: string): Promise<void> {
        try {
            const offerRef = doc(db, "trade_offers", offerId);
            const offerSnap = await getDoc(offerRef);
            
            if (!offerSnap.exists()) throw new Error("Offer not found");
            
            const offer = offerSnap.data() as TradeOffer;
            if (offer.status !== 'PENDING') throw new Error("Offer is no longer pending");

            if (status === 'ACCEPTED') {
                // Execute trade
                // 1. Verify both users still have the cards in inventory
                const fromInventory = await this.getUserInventory(offer.senderId, splitId);
                const toInventory = await this.getUserInventory(offer.receiverId!, splitId);

                const offeredCard = fromInventory.find(uc => uc.cardId === offer.offeredCardId);
                const hasOffered = offeredCard && offeredCard.quantity > 0;
                
                const requestedCard = toInventory.find(uc => uc.cardId === offer.requestedCardId);
                const hasRequested = requestedCard && requestedCard.quantity > 0;

                if (!hasOffered || !hasRequested) {
                    await updateDoc(offerRef, { status: 'CANCELLED' });
                    throw new Error("One of the users no longer has the required cards.");
                }

                // 2. Transfer cards (using inventory)
                await this.transferCard(offer.senderId, offer.receiverId!, offer.offeredCardId, splitId);
                await this.transferCard(offer.receiverId!, offer.senderId, offer.requestedCardId, splitId);
            }

            await updateDoc(offerRef, { status });

        } catch (e) {
            console.error("Error responding to trade:", e);
            throw e;
        }
    },

    async transferCard(fromUserId: string, toUserId: string, cardId: string, splitId: string) {
        // Decrease from sender's inventory
        const fromInvRef = collection(db, "users", fromUserId, `inventory_${splitId}`);
        const fromSnap = await getDocs(fromInvRef);
        const fromDoc = fromSnap.docs.find(d => d.data().cardId === cardId);
        if (fromDoc) {
            const currentQty = fromDoc.data().quantity || 1;
            if (currentQty <= 1) {
                await deleteDoc(doc(db, "users", fromUserId, `inventory_${splitId}`, fromDoc.id));
            } else {
                await updateDoc(doc(db, "users", fromUserId, `inventory_${splitId}`, fromDoc.id), { quantity: currentQty - 1 });
            }
        }

        // Increase for receiver's inventory
        const toInvRef = collection(db, "users", toUserId, `inventory_${splitId}`);
        const toSnap = await getDocs(toInvRef);
        const toDoc = toSnap.docs.find(d => d.data().cardId === cardId);
        if (toDoc) {
            await updateDoc(doc(db, "users", toUserId, `inventory_${splitId}`, toDoc.id), { quantity: (toDoc.data().quantity || 1) + 1 });
        } else {
            await addDoc(toInvRef, { userId: toUserId, cardId: cardId, quantity: 1, obtainedAt: new Date().toISOString() });
        }
    }
};
