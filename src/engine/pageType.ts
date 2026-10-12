// Page-type specific analysis (Blog, Service page, and the other commercial page types).

import type { AIAnalysis, AnalysisInput, Check, Claim, PageTypeAnalysis, ParsedDocument, ReadabilityAnalysis, SEOAnalysis } from '../types/analysis';
import { CONTENT_TYPE_LABELS, CREDENTIAL_RE, CTA_RE, PROMOTIONAL_TERMS, RISK_DISCLOSURE_RE, SOURCE_RE, isHealthcare } from './lexicon';
import { BENIGN_BEST } from './claims';
import { answersEarly as answersEarlyCheck, fillTemplate, inferTopic, topicCoverage } from './seo';
import { clamp, containsPhrase, round, tokenize } from './text';

const C = (id: string, label: string, status: Check['status'], detail: string): Check => ({ id, label, status, detail });
const st = (ok: boolean, partial: boolean): Check['status'] => (ok ? 'pass' : partial ? 'warn' : 'fail');

export function analyzePageType(
  doc: ParsedDocument,
  input: AnalysisInput,
  seo: SEOAnalysis,
  ai: AIAnalysis,
  readability: ReadabilityAnalysis,
  claims: Claim[],
): PageTypeAnalysis {
  const topic = inferTopic(doc, input);
  const loc = input.targetLocation.trim();
  const { covered, missing, topics } = topicCoverage(doc, input);
  const has = (id: string) => covered.some((c) => c.id === id);
  const sentencesWith = (re: RegExp) => doc.sentences.filter((s) => re.test(s));
  const wc = doc.words.length;

  // Promotional phrases (all page types; most relevant to commercial pages).
  const promotionalPhrases: PageTypeAnalysis['promotionalPhrases'] = [];
  for (const s of [...doc.sentences, ...doc.headings.map((h) => h.text)]) {
    for (const p of PROMOTIONAL_TERMS) {
      if (!p.re.test(s)) continue;
      if (p.phrase === 'Best' && (BENIGN_BEST.test(s) || /\bbest (doctor|dentist|surgeon|clinic|hospital|dermatologist|specialist)\b/i.test(s))) continue;
      if (promotionalPhrases.some((x) => x.sentence === s && x.phrase === p.phrase)) continue;
      promotionalPhrases.push({ phrase: p.phrase, sentence: s, why: p.why });
    }
  }
  const overlyPromotional = promotionalPhrases.length >= 4 || promotionalPhrases.length / Math.max(1, doc.sentences.length) > 0.12;

  const suggestedH2s = [
    ...doc.headings.filter((h) => h.type === 'h2').map((h) => h.text),
    ...missing.map((m) => fillTemplate(m.heading, topic, loc)),
  ];
  const suggestedFaqs = seo.questionOpportunities.slice(0, 8);
  const missingTopics = missing.map((m) => m.label);

  let checks: Check[] = [];
  let title = `${CONTENT_TYPE_LABELS[input.contentType]} Analysis`;

  if (input.contentType === 'blog') {
    title = 'Blog Content Analysis';
    const intro = doc.paragraphs[0] || '';
    const answersEarly = answersEarlyCheck(doc, topic, input.primaryKeyword);
    const hasConclusion = doc.headings.some((h) => /conclusion|summary|final|takeaway|next steps|bottom line/i.test(h.text)) || doc.paragraphs.length > 3;
    const stats = sentencesWith(/\b\d{1,3}(\.\d+)?\s?%|\bstudies|research/i);
    const uncited = stats.filter((s) => !SOURCE_RE.test(s));
    const unsupported = claims.filter((c) => c.evidenceNeeded && c.risk !== 'Low');
    const fillerHeavy = ai.metrics.clichePer1000 > 7 || readability.avgParagraphWords > 110;
    checks = [
      C('intent', 'Satisfies the search intent', st(seo.searchIntent.score >= 70, seo.searchIntent.score >= 50), seo.searchIntent.notes.join(' ')),
      C('intro', 'Useful introduction', st(!ai.signals.find((s) => s.id === 'intro')?.detected && tokenize(intro).length >= 30, tokenize(intro).length >= 15), ai.signals.find((s) => s.id === 'intro')?.detected ? 'The intro opens with a generic hook instead of value.' : 'The intro is reasonably direct.'),
      C('quick', 'Answers the query quickly', st(answersEarly, false), answersEarly ? 'A direct answer appears in the first few sentences.' : 'No direct answer in the first four sentences; readers must scroll for the core answer.'),
      C('comprehensive', 'Comprehensive coverage', st(missing.length <= 1 && wc >= 1000, missing.length <= 3 && wc >= 600), `${covered.length}/${topics.length} expected subtopics, ${wc} words.`),
      C('headings', 'Logical headings', st(seo.headingIssues.length === 0 && doc.headings.length >= 3, doc.headings.length >= 2), `${doc.headings.length} headings, ${seo.headingIssues.length} issue(s).`),
      C('questions', 'Important questions answered', st(seo.questionOpportunities.length <= 2, seo.questionOpportunities.length <= 5), `${seo.questionOpportunities.length} common questions not yet addressed.`),
      C('practical', 'Practical value', st(has('tips') || has('how'), has('examples')), has('tips') || has('how') ? 'Includes how-to / tips content.' : 'Lacks practical steps or tips.'),
      C('original', 'Original insights', st(ai.score < 40, ai.score < 60), ai.score >= 60 ? 'Content follows predictable patterns with few original observations.' : 'Some distinctive content present.'),
      C('unsupported', 'No unsupported claims', st(unsupported.length === 0, unsupported.length <= 2), `${unsupported.length} claim(s) need evidence.`),
      C('citations', 'Statistics / citations', st(uncited.length === 0 && stats.length > 0, uncited.length === 0), stats.length ? `${stats.length} data points, ${uncited.length} uncited.` : 'No statistics or citations. Consider adding authoritative data.'),
      C('faq', 'Suitable FAQ section', st(has('faq'), false), has('faq') ? 'FAQ present.' : 'No FAQ section.'),
      C('conclusion', 'Suitable conclusion', st(hasConclusion && !ai.signals.find((s) => s.id === 'conclusion')?.detected, hasConclusion), ai.signals.find((s) => s.id === 'conclusion')?.detected ? 'Conclusion is a generic summary. End with a takeaway or next step.' : 'Has a closing section.'),
      C('verbose', 'Not unnecessarily verbose', st(!fillerHeavy, ai.metrics.clichePer1000 <= 10), fillerHeavy ? 'Wordy sections and stock phrases could be cut.' : 'Concise enough.'),
    ];
  } else if (input.contentType === 'service') {
    title = 'Service Page Analysis';
    const hc = isHealthcare(input.industry);
    const hasCredentials = CREDENTIAL_RE.test(doc.plainText);
    const ctas = sentencesWith(CTA_RE);
    checks = [
      C('explains', 'Clearly explains the service', st(has('overview'), doc.sentences.length > 5), has('overview') ? 'The service is defined.' : 'The page never plainly defines what the service involves.'),
      C('for-whom', 'Who the service is for', st(has('audience'), false), has('audience') ? 'Suitability/candidate information present.' : 'Does not explain who the service is (and is not) suitable for.'),
      C('benefits', 'Benefits', st(has('benefits'), false), has('benefits') ? 'Benefits covered.' : 'Benefits are not clearly stated.'),
      C('process', 'Procedure / process', st(has('process'), false), has('process') ? 'Process described.' : 'No step-by-step explanation of what happens.'),
      C('eligibility', 'Eligibility', st(has('audience') && /\b(not suitable|eligib|criteria|assess)\b/i.test(doc.plainText), has('audience')), 'Eligibility / assessment criteria.'),
      C('risks', 'Risks / limitations', st(has('risks'), RISK_DISCLOSURE_RE.test(doc.plainText)), has('risks') ? 'Risks discussed.' : hc ? 'No balanced discussion of risks. Important for patient trust and compliance.' : 'Limitations not discussed.'),
      hc || has('recovery')
        ? C('recovery', 'Recovery / timeframe', st(has('recovery'), false), has('recovery') ? 'Recovery/timeline covered.' : 'No recovery or results timeline.')
        : C('recovery', 'Recovery / timeframe', 'na', 'Not typically relevant for this industry.'),
      C('pricing', 'Pricing information', st(has('pricing'), false), has('pricing') ? 'Pricing information present.' : 'No pricing guidance. Even "from" prices or factors affecting cost help users decide.'),
      C('faq', 'FAQs', st(has('faq'), false), has('faq') ? 'FAQ present.' : 'No FAQ section.'),
      C('trust', 'Trust signals', st(has('trust'), hasCredentials), has('trust') ? 'Trust content present.' : 'Few trust signals (accreditations, experience, reviews with context).'),
      C('credentials', hc ? 'Doctor / practitioner credentials' : 'Company credentials', st(hasCredentials, has('trust')), hasCredentials ? 'Credentials mentioned.' : 'No named practitioner or qualifications.'),
      loc
        ? C('location', 'Location relevance', st(containsPhrase(doc.plainText, loc) && doc.headings.some((h) => containsPhrase(h.text, loc)), containsPhrase(doc.plainText, loc)), `Location "${loc}" ${containsPhrase(doc.plainText, loc) ? 'is' : 'is not'} referenced.`)
        : C('location', 'Location relevance', 'na', 'No target location provided.'),
      C('cta', 'CTA quality', st(ctas.length >= 2 && ctas.length <= 6, ctas.length >= 1), ctas.length ? `${ctas.length} CTA(s), e.g. "${ctas[0].slice(0, 80)}"` : 'No call to action.'),
      C('conversion', 'Conversion intent', st(seo.searchIntent.score >= 70, seo.searchIntent.score >= 50), seo.searchIntent.notes.join(' ')),
      C('local', 'Local SEO', seo.checks.find((c) => c.id === 'local')!.status, seo.checks.find((c) => c.id === 'local')!.detail),
      C('eeat', 'E-E-A-T support', st(hasCredentials && SOURCE_RE.test(doc.plainText), hasCredentials || SOURCE_RE.test(doc.plainText)), 'Credentials and evidence for key claims.'),
      C('promo', 'Not overly promotional', st(promotionalPhrases.length === 0, !overlyPromotional), `${promotionalPhrases.length} promotional phrase(s) flagged.`),
    ];
  } else {
    // Landing, location, product, homepage, about, other: template coverage + CTA + promo tone.
    const ctas = sentencesWith(CTA_RE);
    checks = topics.map((t) => C(t.id, t.label, has(t.id) ? 'pass' : 'fail', has(t.id) ? 'Covered.' : 'Not covered.'));
    if (input.contentType !== 'about') checks.push(C('cta-count', 'CTA quality', st(ctas.length >= 2 && ctas.length <= 6, ctas.length >= 1), `${ctas.length} CTA sentence(s).`));
    checks.push(C('promo', 'Not overly promotional', st(promotionalPhrases.length === 0, !overlyPromotional), `${promotionalPhrases.length} promotional phrase(s) flagged.`));
    if (loc) checks.push(C('local', 'Location relevance', seo.checks.find((c) => c.id === 'local')!.status, seo.checks.find((c) => c.id === 'local')!.detail));
  }

  const pts = checks.filter((c) => c.status !== 'na');
  const score = clamp(round((pts.reduce((s, c) => s + (c.status === 'pass' ? 1 : c.status === 'warn' ? 0.5 : 0), 0) / Math.max(1, pts.length)) * 100));

  return {
    kind: input.contentType,
    title,
    score,
    checks,
    missingTopics,
    suggestedH2s: [...new Set(suggestedH2s)].slice(0, 12),
    suggestedFaqs,
    snippetOpportunities: seo.snippetOpportunities,
    promotionalPhrases,
    overlyPromotional,
  };
}
