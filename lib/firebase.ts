
import { initializeApp } from "firebase/app";
import * as Auth from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- CONFIGURACIÓN DE FIREBASE ---
// Usamos variables de entorno (Vite) para separar Desarrollo de Producción.
// 1. En local: Crea un archivo .env.local con las credenciales de la BBDD de desarrollo.
// 2. En Vercel: Añade estas mismas variables en Settings > Environment Variables con los datos de producción.

const env = (import.meta as any).env;

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Validación simple para evitar errores silenciosos si faltan las variables
if (!firebaseConfig.apiKey) {
  console.warn("⚠️ Firebase Config is missing. Make sure you have set VITE_FIREBASE_... environment variables in .env.local or Vercel.");
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = Auth.getAuth(app);
export const db = getFirestore(app);
