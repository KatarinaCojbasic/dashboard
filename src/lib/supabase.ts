import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      analysis_logs: {
        Row: {
          id: string;
          user_id: string;
          question: string;
          data_summary: any;
          result_summary: string | null;
          charts_generated: number;
          created_at: string;
          analysis_details: any;
          is_saved: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          question: string;
          data_summary?: any;
          result_summary?: string | null;
          charts_generated?: number;
          created_at?: string;
          analysis_details?: any;
          is_saved?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          question?: string;
          data_summary?: any;
          result_summary?: string | null;
          charts_generated?: number;
          created_at?: string;
          analysis_details?: any;
          is_saved?: boolean;
        };
      };
    };
  };
};