// Rule-based "safer version" generator for promotional or risky sentences.
// It qualifies or neutralises wording; it never invents evidence. Placeholders in [brackets]
// mark where the writer must supply verified facts.

import { capitalizeFirst, fixArticles } from './text';

const RULES: [RegExp, string][] = [
  // Guarantees and absolutes
  [/\bguaranteed (results?|outcomes?)\b/gi, 'realistic $1 discussed with you at consultation'],
  [/\bwe guarantee (that )?/gi, 'we aim to ensure '],
  [/\bguarantees?\b/gi, 'aims to provide'],
  [/\bguaranteed\b/gi, 'expected'],
  [/\b100% (results?|success|effective)\b/gi, 'results that vary from person to person'],
  [/\b100% satisfaction\b/gi, 'a focus on patient satisfaction'],
  [/\b(100% |completely |totally |perfectly )safe for all skin types\b/gi, 'suitable for many skin types (your suitability will be assessed at consultation)'],
  [/\b(100% |completely |totally |perfectly )safe\b/gi, 'generally considered safe when performed by a qualified practitioner'],
  [/\bguaranteed cure\b/gi, 'treatment that may help'],
  [/\bcures?\b/gi, 'can help treat'],
  [/\bcured\b/gi, 'treated'],
  [/\beliminates? ([a-z ]+?) (forever|permanently|for good)\b/gi, 'can significantly reduce $1'],
  // Safety
  [/\brisk[- ]free\b/gi, 'low-risk for suitable candidates'],
  [/\bno (side[- ]effects|risks?)\b/gi, 'a low rate of $1 (which will be explained before treatment)'],
  [/\bpain[- ]?free\b|\bpainless\b/gi, 'designed to minimise discomfort'],
  [/\bno downtime\b/gi, 'minimal downtime for most people'],
  [/\bzero (risk|pain|downtime)\b/gi, 'minimal $1'],
  [/\bsafest\b/gi, 'carefully managed'],
  // Outcomes
  [/\bpermanent(ly)? results?\b/gi, 'long-lasting results for many patients'],
  [/\bpermanently\b/gi, 'for the long term in many cases'],
  [/\bpermanent\b/gi, 'long-lasting'],
  [/\binstant(ly)? results?\b|\bimmediate results?\b/gi, 'visible changes that develop over time'],
  [/\blook (\d+|ten|years) years younger\b/gi, 'look refreshed'],
  [/\bflawless\b/gi, 'smoother-looking'],
  [/\bperfect (results?|smile|skin)\b/gi, 'improved $1'],
  [/\blife[- ]?changing\b/gi, 'meaningful'],
  [/\bmiracle\b/gi, 'effective'],
  [/\brevolutionary\b/gi, 'modern'],
  // Superiority
  [/\b(the )?best (doctor|dentist|surgeon|dermatologist|clinic|hospital|specialist|practice)s?( ever)?\b/gi, 'an experienced $2'],
  [/\b(the )?best\b/gi, 'high-quality'],
  [/\b(the )?(no\.?\s?1|number one|#1)\b/gi, 'a trusted'],
  [/\b(a |the )?leading\b/gi, 'an established'],
  [/\bworld[- ]class\b/gi, 'highly qualified'],
  [/\btop[- ]rated\b/gi, '[rated X/5 on Y platform]'],
  [/\b(the )?most advanced ([a-z-]+(?: [a-z-]+)?)( available| on the market)?/gi, 'modern $2 [name the device/technique]'],
  [/\bmost trusted\b/gi, 'trusted'],
  [/\bmost experienced\b/gi, 'experienced'],
  [/\bunmatched\b|\bunparalleled\b|\bunrivall?ed\b|\bsecond to none\b/gi, 'dedicated'],
  [/\bfinest\b/gi, 'carefully selected'],
  [/\bpremier\b/gi, 'established'],
  [/\bsuperior\b/gi, 'high-quality'],
  // Urgency & inducements
  [/\b(limited[- ]time (offer|only)|hurry|act now|last chance|don'?t miss out)[!,.]?\s*/gi, ''],
  [/\bonly \d+ (slots|spots|places|appointments) (left|remaining|available)\b/gi, 'appointments are available'],
  [/\bbook (now|today) (and|to) (save|get)\b/gi, 'book a consultation to discuss'],
  [/\bends (soon|today|tonight)\b/gi, ''],
  // Unverified clinical claims
  [/\bclinically proven\b/gi, 'clinically studied [cite study]'],
  [/\bscientifically proven\b/gi, 'supported by research [cite source]'],
  [/\bproven to\b/gi, 'shown in [cite study] to'],
];

export interface SaferOptions {
  healthcare: boolean;
  addResultsVary?: boolean;
  addSourcePlaceholder?: boolean;
  addVerifyPlaceholder?: boolean;
}

export function saferVersion(sentence: string, opts: SaferOptions): string {
  let out = sentence;
  for (const [re, rep] of RULES) out = out.replace(re, rep);
  out = fixArticles(out)
    .replace(/\ban an\b/gi, 'an')
    .replace(/\ba an\b/gi, 'an')
    .replace(/\bthe an\b/gi, 'an')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/!+/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
  out = capitalizeFirst(out);
  if (!/[.?]$/.test(out)) out += '.';

  const suffixes: string[] = [];
  if (opts.addSourcePlaceholder && !/\[cite|\[source/i.test(out)) suffixes.push('[Add source]');
  if (opts.addVerifyPlaceholder) suffixes.push('[Verify figure and date]');
  if (opts.healthcare && opts.addResultsVary && !/results (may )?vary|vary from person/i.test(out)) suffixes.push('Individual results vary.');
  return suffixes.length ? `${out} ${suffixes.join(' ')}` : out;
}
