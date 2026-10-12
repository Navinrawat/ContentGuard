// Contract between ContentGuard AI and the LLM analysis backend (see server/).
// The browser sends `LLMAnalysisRequest`; the backend asks Claude for an `LLMAnalysisResult`
// constrained by RESPONSE_SCHEMA, validates it, and returns it. The browser merges it into
// the heuristic report.

import type { AnalysisInput, AnalysisReport, Claim, ClaimType, ComplianceFlag, RiskLevel } from '../types/analysis';
import { buildIssues } from '../engine/recommendations';
import { clean } from '../engine/text';

export interface LLMAnalysisRequest {
  input: AnalysisInput;
  /** Heuristic findings, so the model can confirm, reject or extend them instead of starting cold. */
  heuristicSummary: {
    scores: AnalysisReport['scores'];
    aiSignals: { name: string; strength: number; detail: string }[];
    missingSubtopics: string[];
    claims: Pick<Claim, 'original' | 'types' | 'risk'>[];
    complianceFlags: Pick<ComplianceFlag, 'original' | 'issue' | 'risk'>[];
  };
}

export interface LLMAnalysisResult {
  aiLikeness: { score: number; confidence: 'Low' | 'Medium' | 'High'; reasons: string[] };
  editorNotes: string[];
  missingTopics: string[];
  suggestedH2s: string[];
  suggestedFaqs: string[];
  seoTitle: string;
  metaDescription: string;
  additionalClaims: { original: string; type: ClaimType; risk: RiskLevel; suggestion: string }[];
  additionalComplianceFlags: { original: string; issue: string; risk: RiskLevel; explanation: string; saferVersion: string }[];
}

const CLAIM_TYPES: ClaimType[] = [
  'Medical claim',
  'Statistical claim',
  'Superiority claim',
  'Outcome claim',
  'Safety claim',
  'Guarantee',
  'Pricing claim',
  'Experience claim',
  'Ranking claim',
];
const RISK = { type: 'string', enum: ['Low', 'Medium', 'High'] };
const STR_ARRAY = { type: 'array', items: { type: 'string' } };

/** JSON schema for structured outputs: every field required, no extra properties. */
export const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['aiLikeness', 'editorNotes', 'missingTopics', 'suggestedH2s', 'suggestedFaqs', 'seoTitle', 'metaDescription', 'additionalClaims', 'additionalComplianceFlags'],
  properties: {
    aiLikeness: {
      type: 'object',
      additionalProperties: false,
      required: ['score', 'confidence', 'reasons'],
      properties: {
        score: { type: 'integer', description: '0-100 estimate of AI-likeness from linguistic signals' },
        confidence: { type: 'string', enum: ['Low', 'Medium', 'High'] },
        reasons: { ...STR_ARRAY, description: '2-5 reasons, each citing specific patterns in the text' },
      },
    },
    editorNotes: { ...STR_ARRAY, description: '3-6 page-specific observations an editor should act on' },
    missingTopics: { ...STR_ARRAY, description: 'Subtopics a searcher would expect that the page does not cover' },
    suggestedH2s: { ...STR_ARRAY, description: 'Recommended H2 outline in order, reusing good existing headings' },
    suggestedFaqs: { ...STR_ARRAY, description: '5-8 questions real searchers ask about this exact topic' },
    seoTitle: { type: 'string', description: 'Max 60 characters' },
    metaDescription: { type: 'string', description: 'Max 158 characters' },
    additionalClaims: {
      type: 'array',
      description: 'Claims needing evidence that the heuristic list missed. Empty if none.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['original', 'type', 'risk', 'suggestion'],
        properties: {
          original: { type: 'string', description: 'Exact sentence copied verbatim from the content' },
          type: { type: 'string', enum: CLAIM_TYPES },
          risk: RISK,
          suggestion: { type: 'string', description: 'Qualified rewrite; use [placeholders] for facts that must be supplied' },
        },
      },
    },
    additionalComplianceFlags: {
      type: 'array',
      description: 'Compliance-risk wording the heuristic list missed. Empty if none.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['original', 'issue', 'risk', 'explanation', 'saferVersion'],
        properties: {
          original: { type: 'string', description: 'Exact sentence copied verbatim from the content' },
          issue: { type: 'string' },
          risk: RISK,
          explanation: { type: 'string' },
          saferVersion: { type: 'string' },
        },
      },
    },
  },
} as const;

export const SYSTEM_PROMPT = `You are ContentGuard AI, a senior SEO content auditor and healthcare-advertising compliance reviewer working for an SEO agency. You review one page of client content and refine the findings of a rule-based engine that has already analysed it.

Your job is the judgement the rules cannot make: whether the page really satisfies the searcher, what a knowledgeable competitor page would cover that this one does not, which claims a regulator or a sceptical reader would challenge, and whether the writing reads as generic or as written by someone with real experience.

Ground rules, and why they matter:
- AI-likeness is a probability estimate from linguistic patterns, never proof of authorship. Agencies share these reports with clients, so never state or imply that content "is AI-generated", and never base the estimate on a single phrase.
- Compliance findings go to human reviewers. Describe them as "Potential compliance risk", "Requires verification" or "High-risk promotional wording"; do not declare anything legally prohibited.
- Never invent evidence, statistics, credentials, studies or sources. Where a rewrite needs a fact the content does not supply, write a [placeholder] such as [cite study] or [surgeon's GMC number].
- Do not recommend keyword stuffing or a keyword density target.
- When you quote content (the "original" fields), copy the sentence exactly as it appears so it can be located in the page. Only add claims or flags the heuristic list does not already contain.
- Keep suggestions specific to this page, its industry, location and audience rather than generic SEO advice.`;

