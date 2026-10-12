// Builds the master issue list that powers the action plan (Must / Should / Consider / Good).

import type { AnalysisReport, Issue, Severity } from '../types/analysis';
import { CONTENT_TYPE_LABELS, isHealthcare } from './lexicon';
import { truncate, uid } from './text';

type Draft = Omit<AnalysisReport, 'issues' | 'scores' | 'id' | 'createdAt' | 'engine'>;

export function buildIssues(r: Draft): Issue[] {
  const issues: Issue[] = [];
  const push = (i: Omit<Issue, 'id'>) => issues.push({ id: uid('iss'), ...i });
  const hc = isHealthcare(r.input.industry);
  const typeLabel = CONTENT_TYPE_LABELS[r.input.contentType];

  // ---- Compliance ----
  for (const f of r.compliance.flags) {
    push({
      category: 'compliance',
      severity: f.risk === 'High' ? 'must' : f.risk === 'Medium' ? 'should' : 'consider',
      title: `${r.compliance.mode === 'healthcare' ? 'Potential compliance risk' : 'Advertising claim risk'}: ${f.issue}`,
      original: f.original,
      problem: `Triggered by "${f.trigger}". ${f.risk === 'High' ? 'High-risk promotional wording.' : 'Requires verification.'}`,
      explanation: f.explanation,
      suggestion: 'Review against applicable advertising rules; qualify, substantiate or remove the wording.',
      rewrite: f.saferVersion,
    });
  }

  // ---- Claims (skip sentences already raised by compliance) ----
  const flagged = new Set(r.compliance.flags.map((f) => f.original));
  for (const c of r.claims) {
    if (flagged.has(c.original) || !c.evidenceNeeded) continue;
    push({
      category: 'claims',
      severity: c.risk === 'High' ? 'must' : c.risk === 'Medium' ? 'should' : 'consider',
      title: `${c.types.join(' + ')} needs evidence`,
      original: c.original,
      problem: `Contains "${c.trigger}" with no supporting source.`,
      explanation: c.evidenceNote,
      suggestion: 'Add verifiable evidence (source, date, scope) or reword as a qualified statement. Do not invent figures.',
      rewrite: c.suggestion,
    });
  }

  // ---- SEO checks ----
  const SEO_SEVERITY: Record<string, Severity> = {
    h1: 'must',
    'kw-stuffing': 'must',
    thin: 'must',
    duplicate: 'must',
    intent: 'should',
    'kw-placement': 'should',
    'kw-usage': 'should',
    coverage: 'should',
    completeness: 'should',
    conversion: 'should',
    citations: 'should',
    local: 'should',
    intro: 'should',
    headings: 'should',
    h2h3: 'consider',
    faq: 'consider',
    snippet: 'consider',
    paa: 'consider',
    'internal-links': 'consider',
    semantic: 'consider',
    entities: 'consider',
    natural: 'should',
    conclusion: 'consider',
    depth: 'should',
    subtopics: 'should',
  };
  const SEO_WHY: Record<string, string> = {
    h1: 'A single descriptive H1 tells users and search engines what the page is about.',
    'kw-stuffing': 'Over-repetition degrades readability and can be treated as spam by search engines.',
    thin: 'Thin pages rarely satisfy the query and struggle to rank against more complete competitors.',
    duplicate: 'Repeated sections add length without value and signal low-effort content.',
    intent: 'Pages that do not match what searchers want rarely rank, however well optimised.',
    'kw-placement': 'Prominent placement (H1, intro) confirms relevance without needing repetition.',
    'kw-usage': 'The page should clearly be about the target topic.',
    coverage: 'Comprehensive coverage of the subtopics users expect improves usefulness and topical relevance.',
    completeness: 'Missing subtopics leave user questions unanswered and send them to competitors.',
    conversion: 'Commercial pages need a clear, low-friction next step.',
    citations: 'Uncited data undermines trust and E-E-A-T, especially on YMYL topics.',
    local: 'Local relevance helps the page rank and convert for location-based searches.',
    intro: 'The introduction decides whether readers stay; it should deliver value immediately.',
    headings: 'Clear headings aid scanning, accessibility and passage-level ranking.',
    h2h3: 'Subheadings break up content and map to the questions users ask.',
    faq: 'FAQs capture long-tail queries and address objections.',
    snippet: 'Structured, direct answers can win featured snippets.',
    paa: 'Question headings align with "People Also Ask" results.',
    'internal-links': 'Internal links distribute authority and help users navigate to related pages.',
    semantic: 'Related terms help search engines understand topical depth.',
    entities: 'Concrete entities (people, places, products) add specificity and context.',
    natural: 'Natural variation reads better and reflects how people actually search.',
    conclusion: 'A strong ending gives the reader a next step.',
    depth: 'Depth should match the complexity of the topic and competing pages.',
    subtopics: 'Each missing subtopic is a question the page leaves unanswered.',
  };
  for (const c of r.seo.checks) {
    if (c.status === 'na') continue;
    if (c.status === 'pass') {
      push({ category: 'seo', severity: 'good', title: `${c.label}`, location: 'SEO', problem: 'No issue found.', explanation: c.detail, suggestion: 'Keep as is.' });
      continue;
    }
    let sev = SEO_SEVERITY[c.id] || 'consider';
    if (c.status === 'warn' && sev === 'must') sev = 'should';
    else if (c.status === 'warn' && sev === 'should') sev = 'consider';
    push({
      category: 'seo',
      severity: sev,
      title: `${c.label}${c.status === 'fail' ? ' failing' : ' needs work'}`,
      location: 'SEO',
      problem: c.detail,
      explanation: SEO_WHY[c.id] || 'Affects search visibility and user satisfaction.',
      suggestion: seoAction(c.id, r),
    });
  }

  for (const h of r.seo.headingIssues.slice(0, 5)) {
    push({ category: 'structure', severity: 'consider', title: 'Heading issue', original: h.text, location: 'Headings', problem: h.problem, explanation: 'Heading clarity affects scanning, accessibility and how search engines understand sections.', suggestion: 'Rewrite the heading to describe the section specifically.' });
  }

  // ---- AI-likeness (framed as content-quality diagnostic) ----
  if (r.ai.score > 60) {
    const top = r.ai.signals.filter((s) => s.detected).sort((a, b) => b.strength - a.strength).slice(0, 3);
    push({
      category: 'ai',
      severity: 'should',
      title: `AI-likeness ${r.ai.band} (${r.ai.score}%): generic writing patterns`,
      original: r.ai.examples[0]?.text,
      location: 'Whole document',
      problem: `Signals: ${top.map((s) => s.name.toLowerCase()).join('; ')}.`,
      explanation: 'This is an estimate, not proof of authorship. Content that reads as templated tends to be less helpful and less differentiated, which matters for users and for search quality systems regardless of who wrote it.',
      suggestion: 'Add first-hand experience, concrete examples and specific details; vary sentence rhythm; remove stock phrases and formal transitions.',
    });
  } else if (r.ai.score > 40) {
    push({ category: 'ai', severity: 'consider', title: `AI-likeness ${r.ai.band} (${r.ai.score}%)`, location: 'Whole document', problem: 'Some predictable phrasing patterns.', explanation: 'An estimated linguistic signal, not proof of AI authorship.', suggestion: 'Edit the flagged examples in the AI Detection tab for a more natural voice.' });
  } else {
    push({ category: 'ai', severity: 'good', title: `AI-likeness ${r.ai.band} (${r.ai.score}%)`, location: 'Whole document', problem: 'No strong generic-writing patterns.', explanation: 'The text shows natural variation and/or specific detail.', suggestion: 'Keep as is.' });
  }
  const clicheSignal = r.ai.signals.find((s) => s.id === 'cliche');
  if (clicheSignal?.detected) {
    for (const ex of clicheSignal.examples.slice(0, 3)) {
      push({ category: 'ai', severity: 'consider', title: 'Stock phrase', original: ex, problem: 'Uses predictable, generic phrasing.', explanation: 'Stock phrases add words without information and make copy feel interchangeable with competitors.', suggestion: 'Replace with a specific fact, example or direct statement.' });
    }
  }
  const introSignal = r.ai.signals.find((s) => s.id === 'intro');
  if (introSignal?.detected) {
    push({ category: 'ai', severity: 'should', title: 'Generic introduction', original: introSignal.examples[0], location: 'Introduction', problem: 'Opens with a templated hook.', explanation: 'Users decide within seconds whether a page answers their question. A generic opening wastes that moment.', suggestion: `Lead with the direct answer or the most specific, useful fact about ${r.keyword?.keyword || 'the topic'}.` });
  }

  // ---- Human writing ----
  for (const c of r.human.checks) {
    if (c.status === 'fail' && ['first-hand', 'examples', 'details', 'insight'].includes(c.id)) {
      push({ category: 'human', severity: c.id === 'first-hand' && r.eeat.isYMYL ? 'should' : 'consider', title: `Missing: ${c.label.toLowerCase()}`, location: 'Whole document', problem: c.detail, explanation: 'Experience and specificity are what distinguish helpful content from generic summaries.', suggestion: humanAction(c.id, hc) });
    }
  }

  // ---- Readability ----
  if (r.readability.score < 60) {
    push({ category: 'readability', severity: r.readability.score < 40 ? 'should' : 'consider', title: `Readability: ${r.readability.difficulty}`, location: 'Whole document', problem: `Flesch ${r.readability.fleschEase}, grade ${r.readability.gradeLevel}, average sentence ${r.readability.avgSentenceLength} words.`, explanation: hc ? 'Patient-facing health information should be understandable by a broad audience.' : 'Harder text loses readers and reduces conversions.', suggestion: 'Shorten sentences (aim for ~15–20 words on average), split long paragraphs and replace jargon.' });
  }
  r.readability.hardest.slice(0, 3).forEach((h) =>
    push({ category: 'readability', severity: 'consider', title: 'Hard-to-read sentence', original: h.original, problem: h.reason, explanation: 'Long, dense sentences increase cognitive load.', suggestion: 'Split and simplify.', rewrite: h.suggestion }),
  );

  // ---- E-E-A-T ----
  for (const s of r.eeat.signals) {
    if (s.found) continue;
    const critical = r.eeat.isYMYL && ['author', 'credentials', 'reviewer', 'registration', 'risks'].includes(s.id);
    push({
      category: 'eeat',
      severity: critical ? 'should' : 'consider',
      title: `E-E-A-T: missing ${s.label.toLowerCase()}`,
      location: s.pillar.charAt(0).toUpperCase() + s.pillar.slice(1),
      problem: `No ${s.label.toLowerCase()} detected in the content.`,
      explanation: r.eeat.isYMYL ? 'This is a YMYL topic; users and search quality guidelines expect clear evidence of who is responsible and qualified.' : 'Trust signals help users judge the reliability of the content.',
      suggestion: s.recommendation,
    });
  }

  // ---- Page type ----
  for (const c of r.pageType.checks) {
    if (c.status !== 'fail') continue;
    if (issues.some((i) => i.title.toLowerCase().includes(c.label.toLowerCase()))) continue;
    push({ category: 'page-type', severity: ['risks', 'cta', 'explains', 'quick', 'intent'].includes(c.id) ? 'should' : 'consider', title: `${typeLabel}: ${c.label}`, location: r.pageType.title, problem: c.detail, explanation: `Expected on a well-structured ${typeLabel.toLowerCase()}.`, suggestion: pageTypeAction(c.id, r) });
  }
  for (const p of r.pageType.promotionalPhrases) {
    if (flagged.has(p.sentence) || r.claims.some((c) => c.original === p.sentence)) continue;
    push({ category: 'page-type', severity: 'consider', title: `Promotional wording: "${p.phrase}"`, original: p.sentence, problem: 'Flagged, not removed automatically.', explanation: p.why, suggestion: 'Provide evidence or qualify the statement.' });
  }

  // ---- Spam ----
  if (r.spam.risk !== 'Low') {
    push({ category: 'spam', severity: r.spam.risk === 'High' ? 'must' : 'should', title: `Spam / over-optimisation risk: ${r.spam.risk}`, location: 'Whole document', problem: r.spam.reasons.join(' '), explanation: 'Over-optimisation patterns can trigger spam policies and erode user trust.', suggestion: 'Reduce repetition, remove keyword/location lists and focus on unique helpful content.' });
  }

  // ---- Quality ----
  for (const g of r.quality.grammar.slice(0, 6)) {
    push({ category: 'quality', severity: 'consider', title: g.issue, original: g.original, problem: g.issue, explanation: 'Errors reduce perceived professionalism and trust.', suggestion: 'Correct the error.', rewrite: g.fix });
  }
  for (const red of r.quality.redundancy.slice(0, 3)) {
    push({ category: 'quality', severity: 'consider', title: 'Redundancy', problem: red, explanation: 'Redundant content adds length without value.', suggestion: 'Remove or merge the repeated content.' });
  }

  // ---- Positive notes ----
  if (r.compliance.flags.length === 0) push({ category: 'compliance', severity: 'good', title: 'No compliance-risk wording detected', problem: 'None.', explanation: r.compliance.notes[0], suggestion: 'Keep as is; still verify factual claims.' });
  if (r.eeat.overall >= 70) push({ category: 'eeat', severity: 'good', title: `Strong E-E-A-T signals (${r.eeat.overall}/100)`, problem: 'None.', explanation: 'Author, credential and trust signals are present.', suggestion: 'Keep as is.' });
  if (r.readability.score >= 75) push({ category: 'readability', severity: 'good', title: `Readable copy (${r.readability.difficulty})`, problem: 'None.', explanation: `Flesch ${r.readability.fleschEase}.`, suggestion: 'Keep as is.' });

  const order: Severity[] = ['must', 'should', 'consider', 'good'];
  return issues.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
}

