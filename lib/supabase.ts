// MOCK SUPABASE LIB
// Hemos desconectado Supabase para usar LocalStorage como alternativa gratuita y estable.

export const supabase = {
    auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        getUser: async () => ({ data: { user: null } }),
        signOut: async () => {},
    }
} as any;

export const isSupabaseConfigured = () => true; // Always true in local mode