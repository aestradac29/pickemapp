import { supabase } from '../lib/supabase';
import { Team, Region, Role, Player, Match, Stage } from '../types';
import { TEAMS } from '../constants'; 

// --- MAPPERS (DB -> App) ---

const mapTeamFromDB = (dbTeam: any): Team => ({
    id: dbTeam.id,
    name: dbTeam.name,
    shortName: dbTeam.short_name,
    region: dbTeam.region as Region,
    color: dbTeam.color_hex,
    logo: dbTeam.logo_url
});

const mapPlayerFromDB = (dbPlayer: any): Player => ({
    id: dbPlayer.id,
    name: dbPlayer.name,
    role: dbPlayer.role as Role,
    teamId: dbPlayer.team_id,
    photo: dbPlayer.photo_url,
    cost: dbPlayer.fantasy_cost || 0,
    averagePoints: dbPlayer.stats_avg_points || 0,
    kda: dbPlayer.stats_kda || 0
});

const mapMatchFromDB = (dbMatch: any, teams: Record<string, Team>, computedDay: number): Match => ({
    id: dbMatch.id,
    teamA: teams[dbMatch.team_a_id] || { ...TEAMS.fnc, name: 'Unknown A', id: dbMatch.team_a_id },
    teamB: teams[dbMatch.team_b_id] || { ...TEAMS.g2, name: 'Unknown B', id: dbMatch.team_b_id },
    startTime: dbMatch.start_time,
    stage: dbMatch.stage as Stage, 
    isCompleted: dbMatch.status === 'finished',
    winnerId: dbMatch.winner_id,
    day: dbMatch.day || computedDay
});

