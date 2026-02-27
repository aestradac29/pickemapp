
import { initializeApp } from "firebase/app";
import * as Auth from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

// Add global type augmentation for ImportMeta to fix TypeScript errors
declare global {
  interface ImportMeta {
    env: any;
  }
}

// --- CONFIGURACIÓN DE FIREBASE ---

let firebaseConfig;

// 1. Detectar si estamos en Producción
const isProd = typeof import.meta.env !== 'undefined' && import.meta.env.PROD;

// 2. Verificar si las variables de entorno de Vercel existen
// NOTA: Vite requiere que las variables empiecen por VITE_
const env = import.meta.env || {};
const hasProdKeys = isProd && !!env.VITE_FIREBASE_API_KEY;

if (hasProdKeys) {
  // --- PRODUCCIÓN (VERCEL) ---
  console.log("🔥 Firebase: Usando configuración de Producción");
  firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
} else {
  // --- DESARROLLO (LOCAL) O FALLBACK ---
  if (isProd) {
      console.warn("⚠️ AVISO: Entorno de Producción detectado pero faltan las variables VITE_FIREBASE_*. Usando configuración de desarrollo (fallback). Asegúrate de REDESPLEGAR en Vercel tras guardar las variables.");
  } else {
      console.log("🔧 Firebase: Usando configuración de Desarrollo");
  }

  // Claves de Desarrollo (Pick'em Des)
  firebaseConfig = {
    apiKey: "AIzaSyAVFP9bRb8GZ-PzLI1BqCaPVfiS1P2l38c",
    authDomain: "pickem-des.firebaseapp.com",
    projectId: "pickem-des",
    storageBucket: "pickem-des.firebasestorage.app",
    messagingSenderId: "515907119194",
    appId: "1:515907119194:web:ef5f55d5ee2900b7fd9063",
  };
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = Auth.getAuth(app);
export const db = getFirestore(app);

// Initialize Messaging only if supported by the browser
export let messaging: any = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});
