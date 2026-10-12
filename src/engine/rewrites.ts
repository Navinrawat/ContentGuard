// SEO rewrite suggestions. Never rewrites the whole page, only metadata, structure and
// individual sentences with a clear issue.

import type {
  AnalysisInput,
  Claim,
  ComplianceAnalysis,
  EEATAnalysis,
  ParsedDocument,
  ReadabilityAnalysis,
  RewriteSuggestions,
  SEOAnalysis,
  SentenceRewrite,
  PageTypeAnalysis,
} from '../types/analysis';
import { AUTHORITATIVE_SOURCES, CREDENTIAL_RE, INDUSTRY_ENTITIES, isHealthcare } from './lexicon';
import { fillTemplate, fuzzyContains, inferTopic, isQuestionKeyword, topicsFor } from './seo';
import { brandFromUrl, capitalizeFirst, titleCase, truncate } from './text';

function fit(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 10)).replace(/[,|–-]\s*$/, '').trim()}`;
}

export function buildRewrites(
  doc: ParsedDocument,
  input: AnalysisInput,
  seo: SEOAnalysis,
  readability: ReadabilityAnalysis,
  claims: Claim[],
  compliance: ComplianceAnalysis,
  eeat: EEATAnalysis,
  pageType: PageTypeAnalysis,
): RewriteSuggestions {
  const topic = inferTopic(doc, input);
  const T = titleCase(topic);
  const loc = input.targetLocation.trim();
  const brand = brandFromUrl(input.websiteUrl);
  const hc = isHealthcare(input.industry);
  const year = new Date().getFullYear();
  const inLoc = loc && !fuzzyContains(topic, loc) ? ` in ${loc}` : '';
  const suffix = brand ? ` | ${brand}` : '';
  const audience = input.targetAudience.trim();
  const credential = doc.plainText.match(CREDENTIAL_RE)?.[0];

  const question = isQuestionKeyword(topic);
  const firstSentence = doc.sentences[0] || '';
  const genericIntro = /^(in today|whether|when it comes|are you|have you ever|in the world)/i.test(firstSentence);
  let seoTitle: string;
  let meta: string;
  switch (input.contentType) {
    case 'blog': {
      const candidates = question
        ? [`${T}? An Expert Answer (${year})`, `${T}? Expert Answer`, `${T}?`]
        : [`${T}: A Practical Guide for ${titleCase(audience)}`, `${T}: A Practical Guide (${year})`, `${T}: Complete Guide`, T];
      seoTitle = candidates.find((c) => c.length <= 60 && !/for $/.test(c)) || T;
      meta =
        question && !genericIntro && firstSentence.length <= 150
          ? `${capitalizeFirst(topic.replace(/\?$/, ''))}? ${firstSentence}`
          : `Learn what ${topic} involves, ${hc ? 'who it suits, risks, recovery and costs' : 'how it works, costs and common mistakes'}, with practical tips${audience ? ` for ${audience}` : ''}.`;
      break;
    }
    case 'service':
      seoTitle = `${T}${inLoc}${suffix}`;
      meta = `${T}${inLoc}${credential ? ` with ${credential} specialists` : ''}. Understand the ${hc ? 'procedure, suitability, recovery, risks' : 'process, timelines'} and costs. Book a consultation.`;
      break;
    case 'location':
      seoTitle = `${T}${inLoc || (loc ? ` in ${loc}` : '')}${suffix}`;
      meta = `Visit our ${loc || 'local'} team for ${topic}. Find our address, opening hours, parking and services, and book an appointment online.`;
      break;
    case 'product':
      seoTitle = `${T}: Features, Specs & Price${suffix}`;
      meta = `Explore ${topic}: key features, specifications, pricing, delivery and returns. Compare options and order online.`;
      break;
    case 'landing':
      seoTitle = `${T}${inLoc}: Get Started${suffix}`;
      meta = `${T}${inLoc}. See how it works, what's included and what it costs, then get started in minutes.`;
      break;
    case 'homepage':
      seoTitle = `${brand || T}${brand ? ` | ${T}` : ''}${inLoc}`;
      meta = `${brand || 'We'} ${brand ? 'provides' : 'provide'} ${topic}${inLoc}. Explore our services, meet the team and get in touch today.`;
      break;
    case 'about':
      seoTitle = `About ${brand || 'Us'}${brand ? ` | ${T}` : ''}${inLoc}`;
      meta = `Meet the team behind ${brand || 'our practice'}: our story, qualifications, values and how we work${inLoc ? ` with clients${inLoc}` : ''}.`;
      break;
    default:
      seoTitle = `${T}${inLoc}${suffix}`;
      meta = `Everything you need to know about ${topic}${inLoc}: key details, costs and next steps.`;
  }
  seoTitle = fit(seoTitle, 60);
  meta = meta.length > 158 ? `${fit(meta, 155)}…` : meta;

  const existingH1 = doc.headings.find((h) => h.type === 'h1')?.text;
  const h1 =
    existingH1 && (!input.primaryKeyword || fuzzyContains(existingH1, input.primaryKeyword)) && existingH1.length <= 70
      ? `${existingH1} (current H1 is fine; keep it)`
      : input.contentType === 'blog'
        ? `${T}: ${hc ? 'Benefits, Risks, Recovery and Cost' : 'A Complete, Practical Guide'}`
        : `${T}${inLoc}`;

  // H2 structure: ordered by the template, reusing existing headings where they map.
  const h2Structure = topicsFor(input).map((t) => {
    const existing = doc.headings.find((h) => h.type !== 'h1' && t.terms.test(h.text));
    return existing ? `${existing.text}  ✓ (existing)` : `${fillTemplate(t.heading, topic, loc)}  + (add)`;
  });

  // Internal links: anchor phrases that already exist in the copy.
  const internalLinks: RewriteSuggestions['internalLinks'] = [];
  const entities = INDUSTRY_ENTITIES[input.industry];
  for (const e of entities) {
    const s = doc.sentences.find((x) => fuzzyContains(x, e));
    if (s && internalLinks.length < 4) internalLinks.push({ anchor: e, target: `Your dedicated page about ${e}`, reason: `Mentioned in: "${truncate(s, 80)}"` });
  }
  if (input.contentType === 'blog') internalLinks.push({ anchor: `${topic} service page`, target: `/${topic.toLowerCase().replace(/\s+/g, '-')}/`, reason: 'Pass relevance from informational content to the money page.' });
  else internalLinks.push({ anchor: `${topic} guide`, target: 'Related blog article / FAQ hub', reason: 'Support the commercial page with in-depth informational content.' });
  if (!eeat.signals.find((s) => s.id === 'about')?.found) internalLinks.push({ anchor: hc ? 'meet our clinicians' : 'meet the team', target: '/about/ or /team/', reason: 'Strengthens E-E-A-T by connecting content to real people.' });
  if (input.contentType !== 'location' && loc) internalLinks.push({ anchor: `our ${loc} location`, target: `/locations/${loc.toLowerCase().replace(/\s+/g, '-')}/`, reason: 'Connect service content with the local landing page.' });
  if (['service', 'landing', 'product', 'location', 'homepage'].includes(input.contentType)) internalLinks.push({ anchor: 'pricing', target: '/pricing/ or /fees/', reason: 'Users comparing providers look for cost information.' });

  const externalSources = AUTHORITATIVE_SOURCES[input.industry].map((s) => ({ ...s }));
  if (claims.some((c) => c.types.includes('Statistical claim') && c.evidenceNeeded))
    externalSources.unshift({ source: 'Primary source for each statistic currently used without citation', useFor: claims.filter((c) => c.types.includes('Statistical claim') && c.evidenceNeeded).map((c) => `"${truncate(c.original, 60)}"`).slice(0, 2).join('; ') });

  let cta: string | undefined;
  if (['service', 'landing', 'location', 'homepage', 'product'].includes(input.contentType)) {
    cta = hc
      ? `Book a consultation${brand ? ` with ${brand}` : ''}${inLoc}. ${credential ? `Our ${credential} team` : 'Our qualified team'} will assess whether ${topic} is suitable for you, explain the risks and expected recovery, and give you a written quote. There is no obligation to proceed.`
      : input.contentType === 'product'
        ? `Add ${topic} to your basket. Free returns within [X] days and delivery in [X] working days.`
        : `Get a free, no-obligation quote for ${topic}${inLoc}. Call [phone] or request a callback, and we usually respond within [X] hours.`;
  }

  // Only sentences with a clear issue.
  const sentenceRewrites: SentenceRewrite[] = [];
  const add = (r: SentenceRewrite) => {
    if (r.rewrite && r.rewrite !== r.original && !sentenceRewrites.some((x) => x.original === r.original)) sentenceRewrites.push(r);
  };
  compliance.flags.filter((f) => f.risk !== 'Low').forEach((f) => add({ original: f.original, issue: f.issue, rewrite: f.saferVersion }));
  claims.filter((c) => c.risk !== 'Low').forEach((c) => add({ original: c.original, issue: c.types.join(', '), rewrite: c.suggestion }));
  readability.hardest.slice(0, 3).forEach((h) => add({ original: h.original, issue: `Hard to read: ${h.reason}`, rewrite: h.suggestion }));

  return {
    seoTitle,
    metaDescription: meta,
    h1,
    h2Structure,
    missingTopics: pageType.missingTopics,
    faqs: seo.questionOpportunities.slice(0, 8),
    internalLinks,
    externalSources,
    cta,
    sentenceRewrites: sentenceRewrites.slice(0, 15),
  };
}
