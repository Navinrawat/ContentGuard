// SEO analysis: keyword usage, intent, structure, coverage, entities and opportunities.

import type {
  AIAnalysis,
  AnalysisInput,
  Check,
  HeadingIssue,
  KeywordAnalysis,
  ParsedDocument,
  RiskLevel,
  SEOAnalysis,
} from '../types/analysis';
import {
  COMMERCIAL_MODIFIERS,
  CONTENT_TYPE_TOPICS,
  CTA_RE,
  INDUSTRY_ENTITIES,
  INDUSTRY_TOPICS,
  INFORMATIONAL_MODIFIERS,
  SOURCE_RE,
  Subtopic,
  TRANSACTIONAL_MODIFIERS,
  WORD_BENCHMARKS,
  isHealthcare,
} from './lexicon';
import { clamp, containsPhrase, countPhrase, jaccard, round, shingles, titleCase, tokenize, truncate } from './text';

const STOP = new Set('a an and or the of in on at to for with by from is are be your my our you we it this that near me vs best top how what why do does did can should will much many when where who which i'.split(' '));

export const isQuestionKeyword = (kw: string) => /^(how|what|why|when|where|who|which|is|are|can|does|do|should|will)\b/i.test(kw.trim());

/** Does one of the first sentences give a direct answer (definition, or a concrete figure for a question query)? */
export function answersEarly(doc: ParsedDocument, topic: string, kw: string): boolean {
  const first = doc.sentences.slice(0, 4);
  const toks = keywordTokens(topic);
  const definition = first.some(
    (s) =>
      /\b(is|are) (a|an|the|typically|usually|generally|often|made|used)\b|\brefers to\b|\bmeans\b|\binvolves\b|\bin short\b|\bsimply put\b/i.test(s) &&
      (!kw || fuzzyContains(s, topic) || toks.some((t) => s.toLowerCase().includes(t))),
  );
  const figure = isQuestionKeyword(kw || topic) && first.slice(0, 3).some((s) => /\b\d+/.test(s));
  return definition || figure;
}

export function keywordTokens(kw: string): string[] {
  return tokenize(kw).filter((t) => !STOP.has(t));
}

/** Matches when every significant keyword token (or its simple plural/singular) occurs. */
export function fuzzyContains(text: string, kw: string): boolean {
  if (!kw.trim()) return false;
  if (containsPhrase(text, kw)) return true;
  const toks = keywordTokens(kw);
  if (!toks.length) return false;
  const words = new Set(tokenize(text).flatMap((w) => [w, w.replace(/s$/, ''), `${w}s`]));
  return toks.every((t) => words.has(t) || words.has(t.replace(/s$/, '')));
}

