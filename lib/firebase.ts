
import { initializeApp } from "firebase/app";
import * as Auth from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";
import devConfig from "../firebase-applet-config.json";

// 1. Detectar Entorno y Claves de Producción
const isBrowser = typeof window !== 'undefined';

// Intentar obtener claves de producción (Vercel o Servidor)
// Nota: En Vite, debemos acceder a import.meta.env de forma estática para que el build las reemplace.
const prodApiKey = isBrowser ? import.meta.env.VITE_FIREBASE_API_KEY : process.env.VITE_FIREBASE_API_KEY;
const prodAuthDomain = isBrowser ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : process.env.VITE_FIREBASE_AUTH_DOMAIN;
const prodProjectId = isBrowser ? import.meta.env.VITE_FIREBASE_PROJECT_ID : process.env.VITE_FIREBASE_PROJECT_ID;
const prodStorageBucket = isBrowser ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : process.env.VITE_FIREBASE_STORAGE_BUCKET;
const prodMessagingSenderId = isBrowser ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : process.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
const prodAppId = isBrowser ? import.meta.env.VITE_FIREBASE_APP_ID : process.env.VITE_FIREBASE_APP_ID;

let firebaseConfig;

if (prodApiKey) {
  // --- PRODUCCIÓN (VERCEL / SERVER PROD) ---
  if (isBrowser) console.log("🔥 Firebase: Usando configuración de Producción (Client)");
  else console.log("🔥 Firebase: Usando configuración de Producción (Server)");
  
  firebaseConfig = {
    apiKey: prodApiKey,
    authDomain: prodAuthDomain,
    projectId: prodProjectId,
    storageBucket: prodStorageBucket,
    messagingSenderId: prodMessagingSenderId,
    appId: prodAppId,
  };
} else {
  // --- DESARROLLO (LOCAL) ---
  if (isBrowser) console.log("🔧 Firebase: Usando configuración de Desarrollo (Pick'em Des)");
  firebaseConfig = devConfig;
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = Auth.getAuth(app);

// Usar el databaseId si está presente en la configuración
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = getFirestore(app, dbId);

// Initialize Messaging only if supported by the browser
export let messaging: any = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});
