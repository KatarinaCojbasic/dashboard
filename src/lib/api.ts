/**
 * API client for analysis logs backend (PostgreSQL via Express).
 * Used when VITE_API_URL is set.
 */

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

const LOCAL_USER_ID = 'local';

function getBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL;
  if (typeof url === 'string' && url) return url.replace(/\/$/, '');
  return '';
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const text = await res.text();
  const parseJson = (): unknown => {
    if (!text || text.trim() === '') return undefined;
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('[API] Non-JSON response:', { path, status: res.status, statusText: res.statusText, bodyPreview: text.slice(0, 200) });
      throw new Error(`Server returned invalid JSON (${res.status} ${res.statusText}). Check console for details.`);
    }
  };
  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    try {
      const err = parseJson() as { error?: string } | undefined;
      if (err?.error) message = err.error;
    } catch {
      // parseJson already logged; use status + body preview
      message = `${res.status} ${res.statusText}` + (text ? `: ${text.slice(0, 100)}` : '');
    }
    console.error('[API] Error response:', { path, status: res.status, statusText: res.statusText, message, body: text.slice(0, 300) });
    throw new Error(message);
  }
  if (res.status === 204 || !text || text.trim() === '') return undefined as T;
  return parseJson() as T;
}

export interface AuthUser {
  id: string;
  email: string;
}

function assertAuthUser(data: unknown): AuthUser {
  if (data && typeof data === 'object' && 'id' in data && 'email' in data) {
    const { id, email } = data as { id: unknown; email: unknown };
    if (email && typeof email === 'string' && (typeof id === 'string' || typeof id === 'number')) {
      return { id: String(id), email };
    }
  }
  console.error('[API] Unexpected auth response shape:', data);
  throw new Error('Invalid login response: server did not return user id and email');
}

export async function register(email: string, password: string, registrationKey: string): Promise<AuthUser> {
  const data = await fetchApi<unknown>('/api/register', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password, registration_key: registrationKey }),
  });
  return assertAuthUser(data);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await fetchApi<unknown>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password }),
  });
  return assertAuthUser(data);
}

function userIdParam(userId: string | undefined): string {
  return userId ?? LOCAL_USER_ID;
}

export async function getAnalysisLogs(savedOnly = false, userId?: string): Promise<AnalysisLogEntry[]> {
  const q = new URLSearchParams({ user_id: userIdParam(userId) });
  if (savedOnly) q.set('saved', 'true');
  return fetchApi<AnalysisLogEntry[]>(`/api/analysis-logs?${q}`);
}

export async function getAnalysisLog(id: string, userId?: string): Promise<AnalysisLogEntry | null> {
  try {
    const q = new URLSearchParams({ user_id: userIdParam(userId) });
    return await fetchApi<AnalysisLogEntry>(`/api/analysis-logs/${id}?${q}`);
  } catch {
    return null;
  }
}

export async function saveAnalysisLog(
  entry: Omit<AnalysisLogEntry, 'id' | 'created_at' | 'user_id'>,
  userId?: string
): Promise<string> {
  const row = await fetchApi<AnalysisLogEntry>('/api/analysis-logs', {
    method: 'POST',
    body: JSON.stringify({ ...entry, user_id: userIdParam(userId) }),
  });
  return row.id;
}

export async function updateAnalysisLog(
  id: string,
  updates: Partial<Pick<AnalysisLogEntry, 'analysis_details' | 'charts_generated' | 'is_saved'>>,
  userId?: string
): Promise<void> {
  const q = new URLSearchParams({ user_id: userIdParam(userId) });
  await fetchApi<void>(`/api/analysis-logs/${id}?${q}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteAnalysisLog(id: string, userId?: string): Promise<void> {
  const q = new URLSearchParams({ user_id: userIdParam(userId) });
  await fetchApi<void>(`/api/analysis-logs/${id}?${q}`, { method: 'DELETE' });
}

export async function getRecentQuestions(limit: number = 5, userId?: string): Promise<string[]> {
  const q = new URLSearchParams({ user_id: userIdParam(userId), limit: String(limit) });
  return fetchApi<string[]>(`/api/recent-questions?${q}`);
}

export function isApiConfigured(): boolean {
  return import.meta.env.PROD || Boolean(import.meta.env.VITE_API_URL);
}
