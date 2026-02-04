/**
 * DB layer: PostgreSQL (when DATABASE_URL is set) or SQLite.
 * Same API for both; switch by setting DATABASE_URL (e.g. postgresql://...) or leave unset for SQLite.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const usePg = Boolean(
  process.env.DATABASE_URL &&
  (process.env.DATABASE_URL.startsWith('postgresql://') || process.env.DATABASE_URL.startsWith('postgres://'))
);

let pool;
let db;

if (usePg) {
  const pg = (await import('pg')).default;
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
} else {
  const Database = (await import('better-sqlite3')).default;
  const dbPath = join(__dirname, process.env.SQLITE_PATH || 'data.sqlite');
  db = new Database(dbPath);
}

export async function init() {
  if (usePg) {
    const sql = readFileSync(join(__dirname, 'init-db-pg.sql'), 'utf8');
    await pool.query(sql);
  } else {
    const sql = readFileSync(join(__dirname, 'init-db-sqlite.sql'), 'utf8');
    db.exec(sql);
  }
}

function normRow(row, isSqlite) {
  if (!row) return null;
  if (isSqlite) {
    return {
      ...row,
      data_summary: row.data_summary ? JSON.parse(row.data_summary) : {},
      analysis_details: row.analysis_details ? JSON.parse(row.analysis_details) : null,
      is_saved: Boolean(row.is_saved),
    };
  }
  return { ...row, is_saved: Boolean(row.is_saved) };
}

export async function getUserByEmail(email) {
  const emailTrim = email.trim().toLowerCase();
  if (usePg) {
    const { rows } = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [emailTrim]);
    return rows[0] || null;
  }
  return db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(emailTrim);
}

export async function createUser(id, email, passwordHash) {
  const emailTrim = email.trim().toLowerCase();
  if (usePg) {
    await pool.query(
      'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)',
      [id, emailTrim, passwordHash]
    );
  } else {
    db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(id, emailTrim, passwordHash);
  }
}

export async function getAnalysisLogs(userId, savedOnly) {
  if (usePg) {
    let sql = `SELECT id, user_id, question, data_summary, result_summary, charts_generated, created_at, analysis_details, is_saved
      FROM analysis_logs WHERE user_id = $1`;
    const params = [userId];
    if (savedOnly) {
      sql += ' AND is_saved = true';
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(sql, params);
    return rows.map((r) => normRow(r, false));
  }
  let sql = `SELECT id, user_id, question, data_summary, result_summary, charts_generated, created_at, analysis_details, is_saved
    FROM analysis_logs WHERE user_id = ?`;
  const params = [userId];
  if (savedOnly) sql += ' AND is_saved = 1';
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);
  return rows.map((r) => normRow(r, true));
}

export async function getAnalysisLog(id, userId) {
  if (usePg) {
    const { rows } = await pool.query('SELECT * FROM analysis_logs WHERE id = $1 AND user_id = $2', [id, userId]);
    return rows[0] ? normRow(rows[0], false) : null;
  }
  const row = db.prepare('SELECT * FROM analysis_logs WHERE id = ? AND user_id = ?').get(id, userId);
  return row ? normRow(row, true) : null;
}

export async function createAnalysisLog(entry) {
  const { id, user_id, question, data_summary, result_summary, charts_generated, analysis_details, is_saved } = entry;
  if (usePg) {
    await pool.query(
      `INSERT INTO analysis_logs (id, user_id, question, data_summary, result_summary, charts_generated, analysis_details, is_saved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        user_id,
        question,
        JSON.stringify(data_summary || {}),
        result_summary ?? null,
        charts_generated ?? 0,
        JSON.stringify(analysis_details || {}),
        is_saved ?? false,
      ]
    );
    const { rows } = await pool.query('SELECT * FROM analysis_logs WHERE id = $1', [id]);
    return normRow(rows[0], false);
  }
  db.prepare(
    `INSERT INTO analysis_logs (id, user_id, question, data_summary, result_summary, charts_generated, analysis_details, is_saved)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    user_id,
    question,
    JSON.stringify(data_summary || {}),
    result_summary ?? null,
    charts_generated ?? 0,
    JSON.stringify(analysis_details || {}),
    is_saved ? 1 : 0
  );
  const row = db.prepare('SELECT * FROM analysis_logs WHERE id = ?').get(id);
  return normRow(row, true);
}

export async function updateAnalysisLog(id, userId, updates) {
  const { analysis_details, charts_generated, is_saved } = updates;
  if (usePg) {
    const setParts = [];
    const values = [];
    let i = 1;
    if (analysis_details !== undefined) {
      setParts.push(`analysis_details = $${i++}`);
      values.push(JSON.stringify(analysis_details));
    }
    if (charts_generated !== undefined) {
      setParts.push(`charts_generated = $${i++}`);
      values.push(charts_generated);
    }
    if (is_saved !== undefined) {
      setParts.push(`is_saved = $${i++}`);
      values.push(is_saved);
    }
    if (setParts.length === 0) return 0;
    values.push(id, userId);
    const { rowCount } = await pool.query(
      `UPDATE analysis_logs SET ${setParts.join(', ')} WHERE id = $${i++} AND user_id = $${i}`,
      values
    );
    return rowCount ?? 0;
  }
  const updatesList = [];
  const values = [];
  if (analysis_details !== undefined) {
    updatesList.push('analysis_details = ?');
    values.push(JSON.stringify(analysis_details));
  }
  if (charts_generated !== undefined) {
    updatesList.push('charts_generated = ?');
    values.push(charts_generated);
  }
  if (is_saved !== undefined) {
    updatesList.push('is_saved = ?');
    values.push(is_saved ? 1 : 0);
  }
  if (updatesList.length === 0) return 0;
  values.push(id, userId);
  const info = db.prepare(`UPDATE analysis_logs SET ${updatesList.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
  return info.changes;
}

export async function deleteAnalysisLog(id, userId) {
  if (usePg) {
    const { rowCount } = await pool.query('DELETE FROM analysis_logs WHERE id = $1 AND user_id = $2', [id, userId]);
    return rowCount ?? 0;
  }
  const info = db.prepare('DELETE FROM analysis_logs WHERE id = ? AND user_id = ?').run(id, userId);
  return info.changes;
}

export async function getRecentQuestions(userId, limit) {
  const lim = Math.min(parseInt(String(limit), 10) || 5, 20);
  if (usePg) {
    const { rows } = await pool.query(
      'SELECT question FROM analysis_logs WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return [...new Set(rows.map((r) => r.question).filter(Boolean))].slice(0, lim);
  }
  const rows = db.prepare('SELECT question FROM analysis_logs WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  return [...new Set(rows.map((r) => r.question).filter(Boolean))].slice(0, lim);
}

export function getDbKind() {
  return usePg ? 'postgresql' : 'sqlite';
}
