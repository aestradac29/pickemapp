
import { supabase } from '../lib/supabase';

// Helper para notificar cambios de auth
type AuthListener = (user: any | null) => void;

export const authService = {
    // Suscribirse a cambios de sesión
    onAuthStateChange(listener: AuthListener) {
        // Verificar sesión inicial
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
                const user = await this.formatUser(session.user);
                listener(user);
            } else {
                listener(null);
            }
        });

        // Escuchar cambios
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const user = await this.formatUser(session.user);
                listener(user);
            } else {
                listener(null);
            }
        });

        return () => subscription.unsubscribe();
    },

    // Helper interno para formatear el usuario y unirlo con el perfil
    async formatUser(authUser: any) {
        const profile = await this.getUserProfile(authUser.id);
        return {
            id: authUser.id,
            email: authUser.email,
            role: profile?.role || 'user',
            profile: {
                username: profile?.username || authUser.user_metadata?.username || 'Invocador',
                avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url
            }
        };
    },

    // Registro
    async signUp(email: string, password: string, username: string) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username,
                    avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`
                }
            }
        });

        if (error) throw error;

        // Crear entrada en tabla profiles (aunque el trigger de SQL debería hacerlo, lo aseguramos o actualizamos)
        if (data.user) {
             // Verificamos si el trigger ya lo creó, si no, upsert
             const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: data.user.id,
                    username: username,
                    email: email,
                    avatar_url: `https://ui-avatars.com/api/?name=${username}&background=random`,
                    role: 'user'
                }, { onConflict: 'id' });
                
             if (profileError) console.error("Error creating profile:", profileError);
        }

        return data;
    },

    // Login
    async signIn(identifier: string, password: string) {
        let email = identifier;

        // Si no es un email, buscamos el email asociado al username
        if (!identifier.includes('@')) {
            const { data, error } = await supabase
                .from('profiles')
                .select('email')
                .eq('username', identifier)
                .single();
            
            if (error || !data) throw new Error("Usuario no encontrado.");
            email = data.email;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return data;
    },

    async signOut() {
        await supabase.auth.signOut();
    },

    async getCurrentUser() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            return await this.formatUser(session.user);
        }
        return null;
    },

    async getUserProfile(uid: string) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', uid)
            .single();
        
        if (error) return null;
        return data;
    },

    async resetPasswordForEmail(email: string) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin, // Redirigir a la app tras el click
        });
        if (error) throw error;
    },

    async updateUserPassword(newPassword: string) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
    }
};
