
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { Player, PlayerGameStats } from '../types';

// Definición del esquema de respuesta esperado para Gemini
const statsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    stats: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          playerName: { type: Type.STRING, description: "Nombre del jugador encontrado en el texto (ej: 'Yike', 'Caps')" },
          kills: { type: Type.NUMBER },
          deaths: { type: Type.NUMBER },
          assists: { type: Type.NUMBER },
          cs: { type: Type.NUMBER, description: "Creep Score / Súbditos" },
          isMvp: { type: Type.BOOLEAN },
          doubleKills: { type: Type.NUMBER },
          tripleKills: { type: Type.NUMBER },
          quadraKills: { type: Type.NUMBER },
          pentaKills: { type: Type.NUMBER },
          totalDamage: { type: Type.NUMBER, description: "Daño total a campeones" },
          damagePerMinute: { type: Type.NUMBER, description: "Daño por minuto (DPM)" },
          teamTotalDamage: { type: Type.NUMBER, description: "Daño total del equipo de este jugador (para calcular porcentaje)" },
          turretDamage: { type: Type.NUMBER, description: "Daño infligido a torretas (Damage dealt to turrets)" },
          minionsPerMinute: { type: Type.NUMBER, description: "Súbditos por minuto (CSM o Minions/Min)" },
          gold: { type: Type.NUMBER },
          visionScore: { type: Type.NUMBER },
          // Stats de equipo inferidas para el jugador
          dragonsKilled: { type: Type.NUMBER, description: "Total dragones matados por SU equipo" },
          baronsKilled: { type: Type.NUMBER, description: "Total barones matados por SU equipo" },
          firstBlood: { type: Type.BOOLEAN },
          firstDragon: { type: Type.BOOLEAN, description: "Si su equipo hizo el primer dragón" }
        }
      }
    }
  }
};

export const extractStatsFromData = async (
  rawData: string, 
  availablePlayers: Player[]
): Promise<Record<string, Partial<PlayerGameStats>>> => {
  
  // --- FIX: DETECCION DE VARIABLES DE ENTORNO EN VITE/VERCEL ---
  // En Vite (producción), process.env suele estar vacío. Se debe usar import.meta.env.
  // Buscamos varias claves posibles para mayor compatibilidad.
  let apiKey = '';
  
  // 1. Intentar VITE env vars (Estándar para React+Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
      apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || '';
  }

  // 2. Fallback a process.env (Si se define en build time o un polyfill)
  if (!apiKey && typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY || '';
  }

  if (!apiKey) {
    console.error("❌ ERROR CRÍTICO: No se encontró la API Key de Gemini.");
    console.error("Asegúrate de configurar la variable de entorno 'VITE_GEMINI_API_KEY' en Vercel/Netlify.");
    throw new Error("API Key de Gemini no configurada");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  // Lista de nombres para ayudar a la IA a mapear
  const playerNamesList = availablePlayers.map(p => p.name).join(", ");

  const prompt = `
    Analiza el siguiente texto o HTML de un partido de League of Legends.
    Extrae las estadísticas de los jugadores.
    
    IMPORTANTE:
    1. Intenta coincidir los nombres encontrados con esta lista de jugadores conocidos: [${playerNamesList}].
    2. Si encuentras datos de daño (Total Damage), extrae el daño del jugador Y el daño total de su equipo para poder calcular porcentajes.
    3. Busca explícitamente el valor 'DPM' o 'Damage Per Minute' y asígnalo al campo damagePerMinute.
    4. Para roles específicos:
       - Top: Busca el daño a torretas (Damage dealt to turrets) y el CSM (Minions/Min).
       - Mid: Busca el daño a torretas (Damage dealt to turrets).
       - Jungle: Busca cuántos Dragones y Barones mató SU equipo.
       - Support: Busca el Vision Score.
    5. Detecta Multikills (Double, Triple, Quadra, Penta).
    
    Datos a procesar:
    ${rawData.substring(0, 40000)} 
  `;
  // Limitamos caracteres para no exceder tokens si pegan HTML gigante

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: statsSchema,
        temperature: 0.1 // Baja temperatura para mayor precisión en datos
      }
    });

    const resultText = response.text;
    if (!resultText) return {};

    const parsed = JSON.parse(resultText);
    const mappedStats: Record<string, Partial<PlayerGameStats>> = {};

    if (parsed.stats && Array.isArray(parsed.stats)) {
      parsed.stats.forEach((extracted: any) => {
        // Encontrar el jugador en nuestra DB haciendo matching flexible de nombre
        const player = availablePlayers.find(p => 
          p.name.toLowerCase() === extracted.playerName?.toLowerCase() ||
          extracted.playerName?.toLowerCase().includes(p.name.toLowerCase()) ||
          p.name.toLowerCase().includes(extracted.playerName?.toLowerCase())
        );

        if (player) {
          // Calcular porcentaje de daño si tenemos los datos
          let dmgPercent = 0;
          if (extracted.totalDamage && extracted.teamTotalDamage) {
            dmgPercent = Math.round((extracted.totalDamage / extracted.teamTotalDamage) * 100);
          }

          mappedStats[player.id] = {
            kills: extracted.kills || 0,
            deaths: extracted.deaths || 0,
            assists: extracted.assists || 0,
            cs: extracted.cs || 0,
            isMvp: extracted.isMvp || false,
            firstBlood: extracted.firstBlood || false,
            doubleKills: extracted.doubleKills || 0,
            tripleKills: extracted.tripleKills || 0,
            quadraKills: extracted.quadraKills || 0,
            pentaKills: extracted.pentaKills || 0,
            teamDamagePercentage: dmgPercent,
            turretDamage: extracted.turretDamage || 0,
            minionsPerMinute: extracted.minionsPerMinute || 0,
            damagePerMinute: extracted.damagePerMinute || 0, // Ahora extraído directamente por Gemini
            visionScore: extracted.visionScore || 0,
            dragonsKilled: extracted.dragonsKilled || 0,
            baronsKilled: extracted.baronsKilled || 0,
            firstDragon: extracted.firstDragon || false
          };
        }
      });
    }

    return mappedStats;

  } catch (error) {
    console.error("Error parsing stats with Gemini:", error);
    throw error;
  }
};
