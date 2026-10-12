// Human writing quality: experience, specificity, opinion and natural variation.

import type { AIAnalysis, AnalysisInput, Check, HumanAnalysis, ParsedDocument } from '../types/analysis';
import { EXAMPLE_PATTERNS, FIRST_HAND_PATTERNS, OPINION_PATTERNS, PRACTICAL_PATTERNS, INDUSTRY_ENTITIES } from './lexicon';
import { clamp, containsPhrase, cv, round, sentenceWords, truncate } from './text';

function matches(text: string, patterns: RegExp[]): string[] {
  const out: string[] = [];
  for (const re of patterns) {
    re.lastIndex = 0;
    const m = text.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`));
    if (m) out.push(...m);
  }
  return out;
}

function firstSentenceWith(sentences: string[], patterns: RegExp[]): string | undefined {
  return sentences.find((s) => patterns.some((re) => new RegExp(re.source, re.flags.replace('g', '')).test(s)));
}

export function analyzeHuman(doc: ParsedDocument, input: AnalysisInput, ai: AIAnalysis): HumanAnalysis {
  const { plainText, sentences, words } = doc;
  const wc = Math.max(1, words.length);
  const per1000 = (n: number) => (n / wc) * 1000;

  const firstHand = matches(plainText, FIRST_HAND_PATTERNS);
  const examples = matches(plainText, EXAMPLE_PATTERNS);
  const opinions = matches(plainText, OPINION_PATTERNS);
  const practical = matches(plainText, PRACTICAL_PATTERNS);
  const numbers = plainText.match(/\b\d[\d,.]*\s?(%|years?|months?|weeks?|days?|hours?|minutes?|mg|ml|km|miles?)?/g) || [];
  const named = sentences.reduce((n, s) => n + (s.slice(1).match(/\s[A-Z][a-z]{2,}/g) || []).length, 0);
  const sentCV = cv(sentences.map(sentenceWords));
  const listItems = doc.blocks.filter((b) => b.type === 'li').length;

  const contextTerms = [input.targetLocation, input.targetAudience, ...INDUSTRY_ENTITIES[input.industry]].filter(Boolean);
  const contextHits = contextTerms.filter((t) => containsPhrase(plainText, t));
  const insightMarkers = (plainText.match(/\b(however, in practice|in reality|what (most|many) people|the catch|the trade-?off|the downside|counter-?intuitive|it depends on|the exception)\b/gi) || []).length;

  const status = (ok: boolean, partial: boolean): Check['status'] => (ok ? 'pass' : partial ? 'warn' : 'fail');

  const checks: Check[] = [
    {
      id: 'first-hand',
      label: 'First-hand experience',
      status: status(firstHand.length >= 3, firstHand.length >= 1),
      detail: firstHand.length
        ? `${firstHand.length} first-hand references (e.g. "${firstHand[0]}"). ${firstHand.length < 3 ? 'Add more lived detail: what you saw, tested or learned.' : ''}`
        : 'No first-hand experience detected (e.g. "In our clinic we usually see…", "When we tested…").',
    },
    {
      id: 'examples',
      label: 'Specific examples',
      status: status(examples.length >= 3, examples.length >= 1),
      detail: examples.length ? `${examples.length} example markers found${firstSentenceWith(sentences, EXAMPLE_PATTERNS) ? `, e.g. "${truncate(firstSentenceWith(sentences, EXAMPLE_PATTERNS)!, 110)}"` : ''}.` : 'No concrete examples introduced ("for example", "such as", case descriptions).',
    },
    {
      id: 'details',
      label: 'Real-world details (numbers, names, places)',
      status: status(per1000(numbers.length + named * 0.5) >= 15, per1000(numbers.length + named * 0.5) >= 6),
      detail: `${numbers.length} numeric details and ${named} named entities (${round(per1000(numbers.length + named * 0.5), 1)} per 1,000 words).`,
    },
    {
      id: 'opinions',
      label: 'Clear opinions / unique observations',
      status: status(opinions.length >= 2, opinions.length >= 1),
      detail: opinions.length ? `Opinion or stance markers found: ${[...new Set(opinions.map((o) => `"${o.toLowerCase()}"`))].slice(0, 4).join(', ')}.` : 'The text takes no clear position. Where appropriate, state recommendations and trade-offs plainly.',
    },
    {
      id: 'variation',
      label: 'Natural variation in sentence length',
      status: sentences.length < 6 ? 'na' : status(sentCV >= 0.5, sentCV >= 0.38),
      detail: `Sentence-length variation ${round(sentCV, 2)}. ${sentCV < 0.38 ? 'Rhythm is very even; mix short punchy sentences with longer explanatory ones.' : 'Good rhythm variation.'}`,
    },
    {
      id: 'context',
      label: 'Context-specific explanations',
      status: status(contextHits.length >= 4, contextHits.length >= 2),
      detail: contextHits.length ? `References context such as ${contextHits.slice(0, 5).map((c) => `"${c}"`).join(', ')}.` : 'Little that ties the content to the specific audience, location or industry context.',
    },
    {
      id: 'practical',
      label: 'Useful practical information',
      status: status(per1000(practical.length) >= 12 || listItems >= 5, per1000(practical.length) >= 5 || listItems >= 2),
      detail: `${practical.length} practical markers (steps, durations, prices, actions) and ${listItems} list items.`,
    },
    {
      id: 'insight',
      label: 'Original insights',
      status: status(insightMarkers >= 2, insightMarkers >= 1 || opinions.length >= 2),
      detail: insightMarkers ? `${insightMarkers} nuance/trade-off statements found.` : 'No nuance, trade-offs or "what most people miss" insights. These differentiate content from generic summaries.',
    },
  ];

  const pts = checks.filter((c) => c.status !== 'na');
  const checkScore = (pts.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0) / Math.max(1, pts.length)) * 100;
  const score = clamp(round(checkScore * 0.75 + (100 - ai.score) * 0.25));

  const originalityRaw =
    Math.min(30, firstHand.length * 6) +
    Math.min(20, per1000(numbers.length + named * 0.5) * 1.2) +
    Math.min(15, examples.length * 5) +
    Math.min(15, (opinions.length + insightMarkers) * 4) +
    Math.max(0, 20 - ai.metrics.clichePer1000 * 2);
  const originalityScore = clamp(round(originalityRaw));

  const summary: string[] = [];
  const passes = checks.filter((c) => c.status === 'pass').map((c) => c.label.toLowerCase());
  const fails = checks.filter((c) => c.status === 'fail').map((c) => c.label.toLowerCase());
  if (passes.length) summary.push(`Strengths: ${passes.join(', ')}.`);
  if (fails.length) summary.push(`Missing: ${fails.join(', ')}.`);
  summary.push(
    score >= 70
      ? 'The writing reads as grounded and specific, with signs of genuine expertise.'
      : score >= 45
        ? 'The writing is serviceable but leans on general statements. Adding experience, examples and specifics would make it more distinctive.'
        : 'The writing is largely generic. It could describe any business or any page on this topic. It needs first-hand detail, concrete examples and a clear point of view.',
  );

  return { score, checks, summary, originalityScore };
}