export const dataService = {
    // --- SPLITS ---
    async getSplits() {
        const { data, error } = await supabase
            .from('splits')
            .select('*')
            .order('start_date', { ascending: true });
        
        if (error) {
            console.error("Error fetching splits:", error);
            return [];
        }
        return data;
    },

    // --- TEAMS ---
    async getTeams(): Promise<Record<string, Team>> {
        const { data, error } = await supabase
            .from('teams')
            .select('*');

        if (error || !data || data.length === 0) {
            console.warn("Error o sin datos en DB para equipos.", error);
            return TEAMS;
        }

        const teamsMap: Record<string, Team> = {};
        data.forEach((t: any) => {
            teamsMap[t.id] = mapTeamFromDB(t);
        });
        
        return teamsMap;
    },

    // --- PLAYERS ---
    async getPlayers(): Promise<Player[]> {
        const { data, error } = await supabase
            .from('players')
            .select('*');
            
        if (error || !data) {
            console.error("Error fetching players:", error);
            return [];
        }

        return data.map(mapPlayerFromDB);
    },

    // --- MATCHES ---
    async getMatches(day?: number): Promise<Match[]> {
        const teamsMap = await dataService.getTeams();
        
        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .order('start_time', { ascending: true });

        if (error) {
            console.error("Error fetching matches:", error);
            return [];
        }

        if (!data || data.length === 0) return [];

        const uniqueDates = Array.from(new Set(data.map((m: any) => 
            new Date(m.start_time).toDateString()
        )));

        uniqueDates.sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime());

        const matchesWithDay = data.map((m: any) => {
            const dateStr = new Date(m.start_time).toDateString();
            const dayIndex = uniqueDates.indexOf(dateStr) + 1; 
            return mapMatchFromDB(m, teamsMap, dayIndex);
        });

        if (day) {
            return matchesWithDay.filter(m => m.day === day);
        }

        return matchesWithDay;
    },

    // Crear un nuevo partido (Admin)
    async createMatch(match: {
        split_id: string,
        team_a_id: string,
        team_b_id: string,
        start_time: string,
        stage: string,
        status: string,
        day: number
    }) {
        const { error } = await supabase
            .from('matches')
            .insert([match]);
        
        if (error) throw error;
    },

    // Actualizar un partido (Admin)
    async updateMatch(matchId: string, updates: { 
        winner_id?: string | null, 
        status?: 'scheduled' | 'live' | 'finished', 
        start_time?: string,
        team_a_id?: string,
        team_b_id?: string,
        day?: number
    }) {
        const { error } = await supabase
            .from('matches')
            .update(updates)
            .eq('id', matchId);
        
        if (error) throw error;
    },

    // --- PREDICCIONES (PICK'EM) ---
    async getUserPredictions(userId: string) {
        const { data, error } = await supabase
            .from('predictions')
            .select('match_id, predicted_winner_id')
            .eq('user_id', userId);

        if (error) {
            console.error("Error cargando predicciones:", JSON.stringify(error, null, 2));
            return [];
        }
        return data.map((p: any) => ({ matchId: p.match_id, predictedWinnerId: p.predicted_winner_id }));
    },

    async savePrediction(userId: string, matchId: string, teamId: string) {
        if (matchId.startsWith('temp-')) return;

        const { error } = await supabase
            .from('predictions')
            .upsert(
                { 
                    user_id: userId, 
                    match_id: matchId, 
                    predicted_winner_id: teamId,
                    created_at: new Date().toISOString()
                }, 
                { onConflict: 'user_id, match_id' }
            );
        
        if (error) {
            console.error("Error guardando predicción:", JSON.stringify(error, null, 2));
            throw new Error(error.message);
        }
    },

    // Guardado masivo (Batch Save)
    async savePredictions(predictions: { user_id: string, match_id: string, predicted_winner_id: string }[]) {
         if (predictions.length === 0) return;
         
         const timestamp = new Date().toISOString();
         
         // Limpieza: IDs temporales fuera
         const validPredictions = predictions.filter(p => !p.match_id.startsWith('temp-'));
         if (validPredictions.length === 0) return;

         const dataToSave = validPredictions.map(p => ({ 
            user_id: p.user_id,
            match_id: p.match_id,
            predicted_winner_id: p.predicted_winner_id,
            created_at: timestamp 
         }));

         const { error } = await supabase
            .from('predictions')
            .upsert(dataToSave, { onConflict: 'user_id, match_id' });
         
         if (error) {
            console.error("Error guardando lote de predicciones:", JSON.stringify(error, null, 2));
            throw new Error(error.message);
         }
    },

    // --- FANTASY TEAM ---
    async getFantasyTeam(userId: string) {
        const { data, error } = await supabase
            .from('fantasy_teams')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false }) 
            .limit(1)
            .single();

        if (error || !data) return null;

        return {
            [Role.TOP]: data.top_player_id,
            [Role.JUNGLE]: data.jng_player_id,
            [Role.MID]: data.mid_player_id,
            [Role.ADC]: data.adc_player_id,
            [Role.SUPPORT]: data.sup_player_id,
        };
    },

    async saveFantasyTeam(userId: string, team: Record<Role, string | null>) {
        const payload = {
            user_id: userId,
            split_id: 'winter_2026', 
            top_player_id: team[Role.TOP],
            jng_player_id: team[Role.JUNGLE],
            mid_player_id: team[Role.MID],
            adc_player_id: team[Role.ADC],
            sup_player_id: team[Role.SUPPORT],
            updated_at: new Date().toISOString()
        };

        const { data: existing } = await supabase
            .from('fantasy_teams')
            .select('id')
            .eq('user_id', userId)
            .eq('split_id', 'winter_2026')
            .single();

        let error;
        if (existing) {
             const result = await supabase
                .from('fantasy_teams')
                .update(payload)
                .eq('id', existing.id);
             error = result.error;
        } else {
             const result = await supabase
                .from('fantasy_teams')
                .insert([payload]);
             error = result.error;
        }

        if (error) {
            console.error("Error guardando fantasy team:", JSON.stringify(error, null, 2));
            throw new Error(error.message);
        }
    }
};