// Heuristic analysis engine: orchestrates every module into a single AnalysisReport.

import type { AnalysisInput, AnalysisReport, RiskLevel, ScoreSummary } from '../types/analysis';
import { analyzeAI } from './aiDetection';
import { analyzeClaims } from './claims';
import { analyzeCompliance } from './compliance';
import { analyzeEEAT } from './eeat';
import { analyzeHuman } from './humanWriting';
import { analyzePageType } from './pageType';
import { analyzeQuality, analyzeSpam } from './quality';
import { analyzeReadability } from './readability';
import { buildIssues } from './recommendations';
import { buildRewrites } from './rewrites';
import { analyzeKeyword, analyzeSEO } from './seo';
import { clamp, parseContent, round } from './text';

export const HEURISTIC_ENGINE = { id: 'heuristic-v1', label: 'ContentGuard heuristic engine v1' };

export function runHeuristicAnalysis(input: AnalysisInput): AnalysisReport {
  const doc = parseContent(input.content, input.websiteUrl);

  const ai = analyzeAI(doc);
  const human = analyzeHuman(doc, input, ai);
  const readability = analyzeReadability(doc, input);
  const keyword = analyzeKeyword(doc, input);
  const seo = analyzeSEO(doc, input, keyword, ai);
  const claims = analyzeClaims(doc, input);
  const compliance = analyzeCompliance(doc, input);
  const eeat = analyzeEEAT(doc, input, human, compliance);
  const quality = analyzeQuality(doc, ai, human, readability, seo);
  const pageType = analyzePageType(doc, input, seo, ai, readability, claims);
  const spam = analyzeSpam(doc, ai, keyword, input.targetLocation.trim(), seo);
  const rewrites = buildRewrites(doc, input, seo, readability, claims, compliance, eeat, pageType);

  const stats = {
    words: doc.words.length,
    sentences: doc.sentences.length,
    paragraphs: doc.paragraphs.length,
    headings: doc.headings.length,
    readingTimeMin: Math.max(1, Math.round(doc.words.length / 230)),
    links: doc.links.length,
  };

  const draft = { input, document: doc, stats, ai, human, seo, keyword, readability, eeat, claims, compliance, quality, pageType, spam, rewrites };
  const issues = buildIssues(draft);

  return {
    id: `rpt-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    engine: HEURISTIC_ENGINE,
    ...draft,
    scores: summarize(draft),
    issues,
  };
}

const riskPenalty = (r: RiskLevel, high: number, med: number) => (r === 'High' ? high : r === 'Medium' ? med : 0);

/** Overall score. AI-likeness is intentionally NOT a direct penalty: it is a diagnostic only. */
function summarize(d: Omit<AnalysisReport, 'issues' | 'scores' | 'id' | 'createdAt' | 'engine'>): ScoreSummary {
  const weighted =
    d.seo.score * 0.2 +
    d.seo.searchIntent.score * 0.12 +
    d.human.score * 0.12 +
    d.readability.score * 0.1 +
    d.eeat.overall * 0.14 +
    d.human.originalityScore * 0.1 +
    d.quality.score * 0.12 +
    d.pageType.score * 0.1;
  const overall = clamp(round(weighted - riskPenalty(d.spam.risk, 10, 4) - riskPenalty(d.compliance.risk, d.compliance.applicable ? 10 : 5, d.compliance.applicable ? 4 : 2)));
  return {
    overall,
    seo: d.seo.score,
    aiLikeness: d.ai.score,
    human: d.human.score,
    searchIntent: d.seo.searchIntent.score,
    readability: d.readability.score,
    eeat: d.eeat.overall,
    originality: d.human.originalityScore,
    quality: d.quality.score,
    spamRisk: d.spam.risk,
    complianceRisk: d.compliance.risk,
  };
}