/** Topic used to fill templates when no primary keyword is given. */
export function inferTopic(doc: ParsedDocument, input: AnalysisInput): string {
  if (input.primaryKeyword.trim()) return input.primaryKeyword.trim();
  const h1 = doc.headings.find((h) => h.type === 'h1');
  if (h1) return h1.text.replace(/[|:–—-].*$/, '').replace(/\?$/, '').trim();
  const t = tokenize(doc.plainText).filter((w) => !STOP.has(w) && w.length > 3);
  const counts = new Map<string, number>();
  for (let i = 0; i < t.length - 1; i++) {
    const bg = `${t[i]} ${t[i + 1]}`;
    counts.set(bg, (counts.get(bg) || 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : 'this topic';
}

export function fillTemplate(tpl: string, kw: string, loc: string): string {
  return tpl
    .replace(/\{kw\}/g, titleCase(kw))
    .replace(/\{locIn\}/g, loc ? ` in ${loc}` : '')
    .replace(/\{loc\}/g, loc || 'Your Area')
    .replace(/\s+/g, ' ')
    .trim();
}

export function topicsFor(input: AnalysisInput): Subtopic[] {
  const base = CONTENT_TYPE_TOPICS[input.contentType] || CONTENT_TYPE_TOPICS.other;
  const extra = INDUSTRY_TOPICS[input.industry] || [];
  const ids = new Set(base.map((b) => b.id));
  return [...base, ...extra.filter((e) => !ids.has(e.id))];
}

export function topicCoverage(doc: ParsedDocument, input: AnalysisInput) {
  const topics = topicsFor(input);
  const covered: Subtopic[] = [];
  const missing: Subtopic[] = [];
  for (const t of topics) {
    // Topic counts as covered if a heading mentions it or at least two body sentences do.
    const inHeading = doc.headings.some((h) => t.terms.test(h.text));
    const bodyHits = doc.sentences.filter((s) => t.terms.test(s)).length;
    if (inHeading || bodyHits >= (t.id === 'cta' || t.id === 'contact' ? 1 : 2)) covered.push(t);
    else missing.push(t);
  }
  return { topics, covered, missing };
}

export function generateQuestions(input: AnalysisInput, topic: string): string[] {
  const kw = topic.toLowerCase();
  const loc = input.targetLocation;
  const inLoc = loc ? ` in ${loc}` : '';
  const hc = isHealthcare(input.industry);
  const q: string[] = [];
  if (hc) {
    q.push(
      `What is ${kw}?`,
      `How much does ${kw} cost${inLoc}?`,
      `Is ${kw} safe?`,
      `Who is a good candidate for ${kw}?`,
      `How long does ${kw} take?`,
      `What is the recovery time after ${kw}?`,
      `Does ${kw} hurt?`,
      `What are the side effects of ${kw}?`,
      `How long do ${kw} results last?`,
      `How do I prepare for ${kw}?`,
    );
  } else if (input.industry === 'travel') {
    q.push(`What is the best time to visit ${loc || kw}?`, `How many days do you need for ${kw}?`, `How much does ${kw} cost?`, `Is ${loc || kw} safe for tourists?`, `How do you get around ${loc || kw}?`, `What should I pack for ${kw}?`);
  } else if (input.industry === 'saas') {
    q.push(`What is ${kw}?`, `How much does ${kw} cost?`, `Does ${kw} offer a free trial?`, `What does ${kw} integrate with?`, `Is ${kw} secure?`, `How long does it take to set up ${kw}?`, `What are the alternatives to ${kw}?`);
  } else if (input.industry === 'real-estate') {
    q.push(`What is the average price of ${kw}${inLoc}?`, `Is ${loc || 'this area'} a good place to live?`, `How long does buying ${kw} take?`, `What are the costs of buying ${kw}?`, `What schools are near ${loc || kw}?`);
  } else if (input.industry === 'ecommerce' || input.contentType === 'product') {
    q.push(`What is ${kw} made of?`, `How much does ${kw} cost?`, `What size ${kw} should I choose?`, `How long does delivery take?`, `What is the return policy for ${kw}?`, `Does ${kw} come with a warranty?`);
  } else {
    q.push(`What is ${kw}?`, `How does ${kw} work?`, `How much does ${kw} cost${inLoc}?`, `How long does ${kw} take?`, `What are the benefits of ${kw}?`, `How do I choose a ${kw} provider${inLoc}?`, `What are the alternatives to ${kw}?`);
  }
  if (input.contentType === 'location' && loc) q.push(`Where is your ${loc} location?`, `Is there parking near your ${loc} office?`, `What are your opening hours in ${loc}?`);
  return [...new Set(q)].map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

function questionAnswered(doc: ParsedDocument, q: string): boolean {
  const qt = keywordTokens(q.replace(/^(what|how|is|who|does|do|where|why|when) /i, ''));
  return doc.headings.some((h) => {
    const ht = new Set(keywordTokens(h.text));
    const overlap = qt.filter((t) => ht.has(t)).length;
    return overlap >= Math.max(2, Math.ceil(qt.length * 0.6));
  });
}

export function detectIntent(input: AnalysisInput, topic: string) {
  const kw = input.primaryKeyword || topic;
  let detected = 'Informational';
  if (input.targetLocation && containsPhrase(kw, input.targetLocation)) detected = 'Local / Transactional';
  else if (/near me/i.test(kw)) detected = 'Local / Transactional';
  else if (TRANSACTIONAL_MODIFIERS.test(kw) && !INFORMATIONAL_MODIFIERS.test(kw)) detected = 'Transactional';
  else if (COMMERCIAL_MODIFIERS.test(kw)) detected = 'Commercial investigation';
  else if (INFORMATIONAL_MODIFIERS.test(kw)) detected = 'Informational';
  else if (!input.primaryKeyword) detected = input.contentType === 'blog' ? 'Informational' : 'Transactional';
  else detected = input.contentType === 'blog' ? 'Informational' : 'Mixed (informational + transactional)';

  const expected =
    input.contentType === 'blog'
      ? 'Informational'
      : input.contentType === 'about'
        ? 'Navigational / brand'
        : input.contentType === 'location'
          ? 'Local / Transactional'
          : input.contentType === 'product'
            ? 'Transactional'
            : 'Transactional / Commercial';
  return { detected, expected };
}

export function analyzeKeyword(doc: ParsedDocument, input: AnalysisInput): KeywordAnalysis | null {
  const kw = input.primaryKeyword.trim();
  if (!kw) return null;
  const text = doc.plainText;
  const wc = Math.max(1, doc.words.length);
  const exactCount = countPhrase(text, kw);
  const partialCount = doc.sentences.filter((s) => fuzzyContains(s, kw) && !containsPhrase(s, kw)).length;
  const kwLen = Math.max(1, tokenize(kw).length);
  const density = round(((exactCount * kwLen) / wc) * 100, 2);

  const h1 = doc.headings.find((h) => h.type === 'h1');
  const subheads = doc.headings.filter((h) => h.type !== 'h1');
  const paras = doc.paragraphs;
  const intro = paras.slice(0, 1).join(' ') + ' ' + tokenize(paras.join(' ')).slice(0, 100).join(' ');
  const faqIdx = doc.blocks.findIndex((b) => b.type.startsWith('h') && /faq|frequently asked|questions/i.test(b.text));
  const faqText = faqIdx >= 0 ? doc.blocks.slice(faqIdx).map((b) => b.text).join(' ') : '';
  const body = paras.slice(1, -1).join(' ');

  const placement = {
    title: !!h1 && fuzzyContains(h1.text, kw),
    introduction: fuzzyContains(intro, kw),
    h2: subheads.some((h) => fuzzyContains(h.text, kw)),
    body: fuzzyContains(body, kw),
    conclusion: fuzzyContains(paras.slice(-2).join(' '), kw),
    faq: faqIdx >= 0 && fuzzyContains(faqText, kw),
  };

  // Stuffing heuristics: high density, keyword in most headings, or clustered repetition.
  const headingShare = doc.headings.length ? doc.headings.filter((h) => containsPhrase(h.text, kw)).length / doc.headings.length : 0;
  let run = 0;
  let maxRun = 0;
  for (const s of doc.sentences) {
    run = containsPhrase(s, kw) ? run + 1 : 0;
    maxRun = Math.max(maxRun, run);
  }
  let stuffingRisk: RiskLevel = 'Low';
  if (density > 3.5 || (headingShare > 0.6 && doc.headings.length >= 4) || maxRun >= 4) stuffingRisk = 'High';
  else if (density > 2.2 || headingShare > 0.45 || maxRun >= 3) stuffingRisk = 'Medium';

  const totalMentions = exactCount + partialCount;
  const per300 = (totalMentions / wc) * 300;
  const naturalUsage =
    stuffingRisk !== 'Low'
      ? `Heavy: ${exactCount} exact-match uses (${density}% of words). Repetition is likely noticeable to readers. Replace some instances with natural variants, pronouns or related terms.`
      : totalMentions === 0
        ? 'Absent: the keyword (or a close variant) does not appear. Search engines and readers may not connect this page to the query.'
        : per300 < 0.5
          ? `Light: ${exactCount} exact and ${partialCount} variant mentions across ${wc} words. Consider mentioning the topic explicitly in the H1, intro and one or two subheadings.`
          : `Natural: ${exactCount} exact and ${partialCount} variant mentions across ${wc} words. Usage reads naturally. There is no fixed density target; prioritise clarity.`;

  const secondary = input.secondaryKeywords.filter(Boolean).map((k) => ({ keyword: k, count: countPhrase(text, k) + doc.sentences.filter((s) => fuzzyContains(s, k) && !containsPhrase(s, k)).length }));

  const entities = INDUSTRY_ENTITIES[input.industry];
  const relatedFound = entities.filter((e) => fuzzyContains(text, e));
  const relatedMissing = entities.filter((e) => !fuzzyContains(text, e));

  return { keyword: kw, exactCount, partialCount, density, naturalUsage, placement, stuffingRisk, secondary, relatedFound, relatedMissing };
}

export function analyzeSEO(doc: ParsedDocument, input: AnalysisInput, keyword: KeywordAnalysis | null, ai: AIAnalysis): SEOAnalysis {
  const wc = doc.words.length;
  const topic = inferTopic(doc, input);
  const kw = input.primaryKeyword.trim();
  const loc = input.targetLocation.trim();
  const h1s = doc.headings.filter((h) => h.type === 'h1');
  const h2s = doc.headings.filter((h) => h.type === 'h2');
  const h3s = doc.headings.filter((h) => h.type === 'h3');
  const intro = doc.paragraphs[0] || '';
  const introWords = tokenize(intro).length;
  const lastParas = doc.paragraphs.slice(-2).join(' ');
  const bench = WORD_BENCHMARKS[input.contentType];
  const transactionalPage = ['service', 'landing', 'location', 'product', 'homepage'].includes(input.contentType);
  const { topics, covered, missing } = topicCoverage(doc, input);
  const coverage = topics.length ? covered.length / topics.length : 1;
  const internalLinks = doc.links.filter((l) => l.internal);
  const externalLinks = doc.links.filter((l) => !l.internal);
  const statSentences = doc.sentences.filter((s) => /\b\d{1,3}(\.\d+)?\s?%|\b\d+ out of \d+|\bstudies|research (shows|suggests)/i.test(s));
  const uncitedStats = statSentences.filter((s) => !SOURCE_RE.test(s));
  const hasFaq = doc.headings.some((h) => /faq|frequently asked|questions/i.test(h.text));
  const questionHeadings = doc.headings.filter((h) => /\?$/.test(h.text));
  const ctaSentences = doc.sentences.filter((s) => CTA_RE.test(s));
  const listItems = doc.blocks.filter((b) => b.type === 'li').length;
  const definitionPresent = answersEarly(doc, topic, kw);

  // ---- Intent ----
  const { detected, expected } = detectIntent(input, topic);
  const intentNotes: string[] = [];
  let intentScore = 70;
  const informationalSignals = questionHeadings.length + (definitionPresent ? 2 : 0) + (listItems > 2 ? 1 : 0) + (hasFaq ? 1 : 0);
  const commercialSignals = ctaSentences.length + (covered.some((c) => c.id === 'pricing') ? 2 : 0) + (covered.some((c) => c.id === 'trust') ? 1 : 0);
  const intentAligned =
    (expected.startsWith('Informational') && !detected.startsWith('Transactional') && !detected.startsWith('Local')) ||
    (!expected.startsWith('Informational') && !detected.startsWith('Informational')) ||
    detected.startsWith('Mixed') ||
    expected.startsWith('Navigational');
  if (!intentAligned) {
    intentScore -= 25;
    intentNotes.push(`The keyword signals ${detected.toLowerCase()} intent, but a ${input.contentType} page usually serves ${expected.toLowerCase()} intent. Confirm the page type matches what currently ranks for this query.`);
  } else intentNotes.push(`Keyword intent (${detected}) is compatible with this page type (${expected}).`);
  if (expected.startsWith('Informational')) {
    if (definitionPresent) intentScore += 10;
    else intentNotes.push('The page does not answer the core question in the first few sentences.');
    if (informationalSignals < 2) {
      intentScore -= 10;
      intentNotes.push('Few question-led sections or structured answers for an informational query.');
    }
    if (ctaSentences.length > 4) {
      intentScore -= 8;
      intentNotes.push('Heavy sales CTAs on an informational article may not match what the searcher wants.');
    }
  } else if (transactionalPage) {
    if (ctaSentences.length === 0) {
      intentScore -= 20;
      intentNotes.push('No clear call to action: transactional searchers need an obvious next step.');
    } else intentScore += 8;
    if (commercialSignals < 3) {
      intentScore -= 8;
      intentNotes.push('Limited commercial decision support (pricing, credentials, process) for a transactional query.');
    }
  }
  if (ai.metrics.clichePer1000 > 8) intentScore -= 5;
  intentScore = clamp(round(intentScore + (coverage - 0.5) * 30));

  // ---- Headings ----
  const headingIssues: HeadingIssue[] = [];
  let prevLevel = 1;
  doc.headings.forEach((h) => {
    const level = Number(h.type[1]);
    if (level > prevLevel + 1) headingIssues.push({ text: h.text, problem: `Skips from H${prevLevel} to H${level}; keep a logical hierarchy.` });
    prevLevel = level;
    if (h.text.length > 70) headingIssues.push({ text: h.text, problem: 'Heading is long (>70 characters). Tighten it for scannability.' });
    if (/^(introduction|conclusion|overview|summary|benefits|details|more information|final thoughts)$/i.test(h.text.trim()))
      headingIssues.push({ text: h.text, problem: 'Generic heading that tells neither reader nor search engine what the section covers.' });
  });
  const seenHeadings = new Set<string>();
  doc.headings.forEach((h) => {
    const k = h.text.toLowerCase();
    if (seenHeadings.has(k)) headingIssues.push({ text: h.text, problem: 'Duplicate heading.' });
    seenHeadings.add(k);
  });
  if (doc.headings.some((h) => h.inferred)) headingIssues.push({ text: '(document)', problem: 'Headings were inferred from plain text. Confirm the real H1/H2/H3 markup on the live page.' });

  // ---- Duplicate / generic sections ----
  const duplicateSections: string[] = [];
  const sh = doc.paragraphs.map((p) => shingles(p));
  for (let i = 0; i < sh.length; i++) {
    for (let j = i + 1; j < sh.length; j++) {
      if (sh[i].size > 6 && jaccard(sh[i], sh[j]) > 0.4) duplicateSections.push(`Paragraphs ${i + 1} and ${j + 1} are highly similar: "${truncate(doc.paragraphs[j], 90)}"`);
    }
  }

  // ---- Entities ----
  const entityList = INDUSTRY_ENTITIES[input.industry];
  const entitiesFound = entityList.filter((e) => fuzzyContains(doc.plainText, e));
  const entitiesMissing = entityList.filter((e) => !fuzzyContains(doc.plainText, e));
  const namedEntities = [...new Set((doc.plainText.match(/(?<![.!?]\s)(?<!^)\b[A-Z][a-z]+(?: [A-Z][a-z]+)+\b/gm) || []).filter((e) => e.split(' ').length <= 4))].slice(0, 15);

  // ---- Questions / snippets ----
  const questions = generateQuestions(input, topic).filter((q) => !questionAnswered(doc, q));
  const snippetOpportunities: string[] = [];
  if (!definitionPresent) snippetOpportunities.push(`Definition snippet: add a 40–60 word answer directly under the H1 that starts "${titleCase(topic)} is…".`);
  if (covered.some((c) => c.id === 'process' || c.id === 'how') && listItems < 3) snippetOpportunities.push('List snippet: present the process as a numbered list (Step 1, Step 2…) under a "How it works" heading.');
  if (!covered.some((c) => c.id === 'pricing' || c.id === 'cost')) snippetOpportunities.push(`Table snippet: add a short cost table (treatment/option · typical price · what’s included)${loc ? ` for ${loc}` : ''}.`);
  else snippetOpportunities.push('Table snippet: format pricing or comparison information as an HTML table rather than prose.');
  if (questionHeadings.length < 2) snippetOpportunities.push('Question snippets: rephrase 2–3 H2s as the questions people search for, each answered in the first sentence below it.');
  doc.blocks.forEach((b, i) => {
    if (b.type.startsWith('h') && /\?$/.test(b.text)) {
      const next = doc.blocks[i + 1];
      const n = next ? tokenize(next.text).length : 0;
      if (next && n >= 25 && n <= 70) snippetOpportunities.push(`Good candidate already: "${b.text}" is followed by a ${n}-word answer.`);
    }
  });

  // ---- Checks ----
  const C = (id: string, label: string, status: Check['status'], detail: string): Check => ({ id, label, status, detail });
  const kwNA = !keyword;
  const checks: Check[] = [
    C('kw-usage', 'Primary keyword usage', kwNA ? 'na' : keyword!.exactCount + keyword!.partialCount === 0 ? 'fail' : keyword!.stuffingRisk === 'Low' ? 'pass' : 'warn', kwNA ? 'No primary keyword provided.' : keyword!.naturalUsage),
    C(
      'kw-placement',
      'Keyword placement',
      kwNA ? 'na' : keyword!.placement.title && keyword!.placement.introduction ? 'pass' : keyword!.placement.title || keyword!.placement.introduction ? 'warn' : 'fail',
      kwNA
        ? 'No primary keyword provided.'
        : `H1: ${yn(keyword!.placement.title)} · Intro: ${yn(keyword!.placement.introduction)} · Subheading: ${yn(keyword!.placement.h2)} · Conclusion: ${yn(keyword!.placement.conclusion)}`,
    ),
    C('kw-stuffing', 'Keyword stuffing', kwNA ? 'na' : keyword!.stuffingRisk === 'Low' ? 'pass' : keyword!.stuffingRisk === 'Medium' ? 'warn' : 'fail', kwNA ? 'No primary keyword provided.' : `Stuffing risk ${keyword!.stuffingRisk} (exact-match density ${keyword!.density}%).`),
    C('intent', 'Search intent alignment', intentScore >= 70 ? 'pass' : intentScore >= 50 ? 'warn' : 'fail', `Detected: ${detected}. Expected for page type: ${expected}. ${intentNotes[0] ?? ''}`),
    C('coverage', 'Topic coverage', coverage >= 0.75 ? 'pass' : coverage >= 0.5 ? 'warn' : 'fail', `${covered.length}/${topics.length} expected subtopics covered.`),
    C(
      'semantic',
      'Semantic relevance',
      entitiesFound.length >= entityList.length * 0.5 ? 'pass' : entitiesFound.length >= 2 ? 'warn' : 'fail',
      `${entitiesFound.length}/${entityList.length} related industry terms present${entitiesMissing.length ? `; missing e.g. ${entitiesMissing.slice(0, 4).join(', ')}` : ''}.`,
    ),
    C('headings', 'Heading structure', doc.headings.length >= Math.max(2, Math.floor(wc / 350)) && headingIssues.length <= 1 ? 'pass' : doc.headings.length >= 2 ? 'warn' : 'fail', `${doc.headings.length} headings for ${wc} words; ${headingIssues.length} heading issue(s).`),
    C('h1', 'H1 usage', h1s.length === 1 ? 'pass' : h1s.length === 0 ? 'fail' : 'warn', h1s.length === 1 ? `H1: "${truncate(h1s[0].text, 80)}"${h1s[0].inferred ? ' (inferred from plain text)' : ''}` : h1s.length === 0 ? 'No H1 found.' : `${h1s.length} H1s found; use exactly one.`),
    C('h2h3', 'H2/H3 structure', h2s.length >= (wc > 500 ? 3 : 2) ? 'pass' : h2s.length >= 1 ? 'warn' : 'fail', `${h2s.length} H2s and ${h3s.length} H3s.`),
    C(
      'intro',
      'Introduction',
      introWords >= 30 && introWords <= 160 && !ai.signals.find((s) => s.id === 'intro')?.detected ? 'pass' : introWords === 0 ? 'fail' : 'warn',
      introWords === 0
        ? 'No introduction paragraph.'
        : `${introWords} words. ${ai.signals.find((s) => s.id === 'intro')?.detected ? 'Opens with a generic hook; lead with the answer or the specific value instead.' : introWords > 160 ? 'Long intro; get to the point faster.' : 'Opens reasonably directly.'}`,
    ),
    C(
      'conclusion',
      'Conclusion / closing',
      CTA_RE.test(lastParas) || (input.contentType === 'blog' && lastParas.length > 0 && !ai.signals.find((s) => s.id === 'conclusion')?.detected) ? 'pass' : lastParas ? 'warn' : 'fail',
      CTA_RE.test(lastParas) ? 'Ends with a clear next step.' : ai.signals.find((s) => s.id === 'conclusion')?.detected ? 'Ends with a generic summary.' : 'Ending lacks a clear next step.',
    ),
    C('internal-links', 'Internal linking', internalLinks.length >= 3 ? 'pass' : internalLinks.length >= 1 ? 'warn' : 'fail', doc.links.length ? `${internalLinks.length} internal links found.` : 'No links detected in pasted content (paste HTML to evaluate links). See internal linking suggestions.'),
    C('citations', 'External citations', uncitedStats.length === 0 && (externalLinks.length > 0 || doc.sentences.some((s) => SOURCE_RE.test(s))) ? 'pass' : uncitedStats.length > 0 ? 'fail' : 'warn', `${externalLinks.length} external links; ${uncitedStats.length} statistic(s) without a source.`),
    C('faq', 'FAQ section', hasFaq ? 'pass' : 'warn', hasFaq ? 'FAQ section present.' : `No FAQ section. ${questions.length} relevant questions are not yet answered.`),
    C('snippet', 'Featured snippet readiness', definitionPresent && (listItems >= 3 || questionHeadings.length >= 2) ? 'pass' : definitionPresent || listItems >= 3 ? 'warn' : 'fail', `${definitionPresent ? 'Direct definition present' : 'No direct definition'}; ${listItems} list items; ${questionHeadings.length} question headings.`),
    C('paa', 'PAA / question coverage', questionHeadings.length >= 3 ? 'pass' : questionHeadings.length >= 1 ? 'warn' : 'fail', `${questionHeadings.length} question-style headings.`),
    loc
      ? C(
          'local',
          'Local SEO signals',
          countPhrase(doc.plainText, loc) >= 3 && doc.headings.some((h) => containsPhrase(h.text, loc)) ? 'pass' : countPhrase(doc.plainText, loc) >= 1 ? 'warn' : 'fail',
          `"${loc}" mentioned ${countPhrase(doc.plainText, loc)} time(s); in a heading: ${yn(doc.headings.some((h) => containsPhrase(h.text, loc)))}. ${countPhrase(doc.plainText, loc) > Math.max(8, wc / 80) ? 'Possibly over-repeated.' : ''}`,
        )
      : C('local', 'Local SEO signals', 'na', 'No target location provided.'),
    transactionalPage
      ? C('conversion', 'Conversion intent / CTA', ctaSentences.length >= 2 ? 'pass' : ctaSentences.length === 1 ? 'warn' : 'fail', `${ctaSentences.length} call-to-action sentence(s).`)
      : C('conversion', 'Conversion intent / CTA', 'na', 'Not a transactional page type.'),
    C('natural', 'Natural keyword usage', kwNA ? 'na' : keyword!.stuffingRisk === 'High' ? 'fail' : keyword!.stuffingRisk === 'Medium' || (tokenize(kw).length >= 3 && keyword!.exactCount >= 5 && keyword!.partialCount === 0) ? 'warn' : 'pass', kwNA ? 'No primary keyword provided.' : keyword!.partialCount === 0 && keyword!.exactCount > 3 ? 'Only exact-match phrasing used; mix in natural variations.' : 'Mix of exact and variant phrasing.'),
    C('depth', 'Content depth', wc >= bench.solid ? 'pass' : wc >= bench.thin ? 'warn' : 'fail', `${wc} words (typical range for this page type: ${bench.thin}–${bench.solid}+). Length is guidance; usefulness matters more.`),
    C('completeness', 'Topical completeness', missing.length === 0 ? 'pass' : missing.length <= 2 ? 'warn' : 'fail', missing.length ? `Missing: ${missing.map((m) => m.label).join(', ')}.` : 'All expected subtopics are covered.'),
    C('entities', 'Entity coverage', namedEntities.length >= 4 || entitiesFound.length >= 5 ? 'pass' : namedEntities.length >= 1 || entitiesFound.length >= 2 ? 'warn' : 'fail', namedEntities.length ? `Named entities: ${namedEntities.slice(0, 6).join(', ')}.` : 'Few named entities (people, places, products, organisations).'),
    C('subtopics', 'Missing subtopics', missing.length === 0 ? 'pass' : missing.length <= 2 ? 'warn' : 'fail', missing.length ? missing.map((m) => m.label).join(' · ') : 'None.'),
    C('duplicate', 'Duplicate / generic sections', duplicateSections.length === 0 && ai.metrics.clichePer1000 < 6 ? 'pass' : duplicateSections.length > 0 ? 'fail' : 'warn', duplicateSections.length ? `${duplicateSections.length} near-duplicate paragraph pair(s).` : ai.metrics.clichePer1000 >= 6 ? 'Sections rely on generic phrasing that could appear on any competitor page.' : 'No duplicated sections.'),
    C('thin', 'Thin content risk', wc < bench.thin * 0.6 ? 'fail' : wc < bench.thin || coverage < 0.4 ? 'warn' : 'pass', wc < bench.thin ? `Below ${bench.thin} words for a ${input.contentType} page with ${round(coverage * 100)}% topic coverage.` : `Adequate length with ${round(coverage * 100)}% topic coverage.`),
  ];

  const scored = checks.filter((c) => c.status !== 'na');
  const score = clamp(round((scored.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0) / Math.max(1, scored.length)) * 100));

  const good = checks.filter((c) => c.status === 'pass').map((c) => `${c.label}: ${c.detail}`);
  const missingList = [
    ...missing.map((m) => `Subtopic: ${m.label}`),
    ...(hasFaq ? [] : ['FAQ section answering common questions']),
    ...(definitionPresent ? [] : ['A direct, early answer / definition']),
    ...(uncitedStats.length ? ['Sources for statistics'] : []),
    ...(entitiesMissing.length ? [`Related terms: ${entitiesMissing.slice(0, 5).join(', ')}`] : []),
  ];
  const changes = checks
    .filter((c) => c.status === 'fail' || c.status === 'warn')
    .slice(0, 10)
    .map((c) => `${c.label}: ${c.detail}`);

  return {
    score,
    searchIntent: { score: intentScore, detected, expected, aligned: intentAligned, notes: intentNotes },
    checks,
    good,
    missing: missingList,
    changes,
    missingSubtopics: missing.map((m) => m.label),
    coveredSubtopics: covered.map((m) => m.label),
    entitiesFound: [...entitiesFound, ...namedEntities.filter((n) => !entitiesFound.includes(n))].slice(0, 20),
    entitiesMissing,
    headingIssues,
    questionOpportunities: questions,
    snippetOpportunities,
    duplicateSections,
  };
}

function yn(b: boolean) {
  return b ? 'Yes' : 'No';
}
