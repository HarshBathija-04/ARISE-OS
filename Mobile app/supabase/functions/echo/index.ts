/**
 * SOLO OS — `echo` edge function.
 *
 * The ONLY place an AI API key ever lives. The client sends a privacy-safe,
 * already-computed fact sheet (headline, metrics, insights, directives); this
 * function asks the configured model to narrate those facts in ECHO's voice and
 * returns a single `{ text }` string.
 *
 * It never receives raw user data and never invents metrics — it only rephrases
 * what the client already computed. If the selected provider's key is missing,
 * it returns a deterministic local narration so ECHO still works.
 *
 * Deploy: `supabase functions deploy echo`
 * Secrets: `supabase secrets set ANTHROPIC_API_KEY=… OPENAI_API_KEY=… GEMINI_API_KEY=…`
 *
 * @ts-nocheck — runs on Deno (supabase edge runtime), not the RN TS project.
 */
// @ts-nocheck
/* eslint-disable */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Metric = { label: string; value: string };
type Insight = { label: string; text: string; tone: string };
type Recommendation = { priority: number; title: string; reason: string };
interface NarrationRequest {
  kind: 'MORNING' | 'EVENING' | 'WEEKLY';
  headline: string;
  status: string;
  metrics: Metric[];
  insights: Insight[];
  recommendations: Recommendation[];
}

const SYSTEM_PROMPT = [
  'You are ECHO, the intelligence layer of SOLO OS — a real-life RPG operating system.',
  'Voice: terse, analytical, calm, like a tactical AI briefing an elite operator.',
  'You will be given a STRUCTURED FACT SHEET that has already been computed from real data.',
  'Rewrite it as a short narrative (3-5 sentences). Rules:',
  '- Use ONLY the facts provided. Never invent numbers, streaks, or achievements.',
  '- No generic motivation ("you got this!"). Every sentence must reference a real fact.',
  '- Lead with the most important insight or directive.',
  '- Second person ("you"). No emojis. No markdown headers.',
].join('\n');

function factSheet(req: NarrationRequest): string {
  const lines: string[] = [];
  lines.push(`REPORT: ${req.kind}`);
  lines.push(`HEADLINE: ${req.headline}`);
  lines.push(`STATUS: ${req.status}`);
  lines.push('METRICS:');
  for (const m of req.metrics) lines.push(`  - ${m.label}: ${m.value}`);
  lines.push('INSIGHTS:');
  for (const i of req.insights) lines.push(`  - [${i.tone}] ${i.label}: ${i.text}`);
  lines.push('DIRECTIVES:');
  for (const r of [...req.recommendations].sort((a, b) => a.priority - b.priority)) {
    lines.push(`  ${r.priority}. ${r.title} — ${r.reason}`);
  }
  return lines.join('\n');
}

/** Deterministic fallback narration (mirrors the client MockAIProvider). */
function localNarrate(req: NarrationRequest): string {
  const opener =
    req.kind === 'MORNING' ? 'SYSTEM ONLINE. Operator state assessed.'
    : req.kind === 'EVENING' ? 'DAY CYCLE CLOSED. Recording today’s deltas.'
    : 'SEVEN-DAY ANALYSIS COMPLETE. Trend vector locked.';
  const readout = req.metrics.length
    ? `Readout — ${req.metrics.map((m) => `${m.label} ${m.value}`).join(' · ')}.`
    : '';
  const insight = req.insights.find((i) => i.tone === 'critical' || i.tone === 'warning')?.text
    ?? req.insights[0]?.text ?? '';
  const top = [...req.recommendations].sort((a, b) => a.priority - b.priority)[0];
  const directive = top ? `Priority directive: ${top.title}. ${top.reason}` : '';
  return [opener, req.headline, readout, insight, directive].filter(Boolean).join(' ');
}

async function callClaude(req: NarrationRequest, key: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: factSheet(req) }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = await res.json();
  return (data?.content?.[0]?.text ?? '').trim();
}

async function callOpenAI(req: NarrationRequest, key: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 400,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: factSheet(req) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}`);
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? '').trim();
}

async function callGemini(req: NarrationRequest, key: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: factSheet(req) }] }],
        generationConfig: { maxOutputTokens: 400 },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
}

// deno-lint-ignore no-explicit-any
Deno.serve(async (httpReq: any) => {
  if (httpReq.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = await httpReq.json();
    const provider: string = (body?.provider ?? 'mock').toLowerCase();
    const request: NarrationRequest = body?.request;
    if (!request || !request.kind) {
      return json({ error: 'missing request' }, 400);
    }

    let text = '';
    try {
      if (provider === 'claude') {
        const key = Deno.env.get('ANTHROPIC_API_KEY');
        if (key) text = await callClaude(request, key);
      } else if (provider === 'openai') {
        const key = Deno.env.get('OPENAI_API_KEY');
        if (key) text = await callOpenAI(request, key);
      } else if (provider === 'gemini') {
        const key = Deno.env.get('GEMINI_API_KEY');
        if (key) text = await callGemini(request, key);
      }
    } catch (_err) {
      text = '';
    }

    if (!text) text = localNarrate(request);
    return json({ text, provider });
  } catch (_err) {
    return json({ error: 'bad request' }, 400);
  }
});

// deno-lint-ignore no-explicit-any
function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}
