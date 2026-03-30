
import { auth, db } from '../lib/firebase';
import * as Auth from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

// Helper para notificar cambios de auth
type AuthListener = (user: any | null) => void;

export const authService = {
    // Suscribirse a cambios de sesión (Login/Logout) usando el SDK de Firebase
    onAuthStateChange(listener: AuthListener) {
        return Auth.onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Obtener datos adicionales del perfil en Firestore
                const userProfile = await this.getUserProfile(firebaseUser.uid);
                
                    const user = {
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        emailVerified: firebaseUser.emailVerified,
                        role: userProfile?.role || 'user', // Recuperamos el rol de la BBDD
                        profile: {
                            username: userProfile?.username || firebaseUser.displayName || 'Invocador',
                            avatar_url: userProfile?.avatar_url || firebaseUser.photoURL
                        }
                    };
                listener(user);
            } else {
                listener(null);
            }
        });
    },

    // Registro
    async signUp(email: string, password: string, username: string) {
        // 1. Crear usuario en Auth
        const userCredential = await Auth.createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Actualizar perfil básico
        await Auth.updateProfile(user, {
            displayName: username,
            photoURL: `https://ui-avatars.com/api/?name=${username}&background=random`
        });

        // 3. Guardar perfil extendido en Firestore (Base de datos)
        await setDoc(doc(db, "users", user.uid), {
            username: username,
            email: email,
            avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`,
            created_at: new Date().toISOString(),
            role: 'user' // Por defecto usuario normal
        });

        return { user };
    },

    // Login
    async signIn(identifier: string, password: string) {
        let email = identifier;

        // Si el identificador no tiene @, asumimos que es username y buscamos su email
        if (!identifier.includes('@')) {
             try {
                 const usersRef = collection(db, "users");
                 const q = query(usersRef, where("username", "==", identifier));
                 const querySnapshot = await getDocs(q);
                 
                 if (querySnapshot.empty) {
                     throw new Error("Usuario no encontrado.");
                 }
                 
                 // Obtenemos el email del primer documento encontrado
                 const userData = querySnapshot.docs[0].data();
                 if (userData.email) {
                     email = userData.email;
                 }
             } catch (e: any) {
                 throw new Error(e.message || "Error al buscar el usuario.");
             }
        }

        const userCredential = await Auth.signInWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user };
    },

    async signOut() {
        await Auth.signOut(auth);
    },

    // Obtener sesión actual (Promise-based, útil para carga inicial)
    async getCurrentUser() {
        return new Promise((resolve) => {
            const unsubscribe = Auth.onAuthStateChanged(auth, async (firebaseUser) => {
                unsubscribe();
                if (firebaseUser) {
                    const userProfile = await this.getUserProfile(firebaseUser.uid);
                    resolve({
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        emailVerified: firebaseUser.emailVerified,
                        role: userProfile?.role || 'user', // Recuperamos el rol de la BBDD
                        profile: {
                            username: userProfile?.username || firebaseUser.displayName,
                            avatar_url: userProfile?.avatar_url
                        }
                    });
                } else {
                    resolve(null);
                }
            });
        });
    },

    // Obtener datos de Firestore
    async getUserProfile(uid: string) {
        try {
            const docRef = doc(db, "users", uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return null;
        } catch (e) {
            console.error("Error fetching profile", e);
            return null;
        }
    },

    async resetPasswordForEmail(email: string) {
        await Auth.sendPasswordResetEmail(auth, email);
    },

    async updateUserPassword(newPassword: string) {
        if (auth.currentUser) {
            await Auth.updatePassword(auth.currentUser, newPassword);
        }
    }
};
