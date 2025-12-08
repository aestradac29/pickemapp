import { GoogleGenAI, Type } from "@google/genai";
import { Team } from '../types';

// Initialize the API client
const apiKey = process.env.API_KEY || ''; // Fallback for dev environment without key
const ai = new GoogleGenAI({ apiKey });

export const analyzeMatchup = async (teamA: Team, teamB: Team): Promise<{ analysis: string, favoredTeam: string }> => {
  if (!apiKey) {
    // Return mock data if no API key is present for demo purposes
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
            analysis: "Nota: No se detectó API Key. Análisis simulado: Ambos equipos tienen estadísticas fuertes, pero Team A tiene mejor control de objetivos neutrales en el juego tardío.",
            favoredTeam: teamA.name
        })
      }, 1500);
    });
  }

  const prompt = `
    Analiza el enfrentamiento hipotético de League of Legends entre ${teamA.name} (${teamA.region}) y ${teamB.name} (${teamB.region}).
    Considera su estilo de juego histórico y la fuerza de su región.
    Dame un análisis breve (máximo 40 palabras) y dime quién es el favorito.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING, description: "Breve análisis técnico del partido." },
            favoredTeam: { type: Type.STRING, description: "Nombre del equipo favorito a ganar." }
          },
          required: ["analysis", "favoredTeam"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Error analyzing match:", error);
    return {
      analysis: "Hubo un error al consultar al Oráculo (Gemini). Intenta de nuevo más tarde.",
      favoredTeam: "Desconocido"
    };
  }
};