/**
 * Local-only storage for analysis logs. Replaces Supabase for offline/local use.
 */

const STORAGE_KEY = 'analysis_logs';
const LOCAL_USER_ID = 'local';

export interface AnalysisLogEntry {
  id: string;
  user_id: string;
  question: string;
  data_summary: {
    records?: number;
    columns?: number;
    headers?: string[];
    source?: string;
  };
  result_summary: string | null;
  charts_generated: number;
  created_at: string;
  analysis_details: {
    charts?: any[];
    customCharts?: any[];
    insights?: string[];
  };
  is_saved: boolean;
}

export const LOCAL_USER = {
  id: LOCAL_USER_ID,
  email: 'local@localhost',
} as const;

function getStoredLogs(): AnalysisLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStoredLogs(logs: AnalysisLogEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getAnalysisLogs(): AnalysisLogEntry[] {
  const logs = getStoredLogs();
  return logs
    .filter((log) => log.user_id === LOCAL_USER_ID)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getAnalysisLog(id: string): AnalysisLogEntry | null {
  const logs = getStoredLogs();
  return logs.find((log) => log.id === id && log.user_id === LOCAL_USER_ID) ?? null;
}

export function saveAnalysisLog(entry: Omit<AnalysisLogEntry, 'id' | 'created_at' | 'user_id'>): string {
  const logs = getStoredLogs();
  const newEntry: AnalysisLogEntry = {
    ...entry,
    id: generateId(),
    user_id: LOCAL_USER_ID,
    created_at: new Date().toISOString(),
  };
  logs.unshift(newEntry);
  setStoredLogs(logs);
  return newEntry.id;
}

export function updateAnalysisLog(id: string, updates: Partial<Pick<AnalysisLogEntry, 'analysis_details' | 'charts_generated' | 'is_saved'>>): void {
  const logs = getStoredLogs();
  const index = logs.findIndex((log) => log.id === id && log.user_id === LOCAL_USER_ID);
  if (index === -1) return;
  logs[index] = { ...logs[index], ...updates };
  setStoredLogs(logs);
}

export function deleteAnalysisLog(id: string): void {
  const logs = getStoredLogs().filter((log) => !(log.id === id && log.user_id === LOCAL_USER_ID));
  setStoredLogs(logs);
}

export function getRecentQuestions(limit: number = 5): string[] {
  const logs = getAnalysisLogs();
  const questions = logs.map((log) => log.question).filter(Boolean);
  return [...new Set(questions)].slice(0, limit);
}
