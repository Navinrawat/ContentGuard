// Readability: Flesch metrics, sentence/paragraph length, passive voice, jargon, hardest sentences.

import type { AnalysisInput, HardSentence, ParsedDocument, ReadabilityAnalysis } from '../types/analysis';
import { PASSIVE_RE, WORDY_REPLACEMENTS, isHealthcare } from './lexicon';
import { capitalizeFirst, clamp, countSyllables, mean, round, sentenceWords, tokenize } from './text';

const COMMON_LONG_WORDS = new Set([
  'information',
  'experience',
  'professional',
  'appointment',
  'consultation',
  'everything',
  'everybody',
  'available',
  'especially',
  'treatment',
  'treatments',
  'procedure',
  'procedures',
  'additionally',
  'individual',
  'individuals',
  'communication',
  'community',
  'organisation',
  'organization',
  'understanding',
  'comfortable',
  'definitely',
  'immediately',
  'necessary',
  'opportunity',
  'particularly',
  'personalised',
  'personalized',
  'recommended',
  'relationship',
  'responsibility',
  'technology',
  'university',
  'unfortunately',
  'usually',
  'variety',
  'environment',
  'beautiful',
  'education',
  'generally',
  'medication',
  'medical',
  'material',
  'materials',
]);

/** -ed words that usually act as adjectives after "is/are" ("is tired", "are qualified"). */
const ADJECTIVAL_ED = new Set([
  'tired', 'interested', 'dedicated', 'committed', 'experienced', 'qualified', 'based', 'located', 'concerned', 'excited',
  'pleased', 'satisfied', 'worried', 'scared', 'bored', 'confused', 'surprised', 'prepared', 'skilled', 'licensed',
  'registered', 'certified', 'accredited', 'specialised', 'specialized', 'advanced', 'detailed', 'limited', 'required',
  'needed', 'supposed', 'used', 'related', 'involved', 'focused', 'motivated', 'determined', 'balanced', 'complicated',
]);

export function isPassive(s: string): boolean {
  const m = s.match(PASSIVE_RE);
  if (!m) return false;
  return !ADJECTIVAL_ED.has(m[3].toLowerCase());
}

export function difficultyLabel(flesch: number): string {
  if (flesch >= 80) return 'Very easy';
  if (flesch >= 70) return 'Easy';
  if (flesch >= 60) return 'Plain English';
  if (flesch >= 50) return 'Fairly difficult';
  if (flesch >= 30) return 'Difficult';
  return 'Very difficult';
}

/** Simplify a sentence: replace wordy phrases, then split at a natural clause boundary. */
export function simplifySentence(s: string): string {
  let out = s;
  for (const [re, rep] of WORDY_REPLACEMENTS) out = out.replace(re, rep);
  out = out.replace(/\s{2,}/g, ' ').trim();
  out = capitalizeFirst(out);

  const words = tokenize(out).length;
  if (words > 22) {
    const splitters = [/;\s+/, /,\s+(which|who)\s+/i, /,\s+(and|but|so|while|whereas|although)\s+/i, /\s+—\s+/, /,\s+(as|because|since)\s+/i];
    for (const sp of splitters) {
      const m = out.match(sp);
      if (m && m.index !== undefined) {
        const left = out.slice(0, m.index).trim();
        let right = out.slice(m.index + m[0].length).trim();
        if (tokenize(left).length < 6 || tokenize(right).length < 5) continue;
        const conj = (m[1] || '').toLowerCase();
        if (conj === 'which' || conj === 'who') right = `This ${right}`;
        else if (conj === 'but' || conj === 'although' || conj === 'whereas') right = `However, ${right}`;
        else if (conj === 'because' || conj === 'since' || conj === 'as') right = `This is because ${right}`;
        else if (conj === 'so') right = `As a result, ${right}`;
        return `${left.replace(/[,;]$/, '')}. ${capitalizeFirst(right)}`;
      }
    }
  }
  // Lead with the main clause when a sentence opens with a long subordinate clause.
  const sub = out.match(/^(Whether|If|When)\b([^,]{25,}),\s+(.+)$/);
  if (sub && tokenize(sub[3]).length >= 5) {
    const main = capitalizeFirst(sub[3].replace(/[.!?]$/, ''));
    return `${main}. This applies ${sub[1].toLowerCase()}${sub[2]}.`;
  }
  return out;
}

