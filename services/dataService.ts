import { supabase } from '../lib/supabase';
import { Team, Region, Role } from '../types';
import { TEAMS } from '../constants'; // Fallback

// Mapper de base de datos (snake_case) a App (camelCase)
const mapTeamFromDB = (dbTeam: any): Team => ({
    id: dbTeam.id,
    name: dbTeam.name,
    shortName: dbTeam.short_name,
    region: dbTeam.region as Region,
    color: dbTeam.color_hex,
    logo: dbTeam.logo_url
});

export const dataService = {
    // Obtener equipos
    async getTeams(): Promise<Record<string, Team>> {
        const { data, error } = await supabase
            .from('teams')
            .select('*');

        if (error || !data || data.length === 0) {
            console.warn("Usando datos locales (Fallback) para equipos. Si acabas de crear la BD, asegúrate de poblar la tabla 'teams'.");
            return TEAMS; 
        }

        const teamsMap: Record<string, Team> = {};
        data.forEach((t: any) => {
            teamsMap[t.id] = mapTeamFromDB(t);
        });
        
        return teamsMap;
    },

    // --- PREDICCIONES (PICK'EM) ---

    async getUserPredictions(userId: string) {
        const { data, error } = await supabase
            .from('predictions')
            .select('match_id, predicted_winner_id')
            .eq('user_id', userId);

        if (error) {
            console.error("Error cargando predicciones:", error);
            return [];
        }
        return data.map(p => ({ matchId: p.match_id, predictedWinnerId: p.predicted_winner_id }));
    },

    async savePrediction(userId: string, matchId: string, teamId: string) {
        // Upsert: Insertar o Actualizar si ya existe
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
        
        if (error) console.error("Error guardando predicción:", error);
        return error;
    },

    // --- FANTASY TEAM ---

    async getFantasyTeam(userId: string) {
        const { data, error } = await supabase
            .from('fantasy_teams')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false }) // Obtener el más reciente
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
            split_id: 'winter_2026', // Valor por defecto o dinámico
            top_player_id: team[Role.TOP],
            jng_player_id: team[Role.JUNGLE],
            mid_player_id: team[Role.MID],
            adc_player_id: team[Role.ADC],
            sup_player_id: team[Role.SUPPORT],
            updated_at: new Date().toISOString()
        };

        // Nota: Asumiendo que 'fantasy_teams' tiene una restricción única en user_id + split_id
        // Si no tienes esa restricción en la BD, esto creará filas nuevas cada vez.
        // Para simplificar, intentamos borrar el anterior o usar upsert si hay PK.
        
        // Estrategia simple: Check if exists first
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

        if (error) console.error("Error guardando fantasy team:", error);
        return error;
    }
};