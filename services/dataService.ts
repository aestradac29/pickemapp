import { Team, Player, Match, Role, Stage } from '../types';
import { TEAMS, PLAYERS, MATCHES, getMatchesForDay } from '../constants';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

// Helper para asegurar que no hay undefineds (Firestore lo odia)
const sanitizeMatch = (match: Match): Match => {
    return {
        ...match,
        winnerId: match.winnerId || null,
        day: match.day || null,
        // Asegurar que otros campos opcionales no sean undefined si se añaden en el futuro
    };
};

export const dataService = {
    // --- CONFIGURATION (Active Days & Locks) ---
    async getDaysConfig(): Promise<{ visibleDays: number[], closedDays: number[] }> {
        try {
            const docRef = doc(db, "admin_data", "config");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    visibleDays: data.activeDays || [1],
                    closedDays: data.closedDays || []
                };
            }
            // Configuración por defecto si no existe
            return { visibleDays: [1], closedDays: [] };
        } catch (e) {
            console.error("Error loading config", e);
            return { visibleDays: [1], closedDays: [] };
        }
    },

    async updateGlobalConfig(config: { visibleDays: number[], closedDays: number[] }) {
        const docRef = doc(db, "admin_data", "config");
        await setDoc(docRef, { 
            activeDays: config.visibleDays,
            closedDays: config.closedDays 
        }, { merge: true });
    },

    async getSplits() {
        // Podríamos mover esto a DB también, pero por ahora estático está bien para la estructura
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
                // Si existen en DB, devolverlos
                return docSnap.data().data as Record<string, Team>;
            } else {
                // Si NO existen, subirlos (Seed) y devolverlos
                console.log("Seeding Teams to Database...");
                await setDoc(docRef, { data: TEAMS });
                return TEAMS;
            }
        } catch (e) {
            console.error("Error getting teams:", e);
            return TEAMS; // Fallback en caso de error crítico
        }
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
                await setDoc(docRef, { list: PLAYERS });
                return PLAYERS;
            }
        } catch (e) {
            console.error("Error getting players:", e);
            return PLAYERS;
        }
    },

    // --- MATCHES (Database First + Auto-Seed) ---
    async getMatches(day?: number): Promise<Match[]> {
        try {
            const docRef = doc(db, "admin_data", "matches");
            const docSnap = await getDoc(docRef);
            
            let allMatches: Match[] = [];

            if (docSnap.exists()) {
                // Obtener todos desde la DB
                allMatches = docSnap.data().allMatches || [];
            } else {
                // Si está vacío, generar TODAS las jornadas y subirlas
                console.log("Seeding Matches (Days 1-11) to Database...");
                
                // 1. Partidos iniciales sueltos (playoffs mock, etc)
                // Sanitizar para evitar undefined
                const seedMatches = [...MATCHES].map(sanitizeMatch);
                
                let generatedMatches: Match[] = [];
                // 2. Generar jornadas 1 a 11
                for (let i = 1; i <= 11; i++) {
                    const dayMatches = getMatchesForDay(i).map(sanitizeMatch);
                    generatedMatches = [...generatedMatches, ...dayMatches];
                }

                allMatches = [...seedMatches, ...generatedMatches];
                
                // Guardar sanitizados
                await setDoc(docRef, { allMatches });
            }

            // Filtrar por día si se solicita
            if (day) {
                return allMatches.filter(m => m.day === day);
            }
            return allMatches;

        } catch (e) {
            console.error("Error getting matches:", e);
            // Fallback mínimo para no romper la UI
            return day ? getMatchesForDay(day) : MATCHES;
        }
    },

    // --- ADMIN ACTIONS (Updating the Single Source of Truth) ---
    async updateMatch(matchId: string, updates: any) {
        const docRef = doc(db, "admin_data", "matches");
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) return; // Should exist by now via getMatches seed

        let allMatches: Match[] = docSnap.data().allMatches || [];
        const index = allMatches.findIndex(m => m.id === matchId);

        if (index === -1) throw new Error("Match not found in DB");

        // Merge updates
        const currentMatch = allMatches[index];
        
        // Necesitamos los equipos para reconstruir el objeto si cambian los IDs
        const teamsRef = await this.getTeams();

        const updatedMatch: Match = {
            ...currentMatch,
            teamA: updates.team_a_id ? teamsRef[updates.team_a_id] : currentMatch.teamA,
            teamB: updates.team_b_id ? teamsRef[updates.team_b_id] : currentMatch.teamB,
            startTime: updates.start_time || currentMatch.startTime,
            winnerId: updates.winner_id !== undefined ? updates.winner_id : (currentMatch.winnerId || null),
            isCompleted: updates.status === 'finished',
            day: updates.day || currentMatch.day || null
        };

        allMatches[index] = sanitizeMatch(updatedMatch);
        await setDoc(docRef, { allMatches }, { merge: true });
    },

    async createMatch(matchData: any) {
        const docRef = doc(db, "admin_data", "matches");
        const docSnap = await getDoc(docRef);
        let allMatches: Match[] = docSnap.exists() ? docSnap.data().allMatches : [];

        const teamsRef = await this.getTeams();

        const newMatch: Match = {
            id: `custom-${Date.now()}`, // ID único
            teamA: teamsRef[matchData.team_a_id],
            teamB: teamsRef[matchData.team_b_id],
            startTime: matchData.start_time,
            stage: matchData.stage || Stage.GROUPS,
            isCompleted: matchData.status === 'finished',
            day: matchData.day || null,
            winnerId: null
        };

        allMatches.push(sanitizeMatch(newMatch));
        await setDoc(docRef, { allMatches }, { merge: true });
    },

    async deleteMatch(matchId: string) {
        const docRef = doc(db, "admin_data", "matches");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            let allMatches: Match[] = docSnap.data().allMatches || [];
            const newMatches = allMatches.filter(m => m.id !== matchId);
            await setDoc(docRef, { allMatches: newMatches }); // Sobrescribir array
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
        
        // 1. Leer predicciones actuales
        const docSnap = await getDoc(docRef);
        let currentPreds = docSnap.exists() ? docSnap.data().list || [] : [];

        // 2. Actualizar o Añadir (Upsert local al array)
        predictions.forEach(newP => {
            const index = currentPreds.findIndex((p: any) => p.matchId === newP.match_id);
            if (index !== -1) {
                currentPreds[index].predictedWinnerId = newP.predicted_winner_id;
            } else {
                currentPreds.push({ matchId: newP.match_id, predictedWinnerId: newP.predicted_winner_id });
            }
        });

        // 3. Guardar array completo
        await setDoc(docRef, { list: currentPreds }, { merge: true });
    },

    async clearAllUserPredictions(userId: string) {
        const docRef = doc(db, "users", userId, "picks", "winter_2026");
        await deleteDoc(docRef);
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
        await setDoc(docRef, { team }, { merge: true });
    }
};