export function analyzeReadability(doc: ParsedDocument, input: AnalysisInput): ReadabilityAnalysis {
  const { sentences, paragraphs, words } = doc;
  const wc = Math.max(1, words.length);
  const sc = Math.max(1, sentences.length);
  const syllables = words.reduce((n, w) => n + countSyllables(w), 0);

  const wps = wc / sc;
  const spw = syllables / wc;
  const flesch = round(clamp(206.835 - 1.015 * wps - 84.6 * spw, 0, 100));
  const grade = round(Math.max(0, 0.39 * wps + 11.8 * spw - 15.59), 1);

  const paraWords = paragraphs.map((p) => tokenize(p).length);
  const avgPara = round(mean(paraWords));
  const longParagraphs = paraWords.filter((n) => n > 120).length;

  const passive = sentences.filter((s) => isPassive(s));
  const passivePercent = round((passive.length / sc) * 100);

  const complex = sentences.filter((s) => sentenceWords(s) > 25 || (s.match(/,/g) || []).length >= 4);

  const longWordCounts = new Map<string, number>();
  for (const w of words) {
    if (w.length > 6 && countSyllables(w) >= 4 && !COMMON_LONG_WORDS.has(w)) longWordCounts.set(w, (longWordCounts.get(w) || 0) + 1);
  }
  const jargon = [...longWordCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([w]) => w);

  const scored = sentences
    .map((s) => {
      const t = tokenize(s);
      const syl = t.reduce((n, w) => n + countSyllables(w), 0);
      const difficulty = t.length * (syl / Math.max(1, t.length)) + (s.match(/,/g) || []).length * 2 + (isPassive(s) ? 4 : 0);
      return { s, t, difficulty };
    })
    .filter((x) => x.t.length >= 14)
    .sort((a, b) => b.difficulty - a.difficulty)
    .slice(0, 5);

  const hardest: HardSentence[] = scored.map(({ s, t }) => {
    const reasons: string[] = [];
    if (t.length > 25) reasons.push(`${t.length} words long`);
    if ((s.match(/,/g) || []).length >= 3) reasons.push('multiple clauses');
    if (isPassive(s)) reasons.push('passive construction');
    const longWords = t.filter((w) => countSyllables(w) >= 4);
    if (longWords.length >= 2) reasons.push(`complex words (${longWords.slice(0, 3).join(', ')})`);
    const suggestion = simplifySentence(s);
    return {
      original: s,
      words: t.length,
      reason: reasons.length ? capitalizeFirst(reasons.join(', ')) : 'Dense phrasing',
      suggestion: suggestion === s ? 'Manual edit: split this into two sentences, leading with the main point, and replace complex words with everyday ones.' : suggestion,
    };
  });

  // Patient-facing healthcare content should be easier to read.
  const targetFlesch = isHealthcare(input.industry) ? 60 : input.contentType === 'blog' ? 55 : 50;
  let score = 100;
  score -= Math.max(0, targetFlesch - flesch) * 1.2;
  score -= Math.max(0, wps - 20) * 2.5;
  score -= longParagraphs * 4;
  score -= Math.max(0, passivePercent - 10) * 0.8;
  score -= Math.max(0, (complex.length / sc) * 100 - 15) * 0.6;
  score = clamp(round(score));

  return {
    score,
    fleschEase: flesch,
    gradeLevel: grade,
    difficulty: difficultyLabel(flesch),
    avgSentenceLength: round(wps, 1),
    avgParagraphWords: avgPara,
    longParagraphs,
    passiveCount: passive.length,
    passivePercent,
    passiveExamples: passive.slice(0, 4),
    complexSentences: complex.length,
    jargon,
    hardest,
  };
}
