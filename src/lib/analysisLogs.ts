/**
 * Single entry point for analysis logs: Supabase (if configured) > API (if VITE_API_URL) > localStorage.
 */

import { isSupabaseConfigured } from './supabase';
import * as supabaseLogs from './supabaseAnalysisLogs';
import * as api from './api';
import * as local from './localStorage';

export type { AnalysisLogEntry } from './localStorage';
export { LOCAL_USER } from './localStorage';

const useSupabase = (): boolean => isSupabaseConfigured();
const useApi = (): boolean => Boolean(import.meta.env.VITE_API_URL);

export async function getAnalysisLogs(savedOnly = false, userId?: string): Promise<local.AnalysisLogEntry[]> {
  if (useSupabase()) return supabaseLogs.getAnalysisLogs(savedOnly, userId);
  if (useApi()) return api.getAnalysisLogs(savedOnly, userId);
  const logs = local.getAnalysisLogs();
  return Promise.resolve(savedOnly ? logs.filter((l) => l.is_saved) : logs);
}

export async function getAnalysisLog(id: string, userId?: string): Promise<local.AnalysisLogEntry | null> {
  if (useSupabase()) return supabaseLogs.getAnalysisLog(id, userId);
  if (useApi()) return api.getAnalysisLog(id, userId);
  return Promise.resolve(local.getAnalysisLog(id));
}

export async function saveAnalysisLog(
  entry: Omit<local.AnalysisLogEntry, 'id' | 'created_at' | 'user_id'>,
  userId?: string
): Promise<string> {
  if (useSupabase()) return supabaseLogs.saveAnalysisLog(entry, userId);
  if (useApi()) return api.saveAnalysisLog(entry, userId);
  return Promise.resolve(local.saveAnalysisLog(entry));
}

export async function updateAnalysisLog(
  id: string,
  updates: Partial<Pick<local.AnalysisLogEntry, 'analysis_details' | 'charts_generated' | 'is_saved'>>,
  userId?: string
): Promise<void> {
  if (useSupabase()) return supabaseLogs.updateAnalysisLog(id, updates, userId);
  if (useApi()) return api.updateAnalysisLog(id, updates, userId);
  local.updateAnalysisLog(id, updates);
}

export async function deleteAnalysisLog(id: string, userId?: string): Promise<void> {
  if (useSupabase()) return supabaseLogs.deleteAnalysisLog(id, userId);
  if (useApi()) return api.deleteAnalysisLog(id, userId);
  local.deleteAnalysisLog(id);
}

export async function getRecentQuestions(limit: number = 5, userId?: string): Promise<string[]> {
  if (useSupabase()) return supabaseLogs.getRecentQuestions(limit, userId);
  if (useApi()) return api.getRecentQuestions(limit, userId);
  return Promise.resolve(local.getRecentQuestions(limit));
}

export function isApiConfigured(): boolean {
  return api.isApiConfigured();
}
