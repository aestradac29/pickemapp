
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { Player, PlayerGameStats } from '../types';
import { getGeminiApiKey } from '../lib/geminiConfig';
import { getGroqApiKey } from '../lib/groqConfig';

// Definición del esquema de respuesta esperado
const statsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    stats: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          playerName:       { type: Type.STRING, description: "Nombre del jugador encontrado en el texto (ej: 'Yike', 'Caps')" },
          kills:            { type: Type.NUMBER },
          deaths:           { type: Type.NUMBER },
          assists:          { type: Type.NUMBER },
          cs:               { type: Type.NUMBER, description: "Creep Score / Súbditos" },
          isMvp:            { type: Type.BOOLEAN },
          doubleKills:      { type: Type.NUMBER },
          tripleKills:      { type: Type.NUMBER },
          quadraKills:      { type: Type.NUMBER },
          pentaKills:       { type: Type.NUMBER },
          totalDamage:      { type: Type.NUMBER, description: "Daño total a campeones" },
          damagePerMinute:  { type: Type.NUMBER, description: "Daño por minuto (DPM)" },
          teamTotalDamage:  { type: Type.NUMBER, description: "Daño total del equipo de este jugador (para calcular porcentaje)" },
          turretDamage:     { type: Type.NUMBER, description: "Daño infligido a torretas (Damage dealt to turrets)" },
          minionsPerMinute: { type: Type.NUMBER, description: "Súbditos por minuto (CSM o Minions/Min)" },
          gold:             { type: Type.NUMBER },
          visionScore:      { type: Type.NUMBER },
          dragonsKilled:    { type: Type.NUMBER, description: "Total dragones matados por SU equipo" },
          baronsKilled:     { type: Type.NUMBER, description: "Total barones matados por SU equipo" },
          firstBlood:       { type: Type.BOOLEAN },
          firstDragon:      { type: Type.BOOLEAN, description: "Si su equipo hizo el primer dragón" }
        },
        required: ["playerName", "kills", "deaths", "assists"]
      }
    }
  }
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (error: unknown): boolean => {
  const msg = String((error as any)?.message || error);
  return msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand");
};

/** Mapea el array de stats extraídas a un Record<playerId, PlayerGameStats> */
function mapExtractedStats(
  extractedList: any[],
  availablePlayers: Player[]
): Record<string, Partial<PlayerGameStats>> {
  const mappedStats: Record<string, Partial<PlayerGameStats>> = {};

  extractedList.forEach((extracted: any) => {
    const extractedName = extracted.playerName?.toLowerCase() || "";
    const player = availablePlayers.find(p => {
      const dbName = p.name.toLowerCase();
      return (
        dbName === extractedName ||
        extractedName.includes(dbName) ||
        (extractedName.length > 0 && dbName.includes(extractedName))
      );
    });

    if (player) {
      let dmgPercent = 0;
      if (extracted.totalDamage && extracted.teamTotalDamage) {
        dmgPercent = Math.round((extracted.totalDamage / extracted.teamTotalDamage) * 100);
      }

      mappedStats[player.id] = {
        kills:                extracted.kills             || 0,
        deaths:               extracted.deaths            || 0,
        assists:              extracted.assists           || 0,
        cs:                   extracted.cs                || 0,
        isMvp:                extracted.isMvp             || false,
        firstBlood:           extracted.firstBlood        || false,
        doubleKills:          extracted.doubleKills        || 0,
        tripleKills:          extracted.tripleKills        || 0,
        quadraKills:          extracted.quadraKills        || 0,
        pentaKills:           extracted.pentaKills         || 0,
        teamDamagePercentage: dmgPercent,
        turretDamage:         extracted.turretDamage       || 0,
        minionsPerMinute:     extracted.minionsPerMinute   || 0,
        damagePerMinute:      extracted.damagePerMinute    || 0,
        visionScore:          extracted.visionScore        || 0,
        dragonsKilled:        extracted.dragonsKilled       || 0,
        baronsKilled:         extracted.baronsKilled        || 0,
        firstDragon:          extracted.firstDragon         || false,
      };
    }
  });

  return mappedStats;
}