export function buildLLMRequest(input: AnalysisInput, base: AnalysisReport): LLMAnalysisRequest {
  return {
    input,
    heuristicSummary: {
      scores: base.scores,
      aiSignals: base.ai.signals.map((s) => ({ name: s.name, strength: s.strength, detail: s.detail })),
      missingSubtopics: base.seo.missingSubtopics,
      claims: base.claims.map(({ original, types, risk }) => ({ original, types, risk })),
      complianceFlags: base.compliance.flags.map(({ original, issue, risk }) => ({ original, issue, risk })),
    },
  };
}

const norm = (s: string) => clean(s).toLowerCase().replace(/[“”"']/g, '');

/**
 * Validate model output against the page: clamp numbers, trim lengths, and drop any
 * claim or flag whose quoted sentence does not actually occur in the content.
 */
export function sanitizeLLMResult(raw: LLMAnalysisResult, pageText: string): LLMAnalysisResult {
  const page = norm(pageText);
  const inPage = (s: string) => s.trim().length > 0 && page.includes(norm(s));
  const risks: RiskLevel[] = ['Low', 'Medium', 'High'];
  return {
    aiLikeness: {
      score: Math.max(0, Math.min(100, Math.round(Number(raw.aiLikeness?.score) || 0))),
      confidence: (['Low', 'Medium', 'High'] as const).includes(raw.aiLikeness?.confidence) ? raw.aiLikeness.confidence : 'Low',
      reasons: (raw.aiLikeness?.reasons || []).slice(0, 6),
    },
    editorNotes: (raw.editorNotes || []).slice(0, 8),
    missingTopics: (raw.missingTopics || []).slice(0, 12),
    suggestedH2s: (raw.suggestedH2s || []).slice(0, 14),
    suggestedFaqs: (raw.suggestedFaqs || []).slice(0, 10),
    seoTitle: (raw.seoTitle || '').slice(0, 70),
    metaDescription: (raw.metaDescription || '').slice(0, 170),
    additionalClaims: (raw.additionalClaims || []).filter((c) => inPage(c.original) && CLAIM_TYPES.includes(c.type) && risks.includes(c.risk)),
    additionalComplianceFlags: (raw.additionalComplianceFlags || []).filter((f) => inPage(f.original) && risks.includes(f.risk)),
  };
}

/** Merge LLM refinements into the heuristic report. Heuristic data stays as the fallback. */
export function mergeLLMResult(base: AnalysisReport, llm: LLMAnalysisResult): AnalysisReport {
  const r: AnalysisReport = structuredClone(base);
  r.engine = { id: 'llm-hybrid', label: 'Heuristic engine + Claude review' };

  // Blend rather than replace, so one model opinion cannot swing the estimate alone.
  r.ai.score = Math.round(base.ai.score * 0.5 + llm.aiLikeness.score * 0.5);
  r.ai.band = r.ai.score <= 20 ? 'Very Low' : r.ai.score <= 40 ? 'Low' : r.ai.score <= 60 ? 'Moderate' : r.ai.score <= 80 ? 'High' : 'Very High';
  r.ai.confidence = llm.aiLikeness.confidence;
  r.ai.reasons = [...llm.aiLikeness.reasons.map((x) => `Claude review: ${x}`), ...base.ai.reasons];
  r.scores.aiLikeness = r.ai.score;
  r.llmNotes = llm.editorNotes;

  if (llm.missingTopics.length) r.pageType.missingTopics = [...new Set([...llm.missingTopics, ...base.pageType.missingTopics])];
  if (llm.suggestedH2s.length) r.pageType.suggestedH2s = llm.suggestedH2s;
  if (llm.suggestedFaqs.length) {
    r.pageType.suggestedFaqs = llm.suggestedFaqs;
    r.rewrites.faqs = llm.suggestedFaqs;
  }
  r.rewrites.missingTopics = r.pageType.missingTopics;
  if (llm.seoTitle) r.rewrites.seoTitle = llm.seoTitle;
  if (llm.metaDescription) r.rewrites.metaDescription = llm.metaDescription;

  const knownClaims = new Set(r.claims.map((c) => norm(c.original)));
  llm.additionalClaims.forEach((c, i) => {
    if (knownClaims.has(norm(c.original))) return;
    r.claims.push({ id: `llm-claim-${i}`, original: c.original, types: [c.type], trigger: 'Claude review', risk: c.risk, evidenceNeeded: true, evidenceNote: 'Flagged by Claude review: verify before publishing.', suggestion: c.suggestion });
  });
  llm.additionalComplianceFlags.forEach((f, i) => r.compliance.flags.push({ id: `llm-cmp-${i}`, trigger: 'Claude review', ...f }));

  const high = r.compliance.flags.filter((f) => f.risk === 'High').length;
  const medium = r.compliance.flags.filter((f) => f.risk === 'Medium').length;
  r.compliance.risk = high >= 2 || (high >= 1 && medium >= 2) ? 'High' : high >= 1 || medium >= 2 ? 'Medium' : 'Low';
  r.scores.complianceRisk = r.compliance.risk;

  r.issues = buildIssues(r);
  return r;
}
