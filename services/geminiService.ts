// Servicio desactivado a petición del usuario.
// Se ha eliminado la dependencia de @google/genai para evitar errores si la librería no está instalada o configurada.

import { Team } from '../types';

export const analyzeMatchup = async (teamA: Team, teamB: Team): Promise<{ analysis: string, favoredTeam: string }> => {
    return {
      analysis: "El oráculo está descansando.",
      favoredTeam: "N/A"
    };
};