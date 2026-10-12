// Framework-free LLM analysis handler. Used by the Vite dev middleware and the production server.
// Holds the Anthropic credentials server-side; the browser never sees them.

import Anthropic from '@anthropic-ai/sdk';
import { CONTENT_TYPE_LABELS, INDUSTRY_LABELS } from '../src/engine/lexicon';
import { parseContent } from '../src/engine/text';
import { RESPONSE_SCHEMA, SYSTEM_PROMPT, sanitizeLLMResult, type LLMAnalysisRequest, type LLMAnalysisResult } from '../src/services/llmContract';

const MODEL = process.env.CONTENTGUARD_MODEL || 'claude-opus-5-5';
const EFFORT = (process.env.CONTENTGUARD_EFFORT || 'medium') as 'low' | 'medium' | 'high' | 'xhigh' | 'max';
const MAX_CONTENT_CHARS = 120_000;

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

/**
 * The LLM path is on when credentials are configured, unless explicitly disabled.
 * CONTENTGUARD_LLM=on forces it (e.g. when using an `ant auth login` profile instead of an env key).
 */
export function llmEnabled(): boolean {
  const flag = (process.env.CONTENTGUARD_LLM || '').toLowerCase();
  if (flag === 'off') return false;
  if (flag === 'on') return true;
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function toMarkdown(content: string, url: string): string {
  const doc = parseContent(content, url);
  const prefix: Record<string, string> = { h1: '# ', h2: '## ', h3: '### ', h4: '#### ', li: '- ', quote: '> ', p: '' };
  return doc.blocks.map((b) => `${prefix[b.type]}${b.text}`).join('\n\n');
}

function buildUserPrompt(req: LLMAnalysisRequest, markdown: string): string {
  const { input, heuristicSummary: h } = req;
  const ctx = [
    `Content type: ${CONTENT_TYPE_LABELS[input.contentType] ?? input.contentType}`,
    `Industry: ${INDUSTRY_LABELS[input.industry] ?? input.industry}`,
    input.primaryKeyword && `Primary keyword: ${input.primaryKeyword}`,
    input.secondaryKeywords.length && `Secondary keywords: ${input.secondaryKeywords.join(', ')}`,
    input.targetLocation && `Target location: ${input.targetLocation}`,
    input.targetAudience && `Target audience: ${input.targetAudience}`,
    input.websiteUrl && `Website: ${input.websiteUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return `<page_context>
${ctx}
</page_context>

<content>
${markdown}
</content>

<heuristic_findings>
Scores: ${JSON.stringify(h.scores)}
AI-likeness signals (strength 0-1): ${h.aiSignals.map((s) => `${s.name}=${s.strength}`).join('; ')}
Missing subtopics (template-based): ${h.missingSubtopics.join('; ') || 'none'}
Claims already flagged: ${h.claims.length ? h.claims.map((c) => `\n- [${c.risk}] ${c.types.join('+')}: "${c.original}"`).join('') : 'none'}
Compliance flags already raised: ${h.complianceFlags.length ? h.complianceFlags.map((f) => `\n- [${f.risk}] ${f.issue}: "${f.original}"`).join('') : 'none'}
</heuristic_findings>

Review the content above. Give your own AI-likeness estimate (it will be blended with the heuristic score), page-specific editor notes, the topics, H2 outline and FAQs this page should have for its keyword and audience, an SEO title and meta description, and any claims or compliance-risk wording the heuristic lists missed.`;
}

export async function analyzeWithLLM(body: unknown): Promise<LLMAnalysisResult> {
  if (!llmEnabled()) throw new HttpError(503, 'LLM analysis is not configured on the server.');
  const req = body as LLMAnalysisRequest;
  if (!req?.input || typeof req.input.content !== 'string' || !req.heuristicSummary) throw new HttpError(400, 'Invalid analysis request.');
  if (req.input.content.length > MAX_CONTENT_CHARS) throw new HttpError(413, 'Content is too long for LLM review.');

  const markdown = toMarkdown(req.input.content, req.input.websiteUrl);

  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Re-run a declined request on Anthropic's recommended fallback model instead of failing.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: EFFORT, format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
      messages: [{ role: 'user', content: buildUserPrompt(req, markdown) }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new HttpError(503, 'Anthropic credentials were rejected.');
    if (err instanceof Anthropic.RateLimitError) throw new HttpError(429, 'Claude API rate limit reached. Try again shortly.');
    if (err instanceof Anthropic.BadRequestError) throw new HttpError(502, `Claude API rejected the request: ${err.message}`);
    if (err instanceof Anthropic.APIConnectionError) throw new HttpError(502, 'Could not reach the Claude API.');
    if (err instanceof Anthropic.APIError) throw new HttpError(502, `Claude API error ${err.status ?? ''}`.trim());
    // Client-side failures before any request is sent, e.g. no credentials could be resolved.
    throw new HttpError(503, `Claude client not configured: ${(err as Error).message.split('.')[0]}.`);
  }

  if (response.stop_reason === 'refusal') throw new HttpError(422, 'The model declined to review this content.');
  if (response.stop_reason === 'max_tokens') throw new HttpError(502, 'The model response was cut off.');

  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text;
  if (!text) throw new HttpError(502, 'The model returned no content.');
  let parsed: LLMAnalysisResult;
  try {
    parsed = JSON.parse(text) as LLMAnalysisResult;
  } catch {
    throw new HttpError(502, 'The model returned invalid JSON.');
  }
  return sanitizeLLMResult(parsed, markdown);
}

/** Minimal Node request adapter shared by the dev middleware and the production server. */
export async function handleApi(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
): Promise<boolean> {
  const url = req.url?.split('?')[0];
  const send = (status: number, data: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  if (url === '/api/status' && req.method === 'GET') {
    send(200, { llm: llmEnabled(), model: llmEnabled() ? MODEL : null });
    return true;
  }
  if (url === '/api/analyze') {
    if (req.method !== 'POST') {
      send(405, { error: 'Method not allowed' });
      return true;
    }
    try {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += (chunk as Buffer).length;
        if (size > 2_000_000) throw new HttpError(413, 'Request body too large.');
        chunks.push(chunk as Buffer);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      send(200, await analyzeWithLLM(body));
    } catch (err) {
      if (err instanceof HttpError) send(err.status, { error: err.message });
      else if (err instanceof SyntaxError) send(400, { error: 'Invalid JSON body.' });
      else {
        console.error('[ContentGuard] analysis failed', err);
        send(500, { error: 'Internal error' });
      }
    }
    return true;
  }
  return false;
}
