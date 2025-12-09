import { supabase } from '../lib/supabase';

export interface AuthError {
    message: string;
}

// URL de producción de la aplicación
const PRODUCTION_URL = 'https://lol-pick-em-pro-606660166462.us-west1.run.app';

const getRedirectUrl = () => {
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
                emailRedirectTo: getRedirectUrl(),
                data: {
                    username: username,
                    avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`
                }
            }
        });

        if (error) throw error;
        
        // Crear perfil inicial
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
                    console.warn("No se pudo crear el perfil automáticamente:", profileError);
                }
            } catch (e) {
                console.warn("Error creando perfil:", e);
            }
        }

        return data;
    },

    async signIn(identifier: string, password: string) {
        let emailToLogin = identifier;

        if (!identifier.includes('@')) {
            const { data, error } = await supabase
                .from('profiles')
                .select('email')
                .ilike('username', identifier)
                .single();

            if (error || !data) {
                throw new Error('Usuario no encontrado.');
            }
            emailToLogin = data.email;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailToLogin,
            password
        });
        
        if (error) throw error;
        return data;
    },

    async resetPasswordForEmail(email: string) {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: getRedirectUrl(),
        });
        if (error) throw error;
        return data;
    },

    async updateUserPassword(newPassword: string) {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    // Helper: Obtener Perfil Real por Email
    // Crucial para corregir desajustes entre Auth.ID y Profile.ID
    async getProfileByEmail(email: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error) return null;
        return data;
    },

    // Obtener Usuario Actual (y asegurar perfil correcto)
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // 1. Intentamos buscar por ID directo (Comportamiento estándar)
        let { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // 2. Fallback: Si no se encuentra por ID, buscamos por Email (Fix para tu caso específico)
        if (!profile && user.email) {
            console.log("Perfil no encontrado por Auth ID, buscando por Email...");
            const { data: profileByEmail } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', user.email)
                .single();
            
            if (profileByEmail) {
                profile = profileByEmail;
            }
        }

        // 3. Fallback Final: Auto-crear perfil si falta
        if (!profile) {
            console.log("Perfil no encontrado, intentando reparar...");
            const username = user.user_metadata?.username || user.email?.split('@')[0] || 'User';
            const newProfile = {
                id: user.id,
                username: username, 
                email: user.email, 
                avatar_url: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${username}&background=random`,
                total_score: 0
            };

            const { error: insertError } = await supabase.from('profiles').insert([newProfile]);
            
            if (!insertError) {
                profile = newProfile;
            } else {
                console.error("Error fatal reparando perfil:", insertError);
            }
        }

        return {
            ...user,
            // Sobreescribimos el ID del usuario Auth con el ID del Perfil Real
            // Esto asegura que el resto de la app use el UUID correcto (e025...)
            id: profile?.id || user.id,
            profile: profile || user.user_metadata
        };
    }
};