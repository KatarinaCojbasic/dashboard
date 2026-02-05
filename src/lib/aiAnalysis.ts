/**
 * AI-powered analysis: OpenAI (GPT) and Anthropic (Claude).
 * Sends question + CSV context to the chosen API and parses response into AnalysisResult.
 */

import type { CSVData, AnalysisResult, ChartData } from '../types';

const CHART_COLORS = [
  'rgba(59, 130, 246, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(249, 115, 22, 0.7)',
  'rgba(236, 72, 153, 0.7)', 'rgba(168, 85, 247, 0.7)', 'rgba(14, 165, 233, 0.7)',
  'rgba(251, 191, 36, 0.7)', 'rgba(20, 184, 166, 0.7)'
];
const BORDER_COLORS = CHART_COLORS.map(c => c.replace('0.7', '1'));

function buildDataContext(data: CSVData, maxRows = 50): string {
  const headers = data.headers.join(', ');
  const rows = data.data.slice(0, maxRows).map(row =>
    data.headers.map(h => String(row[h] ?? '')).join(', ')
  );
  return `Columns: ${headers}\n\nSample rows (up to ${maxRows}):\n${rows.join('\n')}`;
}

const JSON_SCHEMA = `
Respond with a single JSON object only, no markdown or extra text:
{
  "summary": "2-3 sentence summary of the analysis",
  "insights": ["insight 1", "insight 2", "..."],
  "charts": [
    {
      "type": "bar" | "line" | "pie" | "doughnut",
      "title": "Chart title",
      "labels": ["label1", "label2", "..."],
      "dataValues": [10, 20, ...]
    }
  ]
}
You can suggest 0 to 3 charts. Use type "bar" or "line" for numeric comparisons, "pie" or "doughnut" for proportions.`;

function buildPrompt(question: string, dataContext: string): string {
  return `You are a data analyst. The user has uploaded CSV data and asked a question.

CSV data:
${dataContext}

User question: ${question}

Analyze the data and answer the question. ${JSON_SCHEMA}`;
}

interface ParsedChart {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  title: string;
  labels: string[];
  dataValues: number[];
}

function parseAIResponse(text: string): AnalysisResult | null {
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first === -1 || last <= first) return null;
    const json = JSON.parse(cleaned.slice(first, last + 1));
    const summary = typeof json.summary === 'string' ? json.summary : 'Analysis complete.';
    const insights = Array.isArray(json.insights) ? json.insights.filter((i: unknown) => typeof i === 'string') : [];
    const charts: ChartData[] = [];
    if (Array.isArray(json.charts)) {
      json.charts.forEach((c: ParsedChart) => {
        if (!c.type || !c.labels || !c.dataValues) return;
        const type = ['bar', 'line', 'pie', 'doughnut'].includes(c.type) ? c.type : 'bar';
        const n = Math.min(c.labels.length, c.dataValues.length);
        const labels = c.labels.slice(0, n);
        const dataValues = c.dataValues.slice(0, n);
        const colors = CHART_COLORS.slice(0, n);
        const borders = BORDER_COLORS.slice(0, n);
        charts.push({
          type,
          title: typeof c.title === 'string' ? c.title : 'Chart',
          data: {
            labels,
            datasets: [{
              label: typeof c.title === 'string' ? c.title : 'Values',
              data: dataValues,
              backgroundColor: colors,
              borderColor: borders,
              borderWidth: 2
            }]
          }
        });
      });
    }
    return { summary, charts, insights };
  } catch {
    return null;
  }
}

export async function analyzeWithGPT(apiKey: string, data: CSVData, question: string): Promise<AnalysisResult> {
  const dataContext = buildDataContext(data);
  const prompt = buildPrompt(question, dataContext);
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message || res.statusText || 'OpenAI request failed');
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') throw new Error('No response from GPT');
  const parsed = parseAIResponse(content);
  if (parsed) return parsed;
  return { summary: content.slice(0, 2000), charts: [], insights: [] };
}

export async function analyzeWithClaude(apiKey: string, data: CSVData, question: string): Promise<AnalysisResult> {
  const dataContext = buildDataContext(data);
  const prompt = buildPrompt(question, dataContext);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message || res.statusText || 'Anthropic request failed');
  }
  const json = await res.json();
  const content = json.content?.[0]?.text;
  if (!content || typeof content !== 'string') throw new Error('No response from Claude');
  const parsed = parseAIResponse(content);
  if (parsed) return parsed;
  return { summary: content.slice(0, 2000), charts: [], insights: [] };
}

export type AIProvider = 'gpt' | 'claude';

export async function analyzeWithAI(
  provider: AIProvider,
  apiKey: string,
  data: CSVData,
  question: string
): Promise<AnalysisResult> {
  const key = apiKey.trim();
  if (!key) throw new Error('API token is required');
  if (provider === 'gpt') return analyzeWithGPT(key, data, question);
  return analyzeWithClaude(key, data, question);
}
