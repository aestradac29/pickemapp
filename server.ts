import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ──────────────────────────────────────────────────────────────────────────────
// CORS
//
// Orígenes permitidos (todos los entornos):
//   - pickemapp.vercel.app  → producción Vercel
//   - *.run.app             → Google AI Studio (dominio dinámico)
//   - localhost / 127.0.0.1 → desarrollo local
//
// IMPORTANTE: AI Studio arranca con NODE_ENV=production, por eso run.app
// no puede estar solo en la rama "desarrollo" — debe estar siempre.
// ──────────────────────────────────────────────────────────────────────────────
// Función que decide si un origen está permitido.
// Se usa endsWith en lugar de regex para evitar problemas de escape en runtime.
function isOriginAllowed(origin: string): boolean {
  // Producción: dominio fijo de Vercel
  if (origin === "https://pickemapp.vercel.app") return true;
  // Google AI Studio: siempre un subdominio HTTPS de run.app
  if (origin.startsWith("https://") && origin.endsWith(".run.app")) return true;
  // Desarrollo local
  if (origin.startsWith("http://localhost")) return true;
  if (origin.startsWith("http://127.0.0.1")) return true;
  return false;
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (SSR, herramientas CLI, etc.)
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origen no permitido → ${origin}`));
    }
  },
  credentials: true,
};

// ──────────────────────────────────────────────────────────────────────────────
// Servidor
// ──────────────────────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors(corsOptions));
  app.use(express.json());

  // ── Rutas de API ──────────────────────────────────────────────────────────

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", env: IS_PRODUCTION ? "production" : "development" });
  });

  // ── Configuración pública para el cliente ─────────────────────────────────
  // En AI Studio las variables de entorno llegan al servidor (process.env) pero
  // no a import.meta.env del cliente. Este endpoint las expone de forma segura:
  // solo se devuelven claves públicas (Firebase client SDK + Gemini), nunca
  // secretos de servidor como FIREBASE_SERVICE_ACCOUNT_JSON o INTERNAL_API_TOKEN.
  app.get("/api/config", (_req, res) => {
    res.json({
      firebase: {
        apiKey:            process.env.VITE_FIREBASE_API_KEY            || process.env.FIREBASE_API_KEY            || "",
        authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN        || process.env.FIREBASE_AUTH_DOMAIN        || "",
        projectId:         process.env.VITE_FIREBASE_PROJECT_ID         || process.env.FIREBASE_PROJECT_ID         || "",
        storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET     || process.env.FIREBASE_STORAGE_BUCKET     || "",
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || "",
        appId:             process.env.VITE_FIREBASE_APP_ID             || process.env.FIREBASE_APP_ID             || "",
      },
      geminiApiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "",
      claudeApiKey: process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "",
      groqApiKey:   process.env.VITE_GROQ_API_KEY   || process.env.GROQ_API_KEY   || "",
    });
  });

  // ── Frontend ──────────────────────────────────────────────────────────────

  // ── Helper: genera el script de configuración para inyectar en el HTML ──────
  // Lee las variables de process.env (donde AI Studio y Vercel las inyectan)
  // y las convierte en window.__APP_CONFIG__ para que el cliente las lea
  // sincrónicamente, sin ningún fetch ni race condition.
  function buildConfigScript(): string {
    const config = {
      firebase: {
        apiKey:            process.env.VITE_FIREBASE_API_KEY            || process.env.FIREBASE_API_KEY            || "",
        authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN        || process.env.FIREBASE_AUTH_DOMAIN        || "",
        projectId:         process.env.VITE_FIREBASE_PROJECT_ID         || process.env.FIREBASE_PROJECT_ID         || "",
        storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET     || process.env.FIREBASE_STORAGE_BUCKET     || "",
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || "",
        appId:             process.env.VITE_FIREBASE_APP_ID             || process.env.FIREBASE_APP_ID             || "",
      },
      geminiApiKey: process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "",
      claudeApiKey: process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || "",
      groqApiKey:   process.env.VITE_GROQ_API_KEY   || process.env.GROQ_API_KEY   || "",
    };
    return `<script>window.__APP_CONFIG__ = ${JSON.stringify(config)};</script>`;
  }

  // ── Helper: sirve index.html con la config inyectada ─────────────────────
  function serveIndexWithConfig(htmlPath: string, res: express.Response) {
    try {
      let html = fs.readFileSync(htmlPath, "utf-8");
      html = html.replace("<!-- __APP_CONFIG_PLACEHOLDER__ -->", buildConfigScript());
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch {
      res.status(500).send("Error al cargar la aplicación.");
    }
  }

  if (!IS_PRODUCTION) {
    // Desarrollo: Vite en modo middleware (HMR, etc.)
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    // Interceptar index.html para inyectar la config antes de que Vite lo sirva
    app.get("/", (_req, res, next) => {
      const indexPath = path.resolve(__dirname, "index.html");
      if (fs.existsSync(indexPath)) {
        serveIndexWithConfig(indexPath, res);
      } else {
        next();
      }
    });

    app.use(vite.middlewares);
  } else {
    // Producción: servir el build estático de Vite
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));

    // SPA catch-all: inyectar config en index.html para todas las rutas
    app.get("*", (_req, res) => {
      serveIndexWithConfig(path.join(distPath, "index.html"), res);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `🚀 Servidor en http://localhost:${PORT} (${IS_PRODUCTION ? "producción" : "desarrollo"})`
    );
  });
}

startServer();
