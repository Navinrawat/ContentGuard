// Content quality: clarity, usefulness, specificity, grammar/spelling, redundancy and filler.

import type { AIAnalysis, HumanAnalysis, ParsedDocument, QualityAnalysis, ReadabilityAnalysis, RiskLevel, SEOAnalysis, KeywordAnalysis } from '../types/analysis';
import { COMMON_MISSPELLINGS, CTA_RE, FILLER_PHRASES, REDUNDANT_PHRASES, SOURCE_RE } from './lexicon';
import { clamp, countPhrase, round, tokenize, truncate } from './text';

export function analyzeQuality(doc: ParsedDocument, ai: AIAnalysis, human: HumanAnalysis, readability: ReadabilityAnalysis, seo: SEOAnalysis): QualityAnalysis {
  const text = doc.plainText;
  const wc = Math.max(1, doc.words.length);

  // Grammar & spelling (lightweight rule set; an LLM provider can replace this).
  const grammar: QualityAnalysis['grammar'] = [];
  for (const s of doc.sentences) {
    const rep = s.match(/\b(\w+)\s+\1\b/i);
    if (rep && !/^(that|had|very|bye|ha|no)$/i.test(rep[1])) grammar.push({ original: s, issue: `Repeated word "${rep[0]}"`, fix: s.replace(rep[0], rep[1]) });
    if (/^[a-z]/.test(s)) grammar.push({ original: s, issue: 'Sentence starts with a lowercase letter', fix: s.charAt(0).toUpperCase() + s.slice(1) });
    if (/[,.;:!?][A-Za-z]/.test(s.replace(/\b(e\.g|i\.e|[A-Z]\.[A-Z])\./g, '').replace(/\d[.,]\d/g, '').replace(/\.(com|org|net|co|uk|io|ai)\b/g, '')))
      grammar.push({ original: s, issue: 'Missing space after punctuation', fix: s.replace(/([,;:!?])([A-Za-z])/g, '$1 $2') });
    if (/\s{2,}/.test(s)) grammar.push({ original: s, issue: 'Double space', fix: s.replace(/\s{2,}/g, ' ') });
    if (/\bi\b/.test(s)) grammar.push({ original: s, issue: 'Lowercase "i" as a pronoun', fix: s.replace(/\bi\b/g, 'I') });
    if (/\bits (a|an|the|been|not|very|important|time|easy|hard)\b/i.test(s)) grammar.push({ original: s, issue: '"its" should probably be "it’s" (it is)', fix: s.replace(/\bits (a|an|the|been|not|very|important|time|easy|hard)\b/i, "it's $1") });
    if (/\b(could|should|would|must) of\b/i.test(s)) grammar.push({ original: s, issue: '"of" should be "have"', fix: s.replace(/\b(could|should|would|must) of\b/gi, '$1 have') });
    if (/\byour (welcome|going|right)\b/i.test(s)) grammar.push({ original: s, issue: '"your" should probably be "you’re"', fix: s.replace(/\byour (welcome|going|right)\b/gi, "you're $1") });
    if (/!{2,}/.test(s)) grammar.push({ original: s, issue: 'Multiple exclamation marks', fix: s.replace(/!{2,}/g, '.') });
    for (const w of tokenize(s)) {
      if (COMMON_MISSPELLINGS[w]) grammar.push({ original: s, issue: `Possible misspelling: "${w}"`, fix: s.replace(new RegExp(`\\b${w}\\b`, 'i'), COMMON_MISSPELLINGS[w]) });
    }
  }

  const redundancy: string[] = [];
  REDUNDANT_PHRASES.forEach((p) => {
    if (countPhrase(text, p)) redundancy.push(`Redundant phrase: "${p}"`);
  });
  const seen = new Map<string, number>();
  doc.sentences.forEach((s) => {
    const k = s.toLowerCase().replace(/[^a-z0-9 ]/g, '');
    if (tokenize(k).length >= 6) seen.set(k, (seen.get(k) || 0) + 1);
  });
  seen.forEach((n, k) => {
    if (n > 1) redundancy.push(`Sentence repeated ${n}×: "${truncate(k, 90)}"`);
  });
  seo.duplicateSections.forEach((d) => redundancy.push(d));

  const filler = FILLER_PHRASES.map((phrase) => ({ phrase, count: countPhrase(text, phrase) })).filter((f) => f.count > 0).sort((a, b) => b.count - a.count);
  const fillerTotal = filler.reduce((s, f) => s + f.count, 0);
  const fillerPer1000 = (fillerTotal / wc) * 1000;

  const sourced = doc.sentences.filter((s) => SOURCE_RE.test(s)).length;
  const hedges = (text.match(/\b(may|might|can|typically|usually|often|in most cases|for many)\b/gi) || []).length;
  const absolutes = (text.match(/\b(always|never|guaranteed|100%|completely|totally|everyone|no one)\b/gi) || []).length;

  const dimensions = [
    { label: 'Clarity', score: clamp(round(100 - Math.max(0, readability.avgSentenceLength - 18) * 3 - readability.jargon.length * 2)), note: `Average sentence ${readability.avgSentenceLength} words; ${readability.jargon.length} complex terms.` },
    {
      label: 'Accuracy signals',
      score: clamp(round(45 + sourced * 10 + Math.min(15, hedges) - absolutes * 6)),
      note: `${sourced} sourced statements, ${absolutes} absolute claims ("always", "guaranteed"…), ${hedges} appropriate qualifiers.`,
    },
    {
      label: 'Usefulness',
      score: clamp(round(human.checks.find((c) => c.id === 'practical')!.status === 'pass' ? 85 : human.checks.find((c) => c.id === 'practical')!.status === 'warn' ? 60 : 35) + (CTA_RE.test(text) ? 5 : 0) + seo.coveredSubtopics.length * 1.5),
      note: 'Based on practical detail (steps, durations, prices) and subtopic coverage.',
    },
    { label: 'Specificity', score: human.originalityScore, note: 'Numbers, names, examples and first-hand detail relative to length.' },
    { label: 'Originality', score: clamp(round(100 - ai.metrics.clichePer1000 * 5 - seo.duplicateSections.length * 10)), note: `${ai.metrics.clichePer1000} stock phrases per 1,000 words.` },
    { label: 'Readability', score: readability.score, note: `Flesch reading ease ${readability.fleschEase} (${readability.difficulty}).` },
    {
      label: 'Flow',
      score: clamp(round(100 - Math.abs(ai.metrics.transitionRate - 6) * 2.5 - (ai.signals.find((s) => s.id === 'openers')?.strength ?? 0) * 30)),
      note: `${ai.metrics.transitionRate}% of sentences open with a formal transition.`,
    },
    { label: 'Grammar & spelling', score: clamp(100 - grammar.length * 8), note: `${grammar.length} potential issue(s) found by rule-based checks.` },
    { label: 'Sentence length', score: clamp(round(100 - Math.max(0, readability.avgSentenceLength - 20) * 5 - readability.complexSentences * 2)), note: `${readability.complexSentences} complex sentences (25+ words or 4+ commas).` },
    { label: 'Paragraph length', score: clamp(round(100 - readability.longParagraphs * 12 - Math.max(0, readability.avgParagraphWords - 80))), note: `Average ${readability.avgParagraphWords} words; ${readability.longParagraphs} paragraph(s) over 120 words.` },
    { label: 'Redundancy', score: clamp(100 - redundancy.length * 12), note: `${redundancy.length} redundancy issue(s).` },
    { label: 'Filler content', score: clamp(round(100 - Math.max(0, fillerPer1000 - 5) * 4)), note: `${fillerTotal} filler words/phrases (${round(fillerPer1000, 1)} per 1,000 words).` },
  ];

  const score = clamp(round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length));
  return { score, dimensions, grammar: grammar.slice(0, 20), redundancy, filler };
}

