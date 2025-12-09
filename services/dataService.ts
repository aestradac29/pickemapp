import { supabase } from '../lib/supabase';
import { Team, Region, Role, Player } from '../types';
import { TEAMS } from '../constants'; // Fallback

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

export const dataService = {
    // --- TEAMS ---
    async getTeams(): Promise<Record<string, Team>> {
        const { data, error } = await supabase
            .from('teams')
            .select('*');

        if (error || !data || data.length === 0) {
            console.warn("Error o sin datos en DB para equipos. Usando Fallback.", error);
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