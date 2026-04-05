
import { initializeApp, getApps } from "firebase/app";
import * as Auth from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

// ──────────────────────────────────────────────────────────────────────────────
// Configuración Firebase — lectura síncrona, sin fetch, sin Proxy, sin race.
//
// Prioridad de fuentes (primera que tenga valor gana):
//   1. window.__APP_CONFIG__  → inyectado por el servidor en el HTML
//                               (funciona en AI Studio, Vercel y local)
//   2. import.meta.env        → Vite en build de producción o dev con .env.local
// ──────────────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    __APP_CONFIG__?: {
      firebase: {
        apiKey: string;
        authDomain: string;
        projectId: string;
        storageBucket: string;
        messagingSenderId: string;
        appId: string;
        vapidKey?: string;
      };
      geminiApiKey: string;
    };
  }
}

const serverConfig = typeof window !== "undefined" ? window.__APP_CONFIG__?.firebase : undefined;
const viteConfig = {
  apiKey:            (import.meta as any).env?.VITE_FIREBASE_API_KEY            || "",
  authDomain:        (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN        || "",
  projectId:         (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID         || "",
  storageBucket:     (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET     || "",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId:             (import.meta as any).env?.VITE_FIREBASE_APP_ID             || "",
};

const firebaseConfig = {
  apiKey:            serverConfig?.apiKey            || viteConfig.apiKey,
  authDomain:        serverConfig?.authDomain        || viteConfig.authDomain,
  projectId:         serverConfig?.projectId         || viteConfig.projectId,
  storageBucket:     serverConfig?.storageBucket     || viteConfig.storageBucket,
  messagingSenderId: serverConfig?.messagingSenderId || viteConfig.messagingSenderId,
  appId:             serverConfig?.appId             || viteConfig.appId,
};

if (!firebaseConfig.apiKey) {
  console.error(
    "❌ Firebase: no se encontró configuración.\n" +
    "   → AI Studio: añade las variables en Settings → Environment Variables.\n" +
    "   → Local: crea .env.local con VITE_FIREBASE_*.\n" +
    "   → Vercel: configura las variables en el panel."
  );
} else {
  console.log("🔧 Firebase: proyecto →", firebaseConfig.projectId,
    serverConfig ? "(via window.__APP_CONFIG__)" : "(via import.meta.env)");
}

// Evitar doble inicialización (React StrictMode / HMR)
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}

export const auth = Auth.getAuth();
export const db = getFirestore();

// Firebase Messaging — solo si el navegador lo soporta
export let messaging: any = null;
isSupported().then((ok) => {
  if (ok) messaging = getMessaging();
});
