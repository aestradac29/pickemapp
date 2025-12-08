import { supabase } from '../lib/supabase';

export interface AuthError {
    message: string;
}

export const authService = {
    // Registro
    async signUp(email: string, password: string, username: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username,
                    avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`
                }
            }
        });

        if (error) throw error;
        
        // Crear perfil en la tabla 'profiles'
        // NOTA: Si 'Confirm Email' está activado en Supabase, data.session será null.
        // En ese caso, la inserción podría fallar si tus políticas RLS requieren estar logueado.
        // Lo intentamos de todas formas, pero no bloqueamos el flujo si falla.
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
                // Mensaje más descriptivo
                throw new Error('Usuario no encontrado. Si te acabas de registrar, intenta entrar con tu CORREO directamente.');
            }
            
            emailToLogin = data.email;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailToLogin,
            password
        });
        
        if (error) {
            // Traducir error común de Supabase
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