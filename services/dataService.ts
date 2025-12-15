import { Team, Player, Match, Role, Stage, User } from '../types';
import { TEAMS, PLAYERS, MATCHES, getMatchesForDay } from '../constants';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";

// Helper CRÍTICO: Elimina recursivamente cualquier campo 'undefined' del objeto.
// Firestore lanza una excepción si encuentra un 'undefined', lo que rompía el borrado.
const cleanPayload = (data: any): any => {
    return JSON.parse(JSON.stringify(data));
};

export const dataService = {
    // --- CONFIGURATION (Active Days & Locks) ---
    async getDaysConfig(): Promise<{ visibleDays: number[], closedDays: number[], playoffRounds?: number, playoffsAccessible?: boolean }> {
        try {
            const docRef = doc(db, "admin_data", "config");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    visibleDays: data.activeDays || [1],
                    closedDays: data.closedDays || [],
                    playoffRounds: data.playoffRounds || 5, // Default 5 rounds
                    playoffsAccessible: data.playoffsAccessible || false // Default locked
                };
            }
            return { visibleDays: [1], closedDays: [], playoffRounds: 5, playoffsAccessible: false };
        } catch (e) {
            console.error("Error loading config", e);
            return { visibleDays: [1], closedDays: [], playoffRounds: 5, playoffsAccessible: false };
        }
    },

    async updateGlobalConfig(config: { visibleDays?: number[], closedDays?: number[], playoffRounds?: number, playoffsAccessible?: boolean }) {
        const docRef = doc(db, "admin_data", "config");
        // Preparamos payload solo con lo definido para no borrar datos si no se pasan
        const payload: any = {};
        
        if (config.visibleDays) payload.activeDays = config.visibleDays;
        if (config.closedDays) payload.closedDays = config.closedDays;
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

    // --- TEAMS (Database First + Auto-Seed) ---
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

        currentData[teamId] = {
            ...currentData[teamId],
            ...updates
        };

        await setDoc(docRef, { data: cleanPayload(currentData) }, { merge: true });
    },

    // --- PLAYERS (Database First + Auto-Seed) ---
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

        // Update specific fields
        currentList[index] = {
            ...currentList[index],
            ...updates
        };

        await setDoc(docRef, { list: cleanPayload(currentList) }, { merge: true });
    },

    // --- MATCHES (Database First + Auto-Seed + Team Hydration) ---
    async getMatches(day?: number): Promise<Match[]> {
        try {
            // OPTIMIZACIÓN: Cargamos Matches y Teams en paralelo.
            const [matchesSnap, teamsSnap] = await Promise.all([
                getDoc(doc(db, "admin_data", "matches")),
                getDoc(doc(db, "admin_data", "teams"))
            ]);
            
            // Preparar mapa de equipos para hidratar
            let teamsMap: Record<string, Team> = TEAMS; 
            if (teamsSnap.exists()) {
                teamsMap = teamsSnap.data().data as Record<string, Team>;
            }

            let allMatches: Match[] = [];

            if (matchesSnap.exists()) {
                const rawMatches = matchesSnap.data().allMatches || [];
                
                // HIDRATACIÓN: Reemplazamos los objetos de equipo dentro del partido 
                // con los datos frescos de la colección 'teams'.
                allMatches = rawMatches.map((m: Match) => {
                    // RECOVERY: If day is missing, try to infer from ID (for standard seeded matches)
                    let finalDay = m.day;
                    if (!finalDay && m.id.startsWith('d') && m.id.includes('-m')) {
                        try {
                            // id format: d1-m0
                            const dayPart = m.id.split('-')[0].replace('d', '');
                            finalDay = parseInt(dayPart);
                        } catch(e) {}
                    }

                    return {
                        ...m,
                        day: finalDay,
                        teamA: teamsMap[m.teamA.id] || m.teamA, 
                        teamB: teamsMap[m.teamB.id] || m.teamB
                    };
                });

            } else {
                // Seed inicial si está vacío
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

    // --- ADMIN ACTIONS ---
    async updateMatch(matchId: string, updates: any) {
        const docRef = doc(db, "admin_data", "matches");
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) return;

        let allMatches: Match[] = docSnap.data().allMatches || [];
        const index = allMatches.findIndex(m => m.id === matchId);

        if (index === -1) throw new Error("Match not found in DB");

        const currentMatch = allMatches[index];
        const teamsRef = await this.getTeams();

        const updatedMatch: Match = {
            ...currentMatch,
            teamA: updates.team_a_id ? teamsRef[updates.team_a_id] : currentMatch.teamA,
            teamB: updates.team_b_id ? teamsRef[updates.team_b_id] : currentMatch.teamB,
            startTime: updates.start_time || currentMatch.startTime,
            winnerId: updates.winner_id !== undefined ? updates.winner_id : (currentMatch.winnerId || null),
            isCompleted: updates.status === 'finished',
            day: updates.day || currentMatch.day || null,
            bestOf: updates.bestOf ?? currentMatch.bestOf ?? 1,
            bracketStage: updates.bracketStage || currentMatch.bracketStage // Update bracketStage
        };

        allMatches[index] = updatedMatch;
        
        // CLEAN antes de guardar
        await setDoc(docRef, { allMatches: cleanPayload(allMatches) }, { merge: true });
    },

    async createMatch(matchData: any) {
        const docRef = doc(db, "admin_data", "matches");
        const docSnap = await getDoc(docRef);
        let allMatches: Match[] = docSnap.exists() ? docSnap.data().allMatches : [];

        const teamsRef = await this.getTeams();

        const newMatch: Match = {
            id: `custom-${Date.now()}`,
            teamA: teamsRef[matchData.team_a_id],
            teamB: teamsRef[matchData.team_b_id],
            startTime: matchData.start_time,
            stage: matchData.stage || Stage.GROUPS,
            isCompleted: matchData.status === 'finished',
            day: matchData.day || null,
            winnerId: null,
            bestOf: matchData.bestOf || 1,
            bracketStage: matchData.bracketStage
        };

        allMatches.push(newMatch);
        // CLEAN antes de guardar
        await setDoc(docRef, { allMatches: cleanPayload(allMatches) }, { merge: true });
    },

    async deleteMatch(matchId: string) {
        console.log("Intentando borrar partido:", matchId);
        const docRef = doc(db, "admin_data", "matches");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            let allMatches: Match[] = docSnap.data().allMatches || [];
            
            const initialCount = allMatches.length;
            const newMatches = allMatches.filter(m => m.id !== matchId);
            
            if (newMatches.length === initialCount) {
                console.warn("No se encontró el partido para borrar en la DB");
                return;
            }

            console.log("Guardando lista de partidos actualizada...");
            // CRÍTICO: Usamos cleanPayload para sanear TODO el array antes de reescribirlo.
            await setDoc(docRef, { allMatches: cleanPayload(newMatches) });
            console.log("Partido borrado correctamente en DB.");
        }
    },

    // --- USERS & LEADERBOARD ---
    async getAllUsers(): Promise<User[]> {
        try {
            // 1. Obtener datos maestros y config
            const [matches, adminRanking, config] = await Promise.all([
                this.getMatches(),
                this.getAdminRanking(),
                this.getDaysConfig()
            ]);
            
            const maxPlayoffRounds = config.playoffRounds || 5;
            
            // PRE-CALCULATION OF PLAYOFF MATCH POINTS
            const playoffMatches = matches.filter(m => m.stage === Stage.PLAYOFFS || m.stage === Stage.FINALS)
                                          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            
            // Logic copied from PlayoffBracket.tsx to identify rounds
            let grandFinal = playoffMatches.find(m => m.stage === Stage.FINALS);
            let winnersMatches = playoffMatches.filter(m => m.bracketStage === 'winners' && m.stage !== Stage.FINALS);
            
            if (!grandFinal && winnersMatches.length > 7) {
                grandFinal = winnersMatches[winnersMatches.length - 1];
                winnersMatches = winnersMatches.slice(0, winnersMatches.length - 1);
            }
            
            const losersMatches = playoffMatches.filter(m => m.bracketStage === 'losers' && m.stage !== Stage.FINALS);

            // Create a Map of MatchID -> Points Value
            const matchPointsMap = new Map<string, number>();

            // Grand Final (10 pts)
            if (grandFinal) matchPointsMap.set(grandFinal.id, 10);

            // Winners Bracket
            winnersMatches.forEach((m, idx) => {
                if (idx < 4) matchPointsMap.set(m.id, 3);      // R1 (Upper Round 1)
                else if (idx < 6) matchPointsMap.set(m.id, 4); // R2 (Upper Round 2)
                else matchPointsMap.set(m.id, 8);              // Final Winners
            });

            // Losers Bracket
            losersMatches.forEach((m, idx) => {
                if (idx < 2) matchPointsMap.set(m.id, 3);      // L-R1
                else if (idx < 4) matchPointsMap.set(m.id, 4); // L-R2
                else if (idx === 4) matchPointsMap.set(m.id, 6); // L-Semi
                else matchPointsMap.set(m.id, 8);              // L-Final
            });


            // Mapa para búsqueda rápida
            const matchMap = new Map<string, { winnerId: string | null, day: number, stage: Stage, pointsValue: number }>();
            matches.forEach(m => {
                matchMap.set(m.id, { 
                    winnerId: m.winnerId || null, 
                    day: m.day || 0, // Fallback 0
                    stage: m.stage,
                    pointsValue: matchPointsMap.get(m.id) || 1 // Default to 1 for Groups, or bracket points
                });
            });

            // 2. Obtener Usuarios
            const usersRef = collection(db, "users");
            const q = query(usersRef, orderBy("username"), limit(50));
            const snapshot = await getDocs(q);

            // 3. Procesar cada usuario y sus predicciones
            const userPromises = snapshot.docs.map(async (userDoc) => {
                const data = userDoc.data();
                const userId = userDoc.id;

                // A. PREDICCIONES
                const picksRef = doc(db, "users", userId, "picks", "winter_2026");
                const picksSnap = await getDoc(picksRef);
                const userPicks = picksSnap.exists() ? (picksSnap.data().list || []) : [];

                const regularSeasonPointsPerDay = new Array(12).fill(0); // Index 1 to 11
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
                            // Playoffs
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

                // C. CONSTRUCCIÓN DE RESULTADOS (Secuencial: Regular -> Rank -> Playoffs)
                const pointsHistory = [];
                let cumulative = 0;
                
                // 1. Fase Regular (J1-J11)
                for (let i = 1; i <= 11; i++) {
                    cumulative += regularSeasonPointsPerDay[i];
                    pointsHistory.push({ day: `J${i}`, points: cumulative });
                }

                // 2. Ranking (Se suma después de la fase regular)
                cumulative += rankingScore;
                pointsHistory.push({ day: 'Rank', points: cumulative });

                // 3. Playoffs (Se suman después del ranking)
                for (let i = 1; i <= maxPlayoffRounds; i++) {
                    cumulative += playoffPointsPerRound[i];
                    pointsHistory.push({ day: `PO${i}`, points: cumulative });
                }

                // Breakdown de puntuaciones
                const breakdown = data.scoreBreakdown || { crystalBall: 0, fantasy: 0 };
                // Calculate matchday total
                let matchdayTotal = 0;
                for(let i=1; i<=11; i++) matchdayTotal += regularSeasonPointsPerDay[i];

                breakdown.matchday = matchdayTotal;
                breakdown.playoffs = playoffsScoreTotal;
                breakdown.ranking = rankingScore;

                // Score Global
                const globalScore = matchdayTotal + playoffsScoreTotal + rankingScore;

                // Mock Fantasy History
                const fantasyTotal = breakdown.fantasy || 0;
                const fantasyHistory = Array.from({ length: 12 }, (_, i) => {
                    const label = i === 11 ? 'Playoffs' : `J${i + 1}`;
                    const points = Math.floor((fantasyTotal / 12) * (i + 1));
                    return { day: label, points: points }; 
                });

                return {
                    id: userId,
                    name: data.username || 'Invocador',
                    avatar: data.avatar_url || `https://ui-avatars.com/api/?name=${data.username || 'User'}&background=random`,
                    score: globalScore,
                    scoreBreakdown: breakdown,
                    rank: 0, 
                    pointsHistory: pointsHistory, 
                    fantasyHistory: fantasyHistory
                };
            });

            const users = await Promise.all(userPromises);
            return users.sort((a, b) => b.score - a.score);

        } catch (e) {
            console.error("Error fetching all users:", e);
            return [];
        }
    },

    // --- PREDICTIONS ---
    async getUserPredictions(userId: string) {
        try {
            const docRef = doc(db, "users", userId, "picks", "winter_2026");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data().list || [] : [];
        } catch (e) {
            console.error("Error loading predictions", e);
            return [];
        }
    },

    async savePredictions(predictions: { user_id: string, match_id: string, predicted_winner_id: string }[]) {
        if (!predictions || predictions.length === 0) return;
        const userId = predictions[0].user_id;
        const docRef = doc(db, "users", userId, "picks", "winter_2026");
        
        const docSnap = await getDoc(docRef);
        let currentPreds = docSnap.exists() ? docSnap.data().list || [] : [];

        predictions.forEach(newP => {
            const index = currentPreds.findIndex((p: any) => p.matchId === newP.match_id);
            if (index !== -1) {
                currentPreds[index].predictedWinnerId = newP.predicted_winner_id;
            } else {
                currentPreds.push({ matchId: newP.match_id, predictedWinnerId: newP.predicted_winner_id });
            }
        });

        await setDoc(docRef, { list: cleanPayload(currentPreds) }, { merge: true });
    },

    async clearAllUserPredictions(userId: string) {
        const docRef = doc(db, "users", userId, "picks", "winter_2026");
        await deleteDoc(docRef);
    },

    // --- RANKING (User Prediction vs Admin Result) ---
    async getUserRanking(userId: string): Promise<string[]> {
        try {
            const docRef = doc(db, "users", userId, "picks", "winter_2026_ranking");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data().order || [] : [];
        } catch (e) {
            console.error("Error loading user ranking", e);
            return [];
        }
    },

    async saveUserRanking(userId: string, teamIds: string[]) {
        const docRef = doc(db, "users", userId, "picks", "winter_2026_ranking");
        await setDoc(docRef, { order: cleanPayload(teamIds) }, { merge: true });
    },

    async getAdminRanking(): Promise<string[]> {
        try {
            const docRef = doc(db, "admin_data", "results");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data().winter_2026_ranking || [] : [];
        } catch (e) {
            console.error("Error loading admin ranking", e);
            return [];
        }
    },

    async saveAdminRanking(teamIds: string[]) {
        const docRef = doc(db, "admin_data", "results");
        await setDoc(docRef, { winter_2026_ranking: cleanPayload(teamIds) }, { merge: true });
    },

    // --- CRYSTAL BALL (Bola de Cristal) ---
    async getCrystalBall(userId: string) {
        try {
            const docRef = doc(db, "users", userId, "picks", "winter_2026_crystal");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data().selections : {};
        } catch (e) {
            console.error("Error loading crystal ball", e);
            return {};
        }
    },

    async saveCrystalBall(userId: string, selections: Record<string, string>) {
        const docRef = doc(db, "users", userId, "picks", "winter_2026_crystal");
        await setDoc(docRef, { selections: cleanPayload(selections) }, { merge: true });
    },

    async getAdminCrystalBallResults() {
        try {
            const docRef = doc(db, "admin_data", "results");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data().winter_2026_crystal || {} : {};
        } catch (e) {
            console.error("Error loading admin crystal ball results", e);
            return {};
        }
    },

    async saveAdminCrystalBallResults(selections: Record<string, string>) {
        const docRef = doc(db, "admin_data", "results");
        await setDoc(docRef, { winter_2026_crystal: cleanPayload(selections) }, { merge: true });
    },


    // --- FANTASY ---
    async getFantasyTeam(userId: string) {
        try {
            const docRef = doc(db, "users", userId, "fantasy", "winter_2026");
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? docSnap.data().team : null;
        } catch (e) {
            return null;
        }
    },

    async saveFantasyTeam(userId: string, team: Record<Role, string | null>) {
        const docRef = doc(db, "users", userId, "fantasy", "winter_2026");
        await setDoc(docRef, { team: cleanPayload(team) }, { merge: true });
    }
};