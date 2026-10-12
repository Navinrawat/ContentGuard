// E-E-A-T signal review (Experience, Expertise, Authoritativeness, Trustworthiness).

import type { AnalysisInput, ComplianceAnalysis, EEATAnalysis, EEATSignal, HumanAnalysis, ParsedDocument } from '../types/analysis';
import {
  ABOUT_RE,
  AUTHOR_RE,
  AUTHORITY_RE,
  CONTACT_RE,
  CREDENTIAL_RE,
  DATE_RE,
  DISCLAIMER_RE,
  FIRST_HAND_PATTERNS,
  REGISTRATION_RE,
  REVIEWER_RE,
  RISK_DISCLOSURE_RE,
  SOURCE_RE,
  isHealthcare,
  isYMYL,
} from './lexicon';
import { clamp, round, truncate } from './text';

function evidence(doc: ParsedDocument, re: RegExp): string | undefined {
  const r = new RegExp(re.source, re.flags.replace('g', ''));
  const s = doc.blocks.find((b) => r.test(b.text));
  return s ? truncate(s.text, 140) : undefined;
}

export function analyzeEEAT(doc: ParsedDocument, input: AnalysisInput, human: HumanAnalysis, compliance: ComplianceAnalysis): EEATAnalysis {
  const healthcare = isHealthcare(input.industry);
  const ymyl = isYMYL(input.industry);
  const text = doc.plainText;
  const external = doc.links.filter((l) => !l.internal).length;

  const sig = (
    id: string,
    label: string,
    pillar: EEATSignal['pillar'],
    re: RegExp | null,
    recommendation: string,
    override?: boolean,
  ): EEATSignal => {
    const ev = re ? evidence(doc, re) : undefined;
    return { id, label, pillar, found: override ?? !!ev, evidence: ev, recommendation };
  };

  const firstHandFound = FIRST_HAND_PATTERNS.some((re) => new RegExp(re.source, 'i').test(text));
  const yearsExp = /\b\d+\+?\s?years?\b|\bover \d[\d,]*\b|\bsince (19|20)\d{2}\b|\bthousands of\b/i;
  const evidencedClaims = doc.sentences.filter((s) => SOURCE_RE.test(s)).length;

  const signals: EEATSignal[] = [
    sig('first-hand', 'First-hand experience', 'experience', null, 'Add observations from real cases, projects or visits ("In our clinic, most patients…").', firstHandFound),
    sig('experience-figures', 'Track record / years of experience', 'experience', yearsExp, 'State verifiable experience figures (years in practice, number of procedures as of a date).'),
    sig('author', 'Named author', 'expertise', AUTHOR_RE, 'Add an author byline with name, role and a link to their bio.'),
    sig('credentials', 'Qualifications / credentials', 'expertise', CREDENTIAL_RE, 'List relevant qualifications (e.g. degrees, board certification, fellowships).'),
    sig('reviewer', ymyl ? 'Medical / expert reviewer' : 'Expert reviewer', 'expertise', REVIEWER_RE, ymyl ? 'Add "Medically reviewed by [Name, credentials]" with review date.' : 'Consider an expert review line for technical content.'),
    sig('references', 'References / sources', 'authoritativeness', SOURCE_RE, 'Cite authoritative sources for important facts and statistics.', !!evidence(doc, SOURCE_RE) || external > 0),
    sig('authority', 'Memberships, awards, affiliations', 'authoritativeness', AUTHORITY_RE, 'Mention verifiable memberships, accreditations or awards with names and years.'),
    sig('about', 'About / team information', 'authoritativeness', ABOUT_RE, 'Link to an About or Team page describing who is behind the content.'),
    sig('contact', 'Contact information', 'trustworthiness', CONTACT_RE, 'Show phone, email or address, or link clearly to the contact page.'),
    sig('date', 'Published / updated date', 'trustworthiness', DATE_RE, 'Show "Last updated [date]" (and "Reviewed on" for medical content).'),
    sig('disclaimer', healthcare ? 'Medical disclaimer / results-vary statement' : 'Disclaimers / qualifiers', 'trustworthiness', DISCLAIMER_RE, healthcare ? 'Add a "results vary" note and advise consulting a qualified professional.' : 'Qualify claims where results depend on circumstances.'),
    sig('risks', 'Balanced information (risks / limitations)', 'trustworthiness', RISK_DISCLOSURE_RE, 'Discuss risks, limitations or who the service is not suitable for.'),
  ];
  if (healthcare) {
    signals.splice(
      5,
      0,
      sig('registration', 'Medical / professional registration', 'expertise', REGISTRATION_RE, 'Show registration details (e.g. GMC/GDC number, licence number) for the practitioners named.'),
    );
  }

  const pillarScore = (pillar: EEATSignal['pillar'], base: number) => {
    const ps = signals.filter((s) => s.pillar === pillar);
    const found = ps.filter((s) => s.found).length;
    return base + ((100 - base) * found) / Math.max(1, ps.length);
  };

  const experience = clamp(round(pillarScore('experience', 10) * 0.7 + human.score * 0.3));
  const expertise = clamp(round(pillarScore('expertise', 10)));
  const authoritativeness = clamp(round(pillarScore('authoritativeness', 10) + Math.min(10, evidencedClaims * 3)));
  let trust = pillarScore('trustworthiness', 15);
  trust -= compliance.flags.filter((f) => f.risk === 'High').length * 6;
  trust -= compliance.flags.filter((f) => f.risk === 'Medium').length * 2;
  const trustworthiness = clamp(round(trust));

  // YMYL topics weigh expertise and trust more heavily.
  const overall = ymyl
    ? round(experience * 0.2 + expertise * 0.3 + authoritativeness * 0.2 + trustworthiness * 0.3)
    : round((experience + expertise + authoritativeness + trustworthiness) / 4);

  return { experience, expertise, authoritativeness, trustworthiness, overall: clamp(overall), isYMYL: ymyl, signals };
}
