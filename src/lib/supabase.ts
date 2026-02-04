import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

if (typeof url === 'string' && url && typeof anonKey === 'string' && anonKey) {
  client = createClient(url, anonKey);
}

export const supabase = client;

export function isSupabaseConfigured(): boolean {
  return client !== null;
}

/** Call from console or once on load to see why Supabase might not be used (no secrets logged). */
export function getSupabaseDiagnostic(): { urlSet: boolean; anonKeySet: boolean; configured: boolean } {
  return {
    urlSet: Boolean(typeof import.meta.env.VITE_SUPABASE_URL === 'string' && import.meta.env.VITE_SUPABASE_URL),
    anonKeySet: Boolean(typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string' && import.meta.env.VITE_SUPABASE_ANON_KEY),
    configured: client !== null,
  };
}
