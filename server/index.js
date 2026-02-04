import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import * as db from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const LOCAL_USER_ID = 'local';
const SALT_ROUNDS = 10;
const REGISTRATION_KEY = process.env.REGISTRATION_KEY || '1234567';

async function start() {
  await db.init();

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, db: db.getDbKind() });
  });

  app.post('/api/register', async (req, res) => {
    try {
      const { email, password, registration_key: registrationKey } = req.body;
      if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Email and password required' });
      }
      if (!registrationKey || registrationKey !== REGISTRATION_KEY) {
        return res.status(403).json({ error: 'Invalid registration key' });
      }
      const emailTrim = email.trim().toLowerCase();
      if (!emailTrim) return res.status(400).json({ error: 'Email required' });
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      const existing = await db.getUserByEmail(emailTrim);
      if (existing) return res.status(409).json({ error: 'Email already registered' });
      const id = randomUUID();
      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
      await db.createUser(id, emailTrim, password_hash);
      res.status(201).json({ id, email: emailTrim });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Email and password required' });
      }
      const emailTrim = email.trim().toLowerCase();
      const row = await db.getUserByEmail(emailTrim);
      if (!row) return res.status(401).json({ error: 'Invalid email or password' });
      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
      res.json({ id: row.id, email: row.email });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/analysis-logs', async (req, res) => {
    try {
      const userId = req.query.user_id || LOCAL_USER_ID;
      const savedOnly = req.query.saved === 'true';
      const rows = await db.getAnalysisLogs(userId, savedOnly);
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/analysis-logs/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.query.user_id || LOCAL_USER_ID;
      const row = await db.getAnalysisLog(id, userId);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/analysis-logs', async (req, res) => {
    try {
      const {
        user_id = LOCAL_USER_ID,
        question,
        data_summary = {},
        result_summary,
        charts_generated = 0,
        analysis_details = {},
        is_saved = false,
      } = req.body;
      const id = randomUUID();
      const row = await db.createAnalysisLog({
        id,
        user_id,
        question,
        data_summary,
        result_summary,
        charts_generated,
        analysis_details,
        is_saved,
      });
      res.status(201).json(row);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/analysis-logs/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.query.user_id || LOCAL_USER_ID;
      const { analysis_details, charts_generated, is_saved } = req.body;
      const updates = {};
      if (analysis_details !== undefined) updates.analysis_details = analysis_details;
      if (charts_generated !== undefined) updates.charts_generated = charts_generated;
      if (is_saved !== undefined) updates.is_saved = is_saved;
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updates' });
      const changes = await db.updateAnalysisLog(id, userId, updates);
      if (changes === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/analysis-logs/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.query.user_id || LOCAL_USER_ID;
      const changes = await db.deleteAnalysisLog(id, userId);
      if (changes === 0) return res.status(404).json({ error: 'Not found' });
      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/recent-questions', async (req, res) => {
    try {
      const userId = req.query.user_id || LOCAL_USER_ID;
      const limit = Math.min(parseInt(req.query.limit || '5', 10) || 5, 20);
      const questions = await db.getRecentQuestions(userId, limit);
      res.json(questions);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  const distPath = join(__dirname, '..', 'dist');
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(join(distPath, 'index.html'));
    });
  }

  const PORT = parseInt(process.env.PORT || '3001', 10);
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Database: ${db.getDbKind()}`);
    if (existsSync(distPath)) {
      console.log('Serving frontend from dist/ (app + API on same port)');
    } else {
      console.log('No dist/ – run "npm run build" then restart to serve the app here');
    }
  });
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  try {
    if (db.getDbKind?.() === 'postgresql') {
      console.error('Check DATABASE_URL and that PostgreSQL is reachable.');
    }
  } catch (_) {}
  process.exit(1);
});
