// Offline self-test for the LLM integration (no API call is made).
// Run: npx tsx server/selftest.ts
import assert from 'node:assert/strict';
import { runHeuristicAnalysis } from '../src/engine';
import { SAMPLES } from '../src/data/samples';
import { buildLLMRequest, mergeLLMResult, sanitizeLLMResult, type LLMAnalysisResult } from '../src/services/llmContract';

const input = SAMPLES[0].input;
const base = runHeuristicAnalysis(input);
const pageText = base.document.plainText;

const fake: LLMAnalysisResult = {
  aiLikeness: { score: 140, confidence: 'Medium', reasons: ['Uniform paragraph construction across sections.'] },
  editorNotes: ['Page never states who performs the treatment.'],
  missingTopics: ['Skin tone suitability (Fitzpatrick types)'],
  suggestedH2s: ['What Is Laser Hair Removal?', 'Is It Suitable for Darker Skin?'],
  suggestedFaqs: ['How many sessions of laser hair removal will I need?'],
  seoTitle: 'Laser Hair Removal in London | Example Skin Clinic',
  metaDescription: 'Laser hair removal in London: suitability, sessions, risks and costs.',
  additionalClaims: [
    { original: 'Additionally, it is a cost-effective solution that saves you time and money in the long run.', type: 'Pricing claim', risk: 'Low', suggestion: 'Over a course of [X] sessions, many patients find it costs less than ongoing waxing.' },
    { original: 'This sentence does not exist on the page.', type: 'Outcome claim', risk: 'High', suggestion: 'x' },
  ],
  additionalComplianceFlags: [],
};

const clean = sanitizeLLMResult(fake, pageText);
assert.equal(clean.aiLikeness.score, 100, 'score is clamped');
assert.equal(clean.additionalClaims.length, 1, 'hallucinated quote is dropped');

const merged = mergeLLMResult(base, clean);
assert.equal(merged.scores.aiLikeness, Math.round(base.ai.score * 0.5 + 100 * 0.5), 'AI score is blended');
assert.ok(merged.claims.some((c) => c.trigger === 'Claude review'), 'new claim merged');
assert.ok(merged.issues.length >= base.issues.length, 'issues rebuilt');
assert.deepEqual(merged.llmNotes, clean.editorNotes);
assert.equal(merged.engine.id, 'llm-hybrid');

const req = buildLLMRequest(input, base);
assert.ok(JSON.stringify(req).length < 200_000, 'request is a reasonable size');

// Forced on without credentials: must fail cleanly, not crash.
process.env.CONTENTGUARD_LLM = 'on';
delete process.env.ANTHROPIC_API_KEY;
const { analyzeWithLLM, HttpError } = await import('./analyze');
try {
  await analyzeWithLLM(req);
  console.log('unexpected: call succeeded (credentials found via profile?)');
} catch (e) {
  console.log('no-credential path ->', e instanceof HttpError ? `HttpError ${e.status}: ${e.message}` : `${(e as Error).constructor.name}: ${(e as Error).message}`);
}
console.log('selftest passed');
