
import { initializeApp } from "firebase/app";
import * as Auth from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- CONFIGURACIÓN DE FIREBASE ---
// 1. Ve a console.firebase.google.com
// 2. Crea un proyecto
// 3. Añade una App Web
// 4. Copia las credenciales aquí:

const firebaseConfig = {
  apiKey: "AIzaSyBQYpUJcE7zi7RAjNTF4qj4Jflq4vpD-rM",
  authDomain: "pickem-pro-ab471.firebaseapp.com",
  projectId: "pickem-pro-ab471",
  storageBucket: "pickem-pro-ab471.firebasestorage.app",
  messagingSenderId: "39093532180",
  appId: "1:39093532180:web:5786502cf51322fe915901",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = Auth.getAuth(app);
export const db = getFirestore(app);