export function analyzeSpam(doc: ParsedDocument, ai: AIAnalysis, keyword: KeywordAnalysis | null, location: string, seo: SEOAnalysis): { risk: RiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  let points = 0;
  const wc = Math.max(1, doc.words.length);
  if (keyword?.stuffingRisk === 'High') {
    points += 3;
    reasons.push(`Keyword stuffing: "${keyword.keyword}" at ${keyword.density}% exact-match density.`);
  } else if (keyword?.stuffingRisk === 'Medium') {
    points += 1.5;
    reasons.push(`Keyword repetition is elevated (${keyword.density}%).`);
  }
  if (location) {
    const n = countPhrase(doc.plainText, location);
    if (n > Math.max(8, wc / 70)) {
      points += 2;
      reasons.push(`Location "${location}" repeated ${n} times, which may look like location stuffing.`);
    }
  }
  const cityList = doc.sentences.filter((s) => (s.match(/,/g) || []).length >= 6 && /\b(serving|areas?|including|near)\b/i.test(s));
  if (cityList.length) {
    points += 1.5;
    reasons.push('Long comma-separated lists of areas/keywords detected (doorway-page pattern).');
  }
  const exclam = (doc.plainText.match(/!/g) || []).length;
  if (exclam > Math.max(4, wc / 120)) {
    points += 1;
    reasons.push(`${exclam} exclamation marks: hype-style tone.`);
  }
  const caps = (doc.plainText.match(/\b[A-Z]{4,}\b/g) || []).filter((w) => !/^(FAQ|HTML|SEO|NHS|NICE|HIPAA|GDPR|USA|UK|ASAP|MRI|CQC|GMC|GDC|BAAPS|ASPS|AAOS)$/.test(w));
  if (caps.length > 3) {
    points += 1;
    reasons.push(`${caps.length} ALL-CAPS words used for emphasis.`);
  }
  const ctas = doc.sentences.filter((s) => CTA_RE.test(s)).length;
  if (ctas > Math.max(5, doc.sentences.length * 0.2)) {
    points += 1;
    reasons.push(`${ctas} CTA sentences: CTA repetition is excessive.`);
  }
  if (seo.duplicateSections.length) {
    points += 1.5;
    reasons.push(`${seo.duplicateSections.length} near-duplicate section(s).`);
  }
  if (ai.metrics.clichePer1000 > 12) {
    points += 1;
    reasons.push('Very high density of boilerplate phrasing (scaled-content pattern).');
  }
  if (wc < 200) {
    points += 1;
    reasons.push('Very short content may be treated as thin.');
  }
  if (!reasons.length) reasons.push('No significant spam or over-optimisation patterns detected.');
  return { risk: points >= 4 ? 'High' : points >= 2 ? 'Medium' : 'Low', reasons };
}
