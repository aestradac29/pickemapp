// ──────────────────────────────────────────────────────────────────────────────
// Groq API Key — lectura desde window.__APP_CONFIG__ o import.meta.env
// ──────────────────────────────────────────────────────────────────────────────

export function getGroqApiKey(): string {
  // 1. Inyectada por el servidor en el HTML (AI Studio, Vercel, local vía server.ts)
  const fromServer =
    typeof window !== "undefined"
      ? (window as any).__APP_CONFIG__?.groqApiKey
      : undefined;
  if (fromServer) return fromServer;

  // 2. Vite build / dev server con .env.local
  const fromVite =
    (import.meta as any).env?.VITE_GROQ_API_KEY ||
    (import.meta as any).env?.GROQ_API_KEY ||
    "";
  return fromVite;
}
