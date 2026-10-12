// AI-likeness estimation.
// This is a linguistic heuristic, NOT an authorship detector. It combines many weak signals
// and refuses to produce a high score from any single signal.

import type { AIAnalysis, AISignal, Confidence, ParsedDocument } from '../types/analysis';
import {
  AI_CLICHES,
  GENERIC_ADJECTIVES,
  GENERIC_CONCLUSION_PATTERNS,
  GENERIC_INTRO_PATTERNS,
  TRANSITION_STARTERS,
  UNSUPPORTED_EVIDENCE_PATTERNS,
  FIRST_HAND_PATTERNS,
} from './lexicon';
import { clamp, clamp01, countPhrase, cv, round, sentenceWords, tokenize, truncate } from './text';

interface SignalDef {
  id: string;
  name: string;
  weight: number;
  compute: () => { strength: number; detail: string; examples: string[] };
}

export function analyzeAI(doc: ParsedDocument): AIAnalysis {
  const { sentences, paragraphs, plainText, words } = doc;
  const wc = words.length || 1;
  const per1000 = (n: number) => (n / wc) * 1000;

  // --- Metrics shared by several signals ---
  const sentLens = sentences.map(sentenceWords).filter((n) => n > 0);
  const sentCV = cv(sentLens);
  const paraLens = paragraphs.map((p) => tokenize(p).length).filter((n) => n >= 8);
  const paraCV = cv(paraLens);

  const transitionSentences = sentences.filter((s) => {
    const low = s.toLowerCase();
    return TRANSITION_STARTERS.some((t) => low.startsWith(`${t},`) || low.startsWith(`${t} `));
  });
  const transitionRate = sentences.length ? transitionSentences.length / sentences.length : 0;

  const clicheHits: { label: string; sentence: string }[] = [];
  for (const p of AI_CLICHES) {
    for (const s of sentences) {
      p.re.lastIndex = 0;
      if (p.re.test(s)) clicheHits.push({ label: p.label, sentence: s });
    }
  }
  const clichePer1000 = per1000(clicheHits.length);

  const signals: SignalDef[] = [
    {
      id: 'cliche',
      name: 'Predictable / stock phrasing',
      weight: 1.6,
      compute: () => {
        const uniqueLabels = [...new Set(clicheHits.map((h) => h.label))];
        return {
          strength: clamp01((clichePer1000 - 2) / 9),
          detail: clicheHits.length
            ? `${clicheHits.length} stock phrase${clicheHits.length > 1 ? 's' : ''} (${round(clichePer1000, 1)} per 1,000 words): ${uniqueLabels.slice(0, 6).map((l) => `"${l}"`).join(', ')}.`
            : 'No common stock phrases detected.',
          examples: dedupe(clicheHits.map((h) => h.sentence)).slice(0, 4),
        };
      },
    },
    {
      id: 'transitions',
      name: 'Excessive transition words',
      weight: 1.2,
      compute: () => ({
        strength: clamp01((transitionRate - 0.07) / 0.15),
        detail: `${transitionSentences.length} of ${sentences.length} sentences (${round(transitionRate * 100)}%) open with a formal transition such as "Furthermore" or "Moreover". Natural writing usually sits below ~8%.`,
        examples: transitionSentences.slice(0, 3),
      }),
    },
    {
      id: 'uniformity',
      name: 'Uniform sentence length (low burstiness)',
      weight: 1.3,
      compute: () => {
        if (sentLens.length < 6) return { strength: 0, detail: 'Too few sentences to assess variation.', examples: [] };
        return {
          strength: clamp01((0.55 - sentCV) / 0.25),
          detail: `Sentence-length variation is ${round(sentCV, 2)} (coefficient of variation). Human writing typically varies more (≈0.5–0.8); very even rhythm is a common trait of generated text.`,
          examples: [],
        };
      },
    },
    {
      id: 'symmetry',
      name: 'Excessive paragraph symmetry',
      weight: 0.9,
      compute: () => {
        if (paraLens.length < 4) return { strength: 0, detail: 'Too few paragraphs to assess symmetry.', examples: [] };
        return {
          strength: clamp01((0.45 - paraCV) / 0.3),
          detail: `Paragraph lengths vary by only ${round(paraCV, 2)} (CV). ${paraCV < 0.3 ? 'Paragraphs are built to a near-identical size and shape.' : 'Paragraph sizes vary reasonably.'}`,
          examples: [],
        };
      },
    },
    {
      id: 'openers',
      name: 'Repeated sentence patterns',
      weight: 1.0,
      compute: () => {
        const openers = new Map<string, string[]>();
        for (const s of sentences) {
          const t = tokenize(s).slice(0, 2).join(' ');
          if (!t) continue;
          openers.set(t, [...(openers.get(t) || []), s]);
        }
        const repeated = [...openers.entries()].filter(([, v]) => v.length >= 3).sort((a, b) => b[1].length - a[1].length);
        const covered = repeated.reduce((n, [, v]) => n + v.length, 0);
        const rate = sentences.length ? covered / sentences.length : 0;
        return {
          strength: clamp01((rate - 0.12) / 0.3),
          detail: repeated.length
            ? `${repeated.length} sentence opening${repeated.length > 1 ? 's are' : ' is'} reused 3+ times: ${repeated.slice(0, 4).map(([k, v]) => `"${k}…" (×${v.length})`).join(', ')}.`
            : 'Sentence openings are varied.',
          examples: repeated.slice(0, 2).flatMap(([, v]) => v.slice(0, 2)),
        };
      },
    },
    {
      id: 'intro',
      name: 'Generic introduction',
      weight: 0.9,
      compute: () => {
        const intro = paragraphs[0] || '';
        const hit = GENERIC_INTRO_PATTERNS.find((re) => re.test(intro));
        return {
          strength: hit ? 1 : 0,
          detail: hit ? 'The opening paragraph uses a templated hook rather than answering the reader’s question or stating something specific.' : 'The introduction does not follow a common generic template.',
          examples: hit ? [truncate(intro, 220)] : [],
        };
      },
    },
    {
      id: 'conclusion',
      name: 'Generic conclusion',
      weight: 0.7,
      compute: () => {
        const tail = paragraphs.slice(-2);
        const hit = tail.find((p) => GENERIC_CONCLUSION_PATTERNS.some((re) => re.test(p)));
        return {
          strength: hit ? 1 : 0,
          detail: hit ? 'The closing paragraph summarises in generic terms instead of giving a concrete next step or final insight.' : 'No templated conclusion detected.',
          examples: hit ? [truncate(hit, 220)] : [],
        };
      },
    },
    {
      id: 'adjectives',
      name: 'Repeated generic adjectives',
      weight: 0.8,
      compute: () => {
        const counts = GENERIC_ADJECTIVES.map((a) => ({ a, n: countPhrase(plainText, a) })).filter((x) => x.n > 0);
        const total = counts.reduce((s, x) => s + x.n, 0);
        const repeated = counts.filter((x) => x.n >= 2).sort((a, b) => b.n - a.n);
        return {
          strength: clamp01((per1000(total) - 6) / 14),
          detail: total
            ? `${total} generic adjectives (${round(per1000(total), 1)} per 1,000 words)${repeated.length ? `; repeated: ${repeated.slice(0, 6).map((x) => `"${x.a}" ×${x.n}`).join(', ')}` : ''}.`
            : 'Little reliance on generic praise adjectives.',
          examples: [],
        };
      },
    },
    {
      id: 'specifics',
      name: 'Lack of specific / first-hand detail',
      weight: 1.4,
      compute: () => {
        const numbers = (plainText.match(/\b\d[\d,.]*\b/g) || []).length;
        const properNouns = sentences.reduce((n, s) => n + (s.slice(1).match(/\s[A-Z][a-z]{2,}/g) || []).length, 0);
        const firstHand = FIRST_HAND_PATTERNS.reduce((n, re) => n + (plainText.match(re) || []).length, 0);
        const specificity = ((numbers + properNouns * 0.5 + firstHand * 3) / wc) * 100;
        return {
          strength: clamp01((4 - specificity) / 4),
          detail: `Specificity index ${round(specificity, 1)} per 100 words (${numbers} numbers, ${properNouns} named entities, ${firstHand} first-hand references). ${specificity < 2 ? 'The text relies on general statements rather than concrete facts, names or experience.' : 'Reasonable level of concrete detail.'}`,
          examples: [],
        };
      },
    },
    {
      id: 'tricolon',
      name: 'Formulaic lists of three',
      weight: 0.6,
      compute: () => {
        const re = /\b[\w-]+(?: [\w-]+)?, [\w-]+(?: [\w-]+)?,? and [\w-]+/i;
        const hits = sentences.filter((s) => re.test(s));
        const rate = sentences.length ? hits.length / sentences.length : 0;
        return {
          strength: clamp01((rate - 0.12) / 0.25),
          detail: `${hits.length} sentences (${round(rate * 100)}%) use an "X, Y and Z" triplet. Heavy reliance on triplets is a predictable rhetorical pattern.`,
          examples: hits.slice(0, 2),
        };
      },
    },
    {
      id: 'unsupported',
      name: 'Generic claims without evidence',
      weight: 0.8,
      compute: () => {
        const hits = sentences.filter((s) => UNSUPPORTED_EVIDENCE_PATTERNS.some((re) => (re.lastIndex = 0, re.test(s))) && !/\b(according to|\(\d{4}\)|et al|https?:)/i.test(s));
        return {
          strength: clamp01(hits.length / 3),
          detail: hits.length ? `${hits.length} sentence${hits.length > 1 ? 's' : ''} appeal to unnamed research or experts without a citation.` : 'No vague appeals to unnamed research.',
          examples: hits.slice(0, 2),
        };
      },
    },
    {
      id: 'dashes',
      name: 'Heavy em-dash / colon cadence',
      weight: 0.3,
      compute: () => {
        const n = (plainText.match(/—|\s–\s/g) || []).length;
        return {
          strength: clamp01((per1000(n) - 4) / 8),
          detail: `${n} em dashes (${round(per1000(n), 1)} per 1,000 words). A weak signal on its own; noted only in combination with others.`,
          examples: [],
        };
      },
    },
  ];

  const computed: AISignal[] = signals.map((s) => {
    const r = s.compute();
    return { id: s.id, name: s.name, strength: round(r.strength, 2), detected: r.strength >= 0.35, detail: r.detail, examples: r.examples };
  });

  const totalWeight = signals.reduce((s, x) => s + x.weight, 0);
  const weighted = signals.reduce((s, x, i) => s + x.weight * computed[i].strength, 0) / totalWeight;
  // Spread to a 0–100 range: a text needs most signals firing to reach the top band.
  let score = clamp(round(weighted * 135));

  const detectedCount = computed.filter((s) => s.detected).length;
  // Guardrail: never label content High on a single or a couple of signals.
  if (detectedCount < 2) score = Math.min(score, 30);
  else if (detectedCount < 3) score = Math.min(score, 45);
  else if (detectedCount < 4) score = Math.min(score, 62);

  // Short texts give unreliable statistics; pull toward the middle.
  if (wc < 150) score = round(score * 0.6 + 50 * 0.4);

  const band: AIAnalysis['band'] = score <= 20 ? 'Very Low' : score <= 40 ? 'Low' : score <= 60 ? 'Moderate' : score <= 80 ? 'High' : 'Very High';

  let confidence: Confidence = 'Low';
  if (wc >= 300) confidence = 'Medium';
  if (wc >= 700 && (detectedCount >= 7 || detectedCount <= 1)) confidence = 'High';
  if (wc < 150) confidence = 'Low';

  const reasons: string[] = [];
  const top = [...computed].filter((s) => s.detected).sort((a, b) => b.strength - a.strength);
  if (top.length === 0) reasons.push('No strong AI-associated linguistic patterns were found. The text shows natural variation and/or specific detail.');
  top.slice(0, 6).forEach((s) => reasons.push(`${s.name}: ${s.detail}`));
  if (wc < 150) reasons.push(`The text is short (${wc} words), so statistical signals are unreliable and confidence is Low.`);
  reasons.push('No single phrase determines this score. It reflects how many independent patterns co-occur.');

  const examples: { text: string; signal: string }[] = [];
  for (const s of top) {
    for (const e of s.examples) {
      if (examples.length >= 10) break;
      if (!examples.some((x) => x.text === e)) examples.push({ text: e, signal: s.name });
    }
  }

  return {
    score,
    band,
    confidence,
    signals: computed,
    reasons,
    examples,
    metrics: {
      sentenceLengthVariation: round(sentCV, 2),
      paragraphSymmetry: round(paraCV, 2),
      transitionRate: round(transitionRate * 100, 1),
      clichePer1000: round(clichePer1000, 1),
    },
  };
}

function dedupe<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}
