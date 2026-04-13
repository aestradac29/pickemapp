
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { Player, PlayerGameStats } from '../types';
import { getGeminiApiKey } from '../lib/geminiConfig';
import { getGroqApiKey } from '../lib/groqConfig';

// ─── Schema Gemini ────────────────────────────────────────────────────────────

const statsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    stats: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          playerName:       { type: Type.STRING },
          kills:            { type: Type.NUMBER },
          deaths:           { type: Type.NUMBER },
          assists:          { type: Type.NUMBER },
          cs:               { type: Type.NUMBER },
          isMvp:            { type: Type.BOOLEAN },
          doubleKills:      { type: Type.NUMBER },
          tripleKills:      { type: Type.NUMBER },
          quadraKills:      { type: Type.NUMBER },
          pentaKills:       { type: Type.NUMBER },
          totalDamage:      { type: Type.NUMBER, description: "Daño total a campeones del jugador" },
          damagePerMinute:  { type: Type.NUMBER, description: "DPM del jugador" },
          teamTotalDamage:  { type: Type.NUMBER, description: "Daño total del equipo de este jugador" },
          turretDamage:     { type: Type.NUMBER, description: "Daño infligido a torretas" },
          minionsPerMinute: { type: Type.NUMBER, description: "Súbditos por minuto (CSM)" },
          gold:             { type: Type.NUMBER },
          visionScore:      { type: Type.NUMBER },
          dragonsKilled:    { type: Type.NUMBER, description: "Dragones del equipo del jugador" },
          baronsKilled:     { type: Type.NUMBER, description: "Barones del equipo del jugador" },
          firstBlood:       { type: Type.BOOLEAN },
          firstDragon:      { type: Type.BOOLEAN },
        },
        required: ["playerName", "kills", "deaths", "assists"]
      }
    }
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isRetryableError = (error: unknown): boolean => {
  const msg = String((error as any)?.message || error);
  return msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand");
};

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

// ─── Motor Gemini (sin reintentos) ───────────────────────────────────────────

async function extractWithGemini(prompt: string, apiKey: string): Promise<any[]> {
  const ai = new GoogleGenAI({ apiKey });

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
}

// ─── Motor Groq ───────────────────────────────────────────────────────────────

async function extractWithGroq(prompt: string, apiKey: string): Promise<any[]> {
  const systemPrompt = `Eres un asistente experto en League of Legends que extrae estadísticas de partidos.
Responde ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin bloques markdown, sin explicaciones.
El JSON debe tener exactamente esta estructura:
{
  "stats": [
    {
      "playerName": "string",
      "kills": number,
      "deaths": number,
      "assists": number,
      "cs": number,
      "isMvp": boolean,
      "doubleKills": number,
      "tripleKills": number,
      "quadraKills": number,
      "pentaKills": number,
      "totalDamage": number,
      "teamTotalDamage": number,
      "damagePerMinute": number,
      "turretDamage": number,
      "minionsPerMinute": number,
      "visionScore": number,
      "dragonsKilled": number,
      "baronsKilled": number,
      "firstBlood": boolean,
      "firstDragon": boolean
    }
  ]
}
CRÍTICO: Para calcular teamDamagePercentage necesito que extraigas SIEMPRE totalDamage (daño del jugador) Y teamTotalDamage (suma del daño de todos los jugadores de su equipo). Esto es especialmente importante para Top y Mid.`;

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
        { role: "system", content: systemPrompt },
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

// ─── Resultado de la importación ─────────────────────────────────────────────

export type AIImportResult = {
  stats: Record<string, Partial<PlayerGameStats>>;
  usedModel: "gemini" | "groq";
};

// ─── Función principal exportada ─────────────────────────────────────────────

export const extractStatsFromData = async (
  rawData: string,
  availablePlayers: Player[]
): Promise<AIImportResult> => {

  const geminiKey = getGeminiApiKey();
  const groqKey   = getGroqApiKey();

  if (!geminiKey && !groqKey) {
    throw new Error("No hay ninguna API Key configurada (GEMINI_API_KEY ni GROQ_API_KEY).");
  }

  const playerNamesList = availablePlayers.map(p => p.name).join(", ");

  const prompt = `
    Analiza el siguiente texto o HTML de un partido de League of Legends.
    Extrae las estadísticas de los jugadores.

    IMPORTANTE:
    1. Intenta coincidir los nombres encontrados con esta lista de jugadores conocidos: [${playerNamesList}].
    2. Para calcular el % de daño del equipo:
       - Extrae el daño total (totalDamage) del jugador.
       - Extrae el daño total del equipo de ese jugador (teamTotalDamage).
       - Esto aplica a TODOS los roles, incluyendo Top y Mid.
    3. Busca explícitamente el valor 'DPM' o 'Damage Per Minute' → campo damagePerMinute.
    4. Para roles específicos:
       - Top: turretDamage (Damage dealt to turrets) y minionsPerMinute (CSM/Minions per Min).
       - Mid: turretDamage.
       - Jungle: dragonsKilled y baronsKilled del equipo.
       - Support: visionScore y firstDragon.
    5. Detecta Multikills (doubleKills, tripleKills, quadraKills, pentaKills).

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
      return { stats: mapExtractedStats(extracted, availablePlayers), usedModel: "gemini" };
    } catch (geminiError) {
      const isServiceDown = isRetryableError(geminiError);
      console.warn(
        isServiceDown
          ? "Gemini saturado (503), cambiando a Groq..."
          : "Gemini falló, cambiando a Groq...",
        geminiError
      );
      if (!groqKey) {
        throw new Error("Gemini no está disponible y no hay GROQ_API_KEY configurada.");
      }
    }
  }

  // 2. Fallback a Groq
  const extracted = await extractWithGroq(prompt, groqKey!);
  console.info(`✅ Groq OK — ${extracted.length} jugadores extraídos`);
  return { stats: mapExtractedStats(extracted, availablePlayers), usedModel: "groq" };
};
