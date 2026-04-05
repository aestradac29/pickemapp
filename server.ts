import express from "express";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

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
// Firebase Admin (sólo para push notifications)
// ──────────────────────────────────────────────────────────────────────────────
let isFirebaseAdminInitialized = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    isFirebaseAdminInitialized = true;
    console.log("✅ Firebase Admin inicializado correctamente.");
  } else {
    console.warn(
      "⚠️  FIREBASE_SERVICE_ACCOUNT_JSON no está configurado. Las push notifications no funcionarán."
    );
  }
} catch (error) {
  console.error("❌ Error al inicializar Firebase Admin:", error);
}

// ──────────────────────────────────────────────────────────────────────────────
// Middleware de autenticación para rutas de API internas
// Verifica que la petición lleva el header X-Internal-Token correcto.
// ──────────────────────────────────────────────────────────────────────────────
function requireInternalToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const internalToken = process.env.INTERNAL_API_TOKEN;
  // Si no está configurado el token, sólo se permite en desarrollo
  if (!internalToken) {
    if (!IS_PRODUCTION) return next();
    return res.status(503).json({ error: "API no disponible: INTERNAL_API_TOKEN no configurado." });
  }
  const provided = req.headers["x-internal-token"];
  if (provided !== internalToken) {
    return res.status(401).json({ error: "No autorizado." });
  }
  next();
}

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

  // Envío de push notifications (requiere Firebase Admin + token interno)
  app.post("/api/notifications/send", requireInternalToken, async (req, res) => {
    if (!isFirebaseAdminInitialized) {
      return res
        .status(503)
        .json({ error: "Firebase Admin no inicializado. Configura FIREBASE_SERVICE_ACCOUNT_JSON." });
    }

    const { title, body, tokens, data } = req.body;

    if (!title || !body || !tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res
        .status(400)
        .json({ error: "Faltan campos obligatorios: title, body o el array tokens." });
    }

    try {
      const message = {
        notification: { title, body },
        data: data || {},
        tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(
        `📨 Notificaciones: ${response.successCount} ok, ${response.failureCount} fallidas.`
      );

      res.json({
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });
    } catch (error) {
      console.error("Error enviando push notification:", error);
      res.status(500).json({ error: "Error interno al enviar la notificación." });
    }
  });

  // ── Frontend ──────────────────────────────────────────────────────────────

  if (!IS_PRODUCTION) {
    // Desarrollo: Vite en modo middleware (HMR, etc.)
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Producción: servir el build estático de Vite
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));

    // SPA catch-all: todas las rutas desconocidas devuelven index.html
    // Esto permite que React Router maneje la navegación correctamente.
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `🚀 Servidor en http://localhost:${PORT} (${IS_PRODUCTION ? "producción" : "desarrollo"})`
    );
  });
}

startServer();
