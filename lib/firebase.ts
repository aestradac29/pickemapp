
import { initializeApp } from "firebase/app";
import * as Auth from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

// ──────────────────────────────────────────────────────────────────────────────
// Configuración Firebase
//
// DESARROLLO (Google AI Studio / local):
//   Las variables VITE_FIREBASE_* deben estar en un archivo .env.local
//   (que está en .gitignore y nunca se sube a Git).
//
// PRODUCCIÓN (Vercel):
//   Las mismas variables se configuran en el panel de Vercel → Settings →
//   Environment Variables.
//
// El archivo firebase-applet-config.json ya NO se usa; está en .gitignore.
// ──────────────────────────────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Comprobación en tiempo de arranque para detectar variables sin configurar
if (!firebaseConfig.apiKey) {
  console.error(
    "❌ Firebase: VITE_FIREBASE_API_KEY no está definida.\n" +
    "   → En local: crea un archivo .env.local con tus credenciales.\n" +
    "   → En Vercel: configura las variables de entorno en el panel."
  );
}

if (import.meta.env.DEV) {
  console.log("🔧 Firebase: usando proyecto →", firebaseConfig.projectId);
} else {
  console.log("🔥 Firebase: modo producción →", firebaseConfig.projectId);
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = Auth.getAuth(app);

// Soporte para Firestore con databaseId personalizado (opcional)
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = getFirestore(app, dbId);

// Firebase Messaging — sólo si el navegador lo soporta
export let messaging: any = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});