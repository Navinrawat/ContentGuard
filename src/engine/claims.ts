// Claim detection: statements that appear to require evidence.

import type { AnalysisInput, Claim, ClaimType, ParsedDocument, RiskLevel } from '../types/analysis';
import { CLAIM_PATTERNS, SOURCE_RE, isHealthcare } from './lexicon';
import { saferVersion } from './saferWording';
import { uid } from './text';

/** "best" used in a non-promotional sense: "best time to visit", "best way to", "at best". */
export const BENIGN_BEST = /\b(best (time|way|ways|practice|practices|suited|option for you|to|if|when|for (you|your))|at best|do (your|our) best|best-before|best of luck)\b/i;

const RISK_ORDER: RiskLevel[] = ['Low', 'Medium', 'High'];
const maxRisk = (a: RiskLevel, b: RiskLevel): RiskLevel => (RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b);
const bump = (r: RiskLevel): RiskLevel => RISK_ORDER[Math.min(2, RISK_ORDER.indexOf(r) + 1)];

const EVIDENCE_NOTES: Record<ClaimType, string> = {
  'Medical claim': 'Cite clinical evidence (peer-reviewed study, guideline or regulatory approval) and match the claim to the treatment’s approved use.',
  'Statistical claim': 'Name the source, sample and date for the figure, ideally with a link.',
  'Superiority claim': 'Requires objective comparative evidence (independent ranking, award, audited data) or should be reframed.',
  'Outcome claim': 'Outcomes vary between individuals. Provide typical results with evidence and a "results vary" qualifier.',
  'Safety claim': 'Absolute safety claims cannot be substantiated. Disclose the actual risks and how they are managed.',
  Guarantee: 'Guarantees need clear terms and conditions; outcome guarantees in healthcare are generally not substantiable.',
  'Pricing claim': 'Ensure prices are current, state what is included, and avoid "cheapest" unless verified against competitors.',
  'Experience claim': 'Verify the figure from internal records and keep it up to date (add "as of [year]").',
  'Ranking claim': 'Name the awarding body or platform, the year and the category.',
};

export function analyzeClaims(doc: ParsedDocument, input: AnalysisInput): Claim[] {
  const healthcare = isHealthcare(input.industry);
  const claims: Claim[] = [];
  const seen = new Set<string>();

  for (const s of doc.sentences) {
    const types: ClaimType[] = [];
    let risk: RiskLevel = 'Low';
    let trigger = '';
    for (const p of CLAIM_PATTERNS) {
      const m = s.match(p.re);
      if (!m) continue;
      if (p.type === 'Superiority claim' && /\bbest\b/i.test(m[0]) && BENIGN_BEST.test(s)) continue;
      if (p.type === 'Medical claim' && !healthcare && !/\b(cure|cures|heal)\b/i.test(m[0])) continue;
      if (p.type === 'Pricing claim' && /\bfree\b/i.test(m[0]) && /\b(feel free|free (of|from) (pain|charge)|hands-free|free time|sugar-free|gluten-free)\b/i.test(s)) continue;
      if (!types.includes(p.type)) types.push(p.type);
      risk = maxRisk(risk, p.base);
      trigger = trigger || m[0];
    }
    if (!types.length) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const hasEvidence = SOURCE_RE.test(s) || /https?:\/\//.test(s);
    if (healthcare && types.some((t) => ['Superiority claim', 'Outcome claim', 'Medical claim'].includes(t))) risk = maxRisk(risk, 'Medium');
    if (healthcare && types.includes('Superiority claim') && /\b(doctor|dentist|surgeon|clinic|hospital|specialist)\b/i.test(s)) risk = bump(risk);
    if (types.includes('Statistical claim') && !hasEvidence) risk = maxRisk(risk, 'Medium');
    if (hasEvidence && risk !== 'High') risk = 'Low';

    const evidenceNeeded = !hasEvidence && !(types.length === 1 && types[0] === 'Pricing claim' && !/cheapest|lowest|best price/i.test(s));
    const primary = types[0];

    claims.push({
      id: uid('claim'),
      original: s,
      types,
      trigger,
      risk,
      evidenceNeeded,
      evidenceNote: hasEvidence ? 'A source appears to be referenced. Verify it supports the exact wording.' : EVIDENCE_NOTES[primary],
      suggestion: /^["“]/.test(s)
        ? 'This is quoted patient/customer wording: do not edit someone else’s words. Verify the testimonial is genuine and consented, or remove it.'
        : saferVersion(s, {
            healthcare,
            addResultsVary: types.includes('Outcome claim') || types.includes('Medical claim'),
            addSourcePlaceholder: !hasEvidence && (types.includes('Statistical claim') || types.includes('Medical claim')),
            addVerifyPlaceholder: types.includes('Experience claim') && types.length === 1,
          }),
    });
  }

  return claims.sort((a, b) => RISK_ORDER.indexOf(b.risk) - RISK_ORDER.indexOf(a.risk));
}