// ─── Motor Gemini ────────────────────────────────────────────────────────────

async function extractWithGemini(
  prompt: string,
  apiKey: string
): Promise<any[]> {
  const ai = new GoogleGenAI({ apiKey });

  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 3000; // 3s → 6s → 12s

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: statsSchema,
          temperature: 0.1,
        },
      });

      const resultText = response.text;
      if (!resultText) return [];

      const parsed = JSON.parse(resultText);
      return parsed.stats ?? [];

    } catch (error) {
      console.error(`Gemini intento ${attempt}/${MAX_RETRIES}:`, error);

      if (isRetryableError(error) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`Gemini saturado (503). Reintentando en ${delay / 1000}s...`);
        await sleep(delay);
        continue;
      }

      // Lanzar para que el caller decida si hace fallback
      throw error;
    }
  }

  throw new Error("Gemini no respondió tras varios intentos.");
}

// ─── Motor Groq (fallback) ───────────────────────────────────────────────────

async function extractWithGroq(
  prompt: string,
  apiKey: string
): Promise<any[]> {
  console.info("Usando Groq (Llama 3.3 70B) como fallback...");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Eres un asistente experto en League of Legends. Responde ÚNICAMENTE con JSON válido, sin texto adicional ni bloques markdown."
        },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  if (!text) return [];

  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  return parsed.stats ?? [];
}

// ─── Función principal exportada ─────────────────────────────────────────────

export const extractStatsFromData = async (
  rawData: string,
  availablePlayers: Player[]
): Promise<Record<string, Partial<PlayerGameStats>>> => {

  const geminiKey = getGeminiApiKey();
  const groqKey   = getGroqApiKey();

  if (!geminiKey && !groqKey) {
    throw new Error("No hay ninguna API Key configurada (Gemini ni Groq).");
  }

  const playerNamesList = availablePlayers.map(p => p.name).join(", ");

  const prompt = `
    Analiza el siguiente texto o HTML de un partido de League of Legends.
    Extrae las estadísticas de los jugadores.

    IMPORTANTE:
    1. Intenta coincidir los nombres encontrados con esta lista de jugadores conocidos: [${playerNamesList}].
    2. Si encuentras datos de daño (Total Damage), extrae el daño del jugador Y el daño total de su equipo.
    3. Busca explícitamente el valor 'DPM' o 'Damage Per Minute' y asígnalo al campo damagePerMinute.
    4. Para roles específicos:
       - Top: daño a torretas (turretDamage) y CSM (minionsPerMinute).
       - Mid: daño a torretas (turretDamage).
       - Jungle: dragones y barones matados por SU equipo.
       - Support: Vision Score.
    5. Detecta Multikills (Double, Triple, Quadra, Penta).

    Devuelve un JSON con esta estructura exacta:
    { "stats": [ { "playerName": "...", "kills": 0, "deaths": 0, "assists": 0, ... } ] }

    Datos a procesar:
    ${rawData.substring(0, 40000)}
  `;

  // 1. Intentar con Gemini
  if (geminiKey) {
    try {
      const extracted = await extractWithGemini(prompt, geminiKey);
      console.info(`✅ Gemini OK — ${extracted.length} jugadores extraídos`);
      return mapExtractedStats(extracted, availablePlayers);
    } catch (geminiError) {
      console.warn("Gemini falló definitivamente, cambiando a Groq...", geminiError);

      if (!groqKey) {
        throw new Error(
          "Gemini no está disponible y no hay API Key de Groq configurada (GROQ_API_KEY)."
        );
      }
    }
  }

  // 2. Fallback a Groq
  const extracted = await extractWithGroq(prompt, groqKey!);
  console.info(`✅ Groq OK — ${extracted.length} jugadores extraídos`);
  return mapExtractedStats(extracted, availablePlayers);
};
