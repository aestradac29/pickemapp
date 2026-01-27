
import { initializeApp } from "firebase/app";
import * as Auth from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- CONFIGURACIÓN DE FIREBASE ---
// 1. Ve a console.firebase.google.com
// 2. Crea un proyecto
// 3. Añade una App Web
// 4. Copia las credenciales aquí:

const firebaseConfig = {
  apiKey: "AIzaSyAVFP9bRb8GZ-PzLI1BqCaPVfiS1P2l38c",
  authDomain: "pickem-des.firebaseapp.com",
  projectId: "pickem-des",
  storageBucket: "pickem-des.firebasestorage.app",
  messagingSenderId: "515907119194",
  appId: "1:515907119194:web:ef5f55d5ee2900b7fd9063",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = Auth.getAuth(app);
export const db = getFirestore(app);
