/**
 * Supabase-backed analysis logs. Used when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.
 * Requires table `analysis_logs` and RLS policies (see SUPABASE_SETUP.md).
 */

import { supabase } from './supabase';
import type { AnalysisLogEntry } from './localStorage';

const TABLE = 'analysis_logs';

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

export async function getAnalysisLogs(savedOnly = false, _userId?: string): Promise<AnalysisLogEntry[]> {
  const client = requireSupabase();
  let q = client.from(TABLE).select('*').order('created_at', { ascending: false });
  if (savedOnly) q = q.eq('is_saved', true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as AnalysisLogEntry[];
}

export async function getAnalysisLog(id: string, _userId?: string): Promise<AnalysisLogEntry | null> {
  const client = requireSupabase();
  const { data, error } = await client.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as AnalysisLogEntry | null;
}

export async function saveAnalysisLog(
  entry: Omit<AnalysisLogEntry, 'id' | 'created_at' | 'user_id'>,
  userId?: string
): Promise<string> {
  const client = requireSupabase();
  const row = {
    user_id: userId ?? (await client.auth.getUser()).data.user?.id ?? null,
    question: entry.question,
    data_summary: entry.data_summary,
    result_summary: entry.result_summary,
    charts_generated: entry.charts_generated,
    analysis_details: entry.analysis_details,
    is_saved: entry.is_saved,
  };
  const { data, error } = await client.from(TABLE).insert(row).select('id').single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export async function updateAnalysisLog(
  id: string,
  updates: Partial<Pick<AnalysisLogEntry, 'analysis_details' | 'charts_generated' | 'is_saved'>>,
  _userId?: string
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from(TABLE).update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAnalysisLog(id: string, _userId?: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getRecentQuestions(limit: number = 5, _userId?: string): Promise<string[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from(TABLE)
    .select('question')
    .order('created_at', { ascending: false })
    .limit(limit * 2);
  if (error) throw new Error(error.message);
  const questions = (data ?? []).map((r: { question: string }) => r.question).filter(Boolean);
  return [...new Set(questions)].slice(0, limit);
}
