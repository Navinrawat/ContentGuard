// Healthcare / advertising compliance-risk review.
// Flags potential risks for human review. It never declares content legally prohibited.

import type { AnalysisInput, ComplianceAnalysis, ComplianceFlag, ParsedDocument, RiskLevel } from '../types/analysis';
import { COMPLIANCE_PATTERNS, INDUSTRY_LABELS, TESTIMONIAL_QUOTE, isHealthcare } from './lexicon';
import { BENIGN_BEST } from './claims';
import { saferVersion } from './saferWording';
import { uid } from './text';

const GENERAL_PATTERNS = COMPLIANCE_PATTERNS.filter((p) =>
  ['Guaranteed result / outcome', 'Unrealistic outcome or safety claim', 'Promotional urgency', 'Unverified clinical claim'].includes(p.issue),
);

export function analyzeCompliance(doc: ParsedDocument, input: AnalysisInput): ComplianceAnalysis {
  const healthcare = isHealthcare(input.industry);
  const patterns = healthcare ? COMPLIANCE_PATTERNS : GENERAL_PATTERNS;
  const flags: ComplianceFlag[] = [];
  const units = [...doc.sentences, ...doc.headings.map((h) => h.text)];

  for (const s of units) {
    for (const p of patterns) {
      const m = s.match(p.re);
      if (!m) continue;
      if (/\bbest\b/i.test(m[0]) && BENIGN_BEST.test(s)) continue;
      if (flags.some((f) => f.original === s && f.issue === p.issue)) continue;
      // Downgrade risk outside regulated healthcare.
      const risk: RiskLevel = healthcare ? p.risk : p.risk === 'High' ? 'Medium' : 'Low';
      flags.push({
        id: uid('cmp'),
        original: s,
        issue: p.issue,
        trigger: m[0],
        risk,
        explanation: healthcare ? p.explanation : p.explanation.replace(/patients?/g, 'customers').replace(/medical /g, ''),
        saferVersion: saferVersion(s, { healthcare, addResultsVary: /outcome|result|cure|safety/i.test(p.issue) }),
      });
    }
  }

  if (healthcare) {
    // Quoted patient voice that reads like a testimonial.
    const quoteBlocks = doc.blocks.filter((b) => b.type === 'quote' || TESTIMONIAL_QUOTE.test(b.text));
    for (const b of quoteBlocks) {
      if (flags.some((f) => b.text.includes(f.original) && f.issue.startsWith('Patient'))) continue;
      flags.push({
        id: uid('cmp'),
        original: b.text,
        issue: 'Patient testimonial: requires verification',
        trigger: 'quoted patient statement',
        risk: 'High',
        explanation:
          'Quoted patient experiences used promotionally may be restricted in some jurisdictions. Requires verification that the testimonial is genuine, documented, consented, not AI-generated or edited to exaggerate, and does not imply guaranteed outcomes.',
        saferVersion: 'Remove, or replace with a factual, consented case description that states individual results vary. For example: "[Treatment] was used to address [concern] for a patient in their [age range]. Results vary between individuals."',
      });
    }
    // Generic, unattributed patient stories (possible fabricated / AI-generated narratives).
    const stories = doc.sentences.filter((s) => /\b(one|a) (of our )?(patients?|clients?) (named|called)\b|\b(sarah|john|emma|james|maria|priya|david) (came to us|visited|was struggling|had been)\b/i.test(s));
    for (const s of stories) {
      flags.push({
        id: uid('cmp'),
        original: s,
        issue: 'Patient story: requires verification',
        trigger: 'patient narrative',
        risk: 'Medium',
        explanation: 'Narrative patient stories must be real, consented and accurate. Fabricated or AI-generated patient stories or clinical outcomes are high-risk and may mislead patients.',
        saferVersion: 'Only publish if the case is real and documented with consent; otherwise describe the typical patient journey in general terms.',
      });
    }
  }

  const high = flags.filter((f) => f.risk === 'High').length;
  const medium = flags.filter((f) => f.risk === 'Medium').length;
  const risk: RiskLevel = high >= 2 || (high >= 1 && medium >= 2) ? 'High' : high >= 1 || medium >= 2 ? 'Medium' : 'Low';

  const notes: string[] = [];
  if (healthcare) {
    notes.push(`Healthcare compliance review applied for industry: ${INDUSTRY_LABELS[input.industry]}.`);
    notes.push('Findings are potential compliance risks that require verification against the advertising rules in your jurisdiction (e.g. ASA/CAP Code & GMC/GDC guidance in the UK, FTC & state medical boards in the US, NMC/ASCI in India). This is not legal advice.');
  } else {
    notes.push(`Healthcare-specific checks are not applied for industry "${INDUSTRY_LABELS[input.industry]}". A general advertising-claims review was run instead.`);
  }

  return { applicable: healthcare, mode: healthcare ? 'healthcare' : 'general', risk, flags, notes };
}
