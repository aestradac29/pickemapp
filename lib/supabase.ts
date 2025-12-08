import { createClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DE SUPABASE ---
// REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO DE SUPABASE
// Ve a Project Settings -> API para encontrarlos.
const SUPABASE_URL = 'https://esfparvcrmwofqhooeaj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZnBhcnZjcm13b2ZxaG9vZWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDk2MzMsImV4cCI6MjA4MDc4NTYzM30.1N1n533ZxpfatsZYYz8a9buM9XmF6nRpZDMFI7Ya9ws';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper para verificar si la conexión está configurada
export const isSupabaseConfigured = () => {
    // Verificamos que la URL contenga 'supabase.co' y tenga una longitud razonable
    return SUPABASE_URL.includes('supabase.co') && SUPABASE_URL.length > 20;
};