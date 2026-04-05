// ──────────────────────────────────────────────────────────────────────────────
// Gemini API Key — lectura síncrona desde window.__APP_CONFIG__ o import.meta.env
// ──────────────────────────────────────────────────────────────────────────────

export function getGeminiApiKey(): string {
  // 1. Inyectada por el servidor en el HTML (AI Studio, Vercel, local vía server.ts)
  const fromServer = typeof window !== "undefined"
    ? window.__APP_CONFIG__?.geminiApiKey
    : undefined;
  if (fromServer) return fromServer;

  // 2. Vite build / dev server con .env.local
  const fromVite =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.GEMINI_API_KEY ||
    "";
  return fromVite;
}
