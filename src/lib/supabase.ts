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
