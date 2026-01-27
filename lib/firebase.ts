
import { initializeApp } from "firebase/app";
import * as Auth from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Add global type augmentation for ImportMeta to fix TypeScript errors
// when vite/client types are not explicitly included in tsconfig.
declare global {
  interface ImportMeta {
    env: any;
  }
}

// --- CONFIGURACIÓN DE FIREBASE ---

let firebaseConfig;

// Lógica de separación de entornos (Build-Time)
// Al usar import.meta.env.PROD, el empaquetador (Vite) eliminará el código del 'else'
// cuando construya la versión para producción en Vercel.
// Las claves de desarrollo NO aparecerán en el código final de la web pública.

// Fix: Check if import.meta.env exists to prevent crashes in environments without Vite injection (like AI Studio preview)
const isProd = typeof import.meta.env !== 'undefined' && import.meta.env.PROD;

if (isProd) {
  // --- PRODUCCIÓN (VERCEL) ---
  // Estas variables DEBEN estar configuradas en Vercel > Settings > Environment Variables
  firebaseConfig = {
    apiKey: import.meta.env.FIREBASE_API_KEY,
    authDomain: import.meta.env.FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.FIREBASE_APP_ID,
  };
} else {
  // --- DESARROLLO (LOCAL / AI STUDIO) ---
  // Estas claves solo existen mientras trabajas en el editor.
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