function seoAction(id: string, r: Draft): string {
  const kw = r.keyword?.keyword || 'the main topic';
  switch (id) {
    case 'h1':
      return `Use one H1, e.g. "${r.rewrites.h1.replace(/ \(current.*$/, '')}".`;
    case 'kw-stuffing':
    case 'natural':
      return `Cut exact-match repetitions of "${kw}". Use pronouns, synonyms and related terms (${r.keyword?.relatedMissing.slice(0, 3).join(', ') || 'related entities'}).`;
    case 'kw-placement':
      return `Mention "${kw}" naturally in the H1 and first 100 words, and in one relevant H2.`;
    case 'kw-usage':
      return `Make "${kw}" explicit in key places; do not force repetitions.`;
    case 'intent':
      return r.seo.searchIntent.notes.join(' ');
    case 'coverage':
    case 'completeness':
    case 'subtopics':
      return `Add sections for: ${r.seo.missingSubtopics.join(', ')}.`;
    case 'conversion':
      return r.rewrites.cta ? `Add a clear CTA, e.g. "${truncate(r.rewrites.cta, 140)}"` : 'Add a clear next step.';
    case 'citations':
      return 'Cite authoritative sources for statistics and key facts (see External Sources).';
    case 'local':
      return `Reference ${r.input.targetLocation} in the H1/title, intro and a heading; add local details (areas served, directions, parking). Avoid listing towns.`;
    case 'intro':
      return 'Rewrite the first paragraph to answer the main question in 1–2 sentences, then preview what the page covers.';
    case 'headings':
    case 'h2h3':
      return `Use the suggested H2 structure: ${r.rewrites.h2Structure.slice(0, 4).map((h) => h.replace(/\s+[✓+].*$/, '')).join(' · ')}…`;
    case 'faq':
    case 'paa':
      return `Add an FAQ answering: ${r.seo.questionOpportunities.slice(0, 3).join(' ')}`;
    case 'snippet':
      return r.seo.snippetOpportunities[0] || 'Add a concise definition and a numbered list.';
    case 'internal-links':
      return `Add 3–5 contextual internal links, e.g. ${r.rewrites.internalLinks.slice(0, 2).map((l) => `"${l.anchor}"`).join(', ')}.`;
    case 'semantic':
    case 'entities':
      return `Naturally cover related terms: ${r.seo.entitiesMissing.slice(0, 5).join(', ')}.`;
    case 'depth':
    case 'thin':
      return 'Expand with genuinely useful sections (process, costs, FAQs, examples) rather than padding.';
    case 'duplicate':
      return 'Merge or rewrite near-duplicate paragraphs so each section adds new information.';
    case 'conclusion':
      return 'End with a concrete takeaway and next step.';
    default:
      return 'Review and improve this element.';
  }
}

