import { supabase } from '../lib/supabase';

export interface AuthError {
    message: string;
}

// URL de producción de la aplicación
const PRODUCTION_URL = 'https://lol-pick-em-pro-606660166462.us-west1.run.app';

// Helper para determinar a dónde redirigir al usuario tras confirmar email
const getRedirectUrl = () => {
    // Si estamos ejecutando en localhost, permitimos redirección a localhost para facilitar el desarrollo.
    // En cualquier otro caso (o si window no está definido), usamos la URL de producción.
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return window.location.origin;
    }
    return PRODUCTION_URL;
};

export const authService = {
    // Registro
    async signUp(email: string, password: string, username: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                // Especificamos explícitamente la URL de redirección
                emailRedirectTo: getRedirectUrl(),
                data: {
                    username: username,
                    avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`
                }
            }
        });

        if (error) throw error;
        
        // Crear perfil en la tabla 'profiles'
        if (data.user) {
            try {
                const { error: profileError } = await supabase.from('profiles').insert([
                    { 
                        id: data.user.id,
                        username: username,
                        email: email, 
                        avatar_url: data.user.user_metadata.avatar_url,
                        total_score: 0
                    }
                ]);
                
                if (profileError) {
                    console.warn("No se pudo crear el perfil automáticamente (posiblemente falta confirmar email o RLS):", profileError);
                }
            } catch (e) {
                console.warn("Error creando perfil:", e);
            }
        }

        return data;
    },

    // Iniciar Sesión (Soporta Email o Usuario)
    async signIn(identifier: string, password: string) {
        let emailToLogin = identifier;

        // Si NO tiene @, asumimos que es un nombre de usuario
        if (!identifier.includes('@')) {
            // Buscamos el email asociado al username en la tabla profiles
            const { data, error } = await supabase
                .from('profiles')
                .select('email')
                .ilike('username', identifier)
                .single();

            if (error || !data) {
                throw new Error('Usuario no encontrado. Si te acabas de registrar, intenta entrar con tu CORREO directamente.');
            }
            
            emailToLogin = data.email;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailToLogin,
            password
        });
        
        if (error) {
            if (error.message.includes("Email not confirmed")) {
                throw new Error("Tu correo no ha sido confirmado. Por favor revisa tu bandeja de entrada (y spam).");
            }
            if (error.message.includes("Invalid login credentials")) {
                throw new Error("Credenciales incorrectas.");
            }
            throw error;
        }
        return data;
    },

    // Enviar correo de restablecimiento de contraseña
    async resetPasswordForEmail(email: string) {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            // Usamos la URL correcta para que el link del correo funcione en producción
            redirectTo: getRedirectUrl(),
        });
        
        if (error) throw error;
        return data;
    },

    // Actualizar la contraseña (se usa después de que el usuario entra con el link de recuperación o desde perfil)
    async updateUserPassword(newPassword: string) {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;
        return data;
    },

    // Cerrar Sesión
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    // Obtener Usuario Actual
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Intentar obtener datos extra del perfil
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        return {
            ...user,
            profile: profile || user.user_metadata
        };
    }
};