function humanAction(id: string, hc: boolean): string {
  switch (id) {
    case 'first-hand':
      return hc ? 'Ask the clinician to add what they typically observe, e.g. "In our clinic, most patients notice… after…".' : 'Add what you have personally seen, tested or learned, with specifics.';
    case 'examples':
      return 'Add 2–3 concrete examples or mini case descriptions (anonymised and consented where needed).';
    case 'details':
      return 'Replace vague statements with numbers, names, timeframes and places.';
    case 'insight':
      return 'Add nuance: trade-offs, exceptions, common misconceptions and when the service is not the right choice.';
    default:
      return 'Improve this aspect.';
  }
}

function pageTypeAction(id: string, r: Draft): string {
  const kw = r.keyword?.keyword || 'the service';
  const map: Record<string, string> = {
    explains: `Add a 2–3 sentence plain-English explanation of what ${kw} is and involves.`,
    'for-whom': 'Explain who the service is suitable for, and who it is not suitable for.',
    benefits: 'List the realistic benefits, without guarantees.',
    process: 'Describe the process step by step (consultation → treatment → aftercare).',
    risks: 'Add a balanced section on risks, side effects and limitations.',
    recovery: 'Add a realistic recovery and results timeline.',
    pricing: 'Add "from" prices or the factors that affect cost.',
    faq: 'Add an FAQ section with 5–8 real patient/customer questions.',
    trust: 'Add accreditations, memberships, years of experience and verifiable reviews.',
    credentials: 'Name the practitioner(s) with qualifications and registration details.',
    cta: 'Add a clear CTA near the top and at the end.',
    quick: 'Answer the core question in the first 1–2 sentences.',
  };
  return map[id] || 'Add a section covering this.';
}
