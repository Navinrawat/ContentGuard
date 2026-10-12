// Phrase lists, topic templates and industry knowledge used by the heuristic engine.
// Kept separate from the logic so agencies can tune them without touching analysis code.

import type { ContentType, Industry } from '../types/analysis';

export const HEALTHCARE_INDUSTRIES: Industry[] = ['healthcare', 'dental', 'dermatology', 'cosmetic-surgery', 'orthopedic'];

export const isHealthcare = (i: Industry) => HEALTHCARE_INDUSTRIES.includes(i);

/** YMYL = "Your Money or Your Life" topics held to a higher E-E-A-T bar. */
export const isYMYL = (i: Industry) => isHealthcare(i) || i === 'real-estate';

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  blog: 'Blog',
  service: 'Service Page',
  landing: 'Landing Page',
  location: 'Location Page',
  product: 'Product Page',
  homepage: 'Homepage',
  about: 'About Page',
  other: 'Other',
};

export const INDUSTRY_LABELS: Record<Industry, string> = {
  healthcare: 'Healthcare',
  dental: 'Dental',
  dermatology: 'Dermatology',
  'cosmetic-surgery': 'Cosmetic Surgery',
  orthopedic: 'Orthopedic',
  travel: 'Travel',
  'real-estate': 'Real Estate',
  ecommerce: 'Ecommerce',
  saas: 'SaaS',
  'local-business': 'Local Business',
  other: 'Other',
};

/** Benchmarks are guidance for "thin content" risk, not targets. */
export const WORD_BENCHMARKS: Record<ContentType, { thin: number; solid: number }> = {
  blog: { thin: 600, solid: 1200 },
  service: { thin: 400, solid: 800 },
  landing: { thin: 250, solid: 500 },
  location: { thin: 300, solid: 650 },
  product: { thin: 150, solid: 350 },
  homepage: { thin: 250, solid: 500 },
  about: { thin: 200, solid: 400 },
  other: { thin: 300, solid: 600 },
};

// ---------- AI-likeness phrase signals ----------

export interface PhrasePattern {
  re: RegExp;
  label: string;
}

export const AI_CLICHES: PhrasePattern[] = [
  { re: /in today'?s (digital|fast[- ]paced|modern|ever[- ]changing|competitive) (world|age|landscape|era)/gi, label: "In today's … world" },
  { re: /it is (important|essential|crucial|worth) (to note|noting|to remember|to understand)/gi, label: 'It is important to note' },
  { re: /it'?s worth noting/gi, label: "It's worth noting" },
  { re: /\bwhether you(?:'re| are)\b/gi, label: 'Whether you are…' },
  { re: /\bwhen it comes to\b/gi, label: 'When it comes to' },
  { re: /\bin conclusion\b/gi, label: 'In conclusion' },
  { re: /\bto sum (it )?up\b|\bin summary\b/gi, label: 'In summary / To sum up' },
  { re: /\bnot only\b[^.]{1,80}\bbut also\b/gi, label: 'Not only… but also' },
  { re: /\bdelv(e|es|ing) (into|deeper)\b/gi, label: 'Delve into' },
  { re: /\bnavigat(e|ing) the (complex|complexities|world|landscape|intricacies)/gi, label: 'Navigate the complexities' },
  { re: /\ba testament to\b/gi, label: 'A testament to' },
  { re: /\bunlock(ing)? (the|your) (full )?potential\b/gi, label: 'Unlock the potential' },
  { re: /\bembark(ing)? on (a|your) journey\b/gi, label: 'Embark on a journey' },
  { re: /\bin the (realm|world) of\b/gi, label: 'In the realm of' },
  { re: /\bplays? an? (crucial|vital|pivotal|key|significant) role\b/gi, label: 'Plays a crucial role' },
  { re: /\ba wide (range|array|variety) of\b/gi, label: 'A wide range of' },
  { re: /\blook no further\b/gi, label: 'Look no further' },
  { re: /\btailored to (meet )?your (unique |specific |individual )?needs\b/gi, label: 'Tailored to your needs' },
  { re: /\bever[- ]evolving\b/gi, label: 'Ever-evolving' },
  { re: /\bholistic approach\b/gi, label: 'Holistic approach' },
  { re: /\brest assured\b/gi, label: 'Rest assured' },
  { re: /\bpeace of mind\b/gi, label: 'Peace of mind' },
  { re: /\bgame[- ]changer\b/gi, label: 'Game-changer' },
  { re: /\bseamless(ly)?\b/gi, label: 'Seamless' },
  { re: /\bharness(ing)? the power\b/gi, label: 'Harness the power' },
  { re: /\btake (it|your [a-z]+) to the next level\b/gi, label: 'Take it to the next level' },
  { re: /\bstate[- ]of[- ]the[- ]art\b/gi, label: 'State-of-the-art' },
  { re: /\bcutting[- ]edge\b/gi, label: 'Cutting-edge' },
  { re: /\bcommitted to (providing|delivering)\b/gi, label: 'Committed to providing' },
  { re: /\bdedicated to (providing|delivering|helping)\b/gi, label: 'Dedicated to providing' },
  { re: /\b(?:has|have) become increasingly\b/gi, label: 'Has become increasingly' },
  { re: /\bthe (key|secret) to\b/gi, label: 'The key to' },
  { re: /\bin this (article|guide|blog post|post),? (we|you) (will|'ll)\b/gi, label: 'In this article we will' },
  { re: /\bfirst and foremost\b/gi, label: 'First and foremost' },
  { re: /\bat the end of the day\b/gi, label: 'At the end of the day' },
  { re: /\bstands? out as\b/gi, label: 'Stands out as' },
  { re: /\bit'?s no secret that\b/gi, label: "It's no secret that" },
  { re: /\bfoster(ing)? (a|an)\b/gi, label: 'Foster a…' },
  { re: /\bstreamline\b/gi, label: 'Streamline' },
  { re: /\belevate (your|the)\b/gi, label: 'Elevate your' },
  { re: /\bmyriad of\b/gi, label: 'A myriad of' },
  { re: /\bin an era (of|where)\b/gi, label: 'In an era of' },
  { re: /\bit is (essential|crucial|vital) (to|that)\b/gi, label: 'It is essential to' },
];

export const TRANSITION_STARTERS = [
  'furthermore',
  'moreover',
  'additionally',
  'in addition',
  'consequently',
  'therefore',
  'thus',
  'hence',
  'ultimately',
  'overall',
  'in conclusion',
  'firstly',
  'secondly',
  'lastly',
  'finally',
  'notably',
  'importantly',
  'as a result',
  'on the other hand',
  'in essence',
  'that said',
  'with that in mind',
  'in summary',
];

export const GENERIC_INTRO_PATTERNS: RegExp[] = [
  /^in today'?s/i,
  /^are you (looking|searching|struggling|wondering|tired)/i,
  /^whether you/i,
  /^when it comes to/i,
  /^have you ever (wondered|thought)/i,
  /^in the (world|realm) of/i,
  /\bis one of the most (important|popular|common|significant)\b/i,
  /^(?:[a-z]+ ){0,4}(?:has|have) become (increasingly|more and more)/i,
  /^welcome to/i,
  /^if you(?:'re| are) (looking|searching|considering)/i,
  /^in an era/i,
  /^imagine /i,
];

export const GENERIC_CONCLUSION_PATTERNS: RegExp[] = [
  /^in conclusion/i,
  /^to (sum|wrap) (it )?up/i,
  /^in summary/i,
  /^ultimately/i,
  /^overall,/i,
  /^by following these/i,
  /^all in all/i,
  /\bmake an informed decision\b/i,
  /\bdon'?t hesitate to (contact|reach)/i,
  /\bthe choice is yours\b/i,
  /\bwith the right (approach|guidance|team)\b/i,
];

export const GENERIC_ADJECTIVES = [
  'comprehensive',
  'seamless',
  'innovative',
  'exceptional',
  'unparalleled',
  'personalized',
  'personalised',
  'tailored',
  'dedicated',
  'top-notch',
  'holistic',
  'robust',
  'vibrant',
  'crucial',
  'essential',
  'vital',
  'significant',
  'remarkable',
  'outstanding',
  'unique',
  'cutting-edge',
  'state-of-the-art',
  'advanced',
  'professional',
  'highest-quality',
  'high-quality',
  'compassionate',
  'trusted',
  'reliable',
  'effective',
  'optimal',
  'invaluable',
  'transformative',
];

export const UNSUPPORTED_EVIDENCE_PATTERNS: RegExp[] = [
  /\b(studies|research|experts|scientists|doctors) (show|shows|suggest|suggests|agree|have shown|indicate)\b/gi,
  /\b(it is|it's) (widely|well|commonly) (known|accepted|believed)\b/gi,
  /\bproven to\b/gi,
  /\bclinically proven\b/gi,
  /\bscientifically proven\b/gi,
];

// ---------- Human / experience signals ----------

export const FIRST_HAND_PATTERNS: RegExp[] = [
  /\bin my (experience|practice|clinic|opinion|years)\b/gi,
  /\bin our (experience|practice|clinic|studio|office|team|testing)\b/gi,
  /\bi(?:'ve| have) (seen|treated|worked|found|noticed|tested|used|performed|visited|tried|learned|learnt)\b/gi,
  /\bwe(?:'ve| have) (seen|treated|worked|found|noticed|tested|used|performed|helped|visited|tried|learned|learnt)\b/gi,
  /\b(i|we) (saw|treated|tested|found|noticed|visited|tried|learned|learnt|measured|asked|spent)\b/gi,
  /\bwhen i (first|started|visited|tried|was)\b/gi,
  /\b(last|this) (year|month|week|summer|winter|spring)\b/gi,
  /\bmost of (my|our) (patients|clients|customers|readers|guests)\b/gi,
  /\b(a|one) (patient|client|customer|guest) (of ours|recently|came|asked|told)\b/gi,
  /\bwhat (i|we) (tell|recommend to|advise) (patients|clients|customers)\b/gi,
];

export const EXAMPLE_PATTERNS: RegExp[] = [/\bfor (example|instance)\b/gi, /\be\.g\./gi, /\bsuch as\b/gi, /\bcase study\b/gi, /\bhere'?s (how|what|an example)\b/gi, /\bconsider (a|the|this)\b/gi];

export const OPINION_PATTERNS: RegExp[] = [
  /\bi (think|believe|recommend|suggest|prefer|would|wouldn't|don't)\b/gi,
  /\bwe (recommend|suggest|prefer|advise|believe|don't recommend)\b/gi,
  /\bin (my|our) (view|opinion)\b/gi,
  /\bhonestly\b/gi,
  /\bthe (truth|reality) is\b/gi,
  /\b(surprisingly|counterintuitively|unfortunately)\b/gi,
  /\b(the|a) (common|biggest) mistake\b/gi,
  /\bwhat most people (don't|do not|miss|get wrong)\b/gi,
  /\bthat said\b/gi,
];

export const PRACTICAL_PATTERNS: RegExp[] = [
  /\bstep \d\b/gi,
  /\b(how to|here'?s how)\b/gi,
  /\b(avoid|make sure|check|ask|bring|prepare|schedule|measure|compare)\b/gi,
  /\b\d+\s?(minutes?|hours?|days?|weeks?|months?|years?|mg|ml|km|miles?|sq\.? ?ft|%)\b/gi,
  /[£$€₹]\s?\d/g,
];

// ---------- Promotional / claim / compliance lexicon ----------

export interface ClaimPattern {
  re: RegExp;
  type:
    | 'Medical claim'
    | 'Statistical claim'
    | 'Superiority claim'
    | 'Outcome claim'
    | 'Safety claim'
    | 'Guarantee'
    | 'Pricing claim'
    | 'Experience claim'
    | 'Ranking claim';
  base: 'Low' | 'Medium' | 'High';
}

export const CLAIM_PATTERNS: ClaimPattern[] = [
  { re: /\b(cures?|cured|curing|eliminat(es?|ing)|reverses?|heals? completely|gets? rid of [a-z ]+ for good)\b/i, type: 'Medical claim', base: 'High' },
  { re: /\b(treats?|relieves?|prevents?|reduces?|improves?|boosts?|restores?) (pain|acne|wrinkles|hair loss|arthritis|inflammation|scarring|pigmentation|anxiety|symptoms|infection|decay|gum disease|immunity|collagen)\b/i, type: 'Medical claim', base: 'Medium' },
  { re: /\b\d{1,3}(\.\d+)?\s?%|\b\d+ out of \d+\b|\b\d+ (in|of) (every )?\d+\b|\bpercent\b|\b\d+x (more|faster|better)\b|\btimes (more|faster|better)\b|\b(studies|research) (show|shows|suggest)/i, type: 'Statistical claim', base: 'Medium' },
  { re: /\b(the )?best\b|\bno\.?\s?1\b|\bnumber one\b|#1\b|\bleading\b|\bworld[- ]class\b|\btop[- ]rated\b|\bmost (advanced|experienced|trusted|reputable|popular)\b|\bunmatched\b|\bunparalleled\b|\bfinest\b|\bpremier\b|\bsuperior\b|\bbetter than (any|other|all)\b|\bunrivalled\b|\bunrivaled\b|\bsecond to none\b/i, type: 'Superiority claim', base: 'Medium' },
  { re: /\bpermanent(ly)?\b|\blife[- ]?changing\b|\binstant(ly)? results?\b|\bimmediate results?\b|\blook (\d+|ten|years) years younger\b|\bflawless\b|\bperfect (results?|smile|skin)\b|\btransform your\b|\bdramatic results?\b|\bresults? (that )?last(s)? (forever|a lifetime)\b|\byou will (look|feel|see|get)\b/i, type: 'Outcome claim', base: 'Medium' },
  { re: /\b(100% |completely |totally |perfectly )safe\b|\bsafest\b|\brisk[- ]free\b|\bno (side[- ]effects|risks?|downtime|pain|scarring)\b|\bpain[- ]?free\b|\bpainless\b|\bzero (risk|pain|downtime)\b|\bwithout (any )?(risk|pain|side effects)\b/i, type: 'Safety claim', base: 'High' },
  { re: /\bguarantee(d|s)?\b|\b100% (results?|success|satisfaction|effective)\b|\bassured results?\b|\bwe promise\b|\bmoney[- ]back\b|\bsuccess rate of 100\b/i, type: 'Guarantee', base: 'High' },
  { re: /\bcheapest\b|\blowest (price|cost|rates?)\b|\bfree\b|\bdiscount(s|ed)?\b|\b\d+% off\b|[£$€₹]\s?\d|\bstarting (at|from)\b|\bno hidden (fees|costs)\b|\baffordable\b|\bbest price\b|\bspecial offer\b/i, type: 'Pricing claim', base: 'Low' },
  { re: /\b\d+\+?\s?years? (of )?experience\b|\bover \d[\d,]*\+? (patients|clients|customers|procedures|surgeries|treatments|projects|happy)\b|\bthousands of (patients|clients|customers|happy)\b|\bsince (19|20)\d{2}\b|\b\d[\d,]*\+ (patients|clients|customers|procedures)\b/i, type: 'Experience claim', base: 'Low' },
  { re: /\branked\b|\baward[- ]winning\b|\bawarded\b|\bvoted\b|\brated (#?\d|the|as)\b|\btop \d+\b|\b5[- ]star\b|\bfive[- ]star\b|\bfeatured in\b/i, type: 'Ranking claim', base: 'Medium' },
];

export const PROMOTIONAL_TERMS: { re: RegExp; phrase: string; why: string }[] = [
  { re: /\bbest (doctor|dentist|surgeon|clinic|hospital|dermatologist|specialist)\b/i, phrase: 'Best doctor / clinic', why: 'A subjective superiority claim about a healthcare provider. Regulators and platforms typically expect this to be substantiated or removed.' },
  { re: /\b(the )?best\b/i, phrase: 'Best', why: 'Superlative claims need objective evidence (awards, independent rankings) or should be reframed as a qualified statement.' },
  { re: /\bno\.?\s?1\b|\bnumber one\b|#1\b/i, phrase: 'No.1', why: 'Ranking claims require a verifiable source, date and scope (e.g. "rated #1 on X platform in 2025").' },
  { re: /\bleading\b/i, phrase: 'Leading', why: '"Leading" implies market position; without data it reads as unsupported marketing language.' },
  { re: /\bworld[- ]class\b/i, phrase: 'World-class', why: 'Vague and unverifiable. Replace with the specific credential, accreditation or capability it refers to.' },
  { re: /\bguaranteed?\b/i, phrase: 'Guaranteed', why: 'Outcome guarantees are rarely substantiable and are high-risk in regulated sectors.' },
  { re: /\b100% (results?|success|satisfaction|safe|effective)\b/i, phrase: '100% results', why: 'Absolute claims are almost never verifiable and set unrealistic expectations.' },
  { re: /\bpermanent results?\b/i, phrase: 'Permanent results', why: 'Most outcomes vary between individuals and over time; permanence claims need clinical evidence.' },
  { re: /\bsafest\b/i, phrase: 'Safest', why: 'A comparative safety claim that requires robust comparative evidence.' },
  { re: /\bmost advanced\b/i, phrase: 'Most advanced', why: 'Comparative technology claims need a specific, verifiable basis (device name, approval, year).' },
  { re: /\bmost trusted\b/i, phrase: 'Most trusted', why: 'Trust rankings require independent survey data to support them.' },
  { re: /\btop[- ]rated\b/i, phrase: 'Top-rated', why: 'State the rating platform, score and review count, or remove.' },
  { re: /\bunmatched\b|\bunparalleled\b|\bunrivall?ed\b|\bsecond to none\b/i, phrase: 'Unmatched / Unparalleled', why: 'Absolute comparative language that cannot be substantiated.' },
];

export const COMPLIANCE_PATTERNS: { re: RegExp; issue: string; risk: 'Low' | 'Medium' | 'High'; explanation: string }[] = [
  { re: /(?:\b(?:best|top|leading|most trusted|most experienced)|\bno\.?\s?1|\bnumber one|#1)(?: [a-z-]+){0,2} (doctors?|dentists?|surgeons?|dermatologists?|clinics?|hospitals?|specialists?|practices?)\b/i, issue: 'Promotional superiority claim about a provider', risk: 'High', explanation: 'Healthcare advertising rules in many jurisdictions restrict claims that a practitioner or clinic is superior to others unless they can be objectively substantiated.' },
  { re: /\bworld[- ]class\b|\bunmatched\b|\bunparalleled\b|\bsecond to none\b|\bfinest\b/i, issue: 'Unsupported superiority wording', risk: 'Medium', explanation: 'Vague superiority language can be considered misleading in healthcare promotion. Replace with specific, verifiable facts.' },
  { re: /\bguarantee(d|s)?\b|\b100% (results?|success|satisfaction|effective|safe)\b|\bassured results?\b/i, issue: 'Guaranteed result / outcome', risk: 'High', explanation: 'Medical outcomes depend on individual factors. Guarantees of results are a potential compliance risk and may mislead patients.' },
  { re: /\bcures?\b|\bcured\b|\bguaranteed cure\b|\beliminates? [a-z]+ (forever|permanently|for good)\b/i, issue: 'Unsupported cure / treatment claim', risk: 'High', explanation: 'Claims that a treatment cures a condition require strong clinical evidence and are a common source of regulatory action.' },
  { re: /\bclinically proven\b|\bscientifically proven\b|\bproven to\b|\bfda[- ]approved\b|\bmhra[- ]approved\b|\bce[- ]marked\b/i, issue: 'Unverified clinical claim', risk: 'Medium', explanation: 'Requires verification: cite the specific study, approval or registration, and ensure the claim matches its approved scope.' },
  { re: /\bpermanent(ly)?\b|\binstant(ly)? results?\b|\blook (\d+|ten|years) years younger\b|\bflawless\b|\bperfect (results?|smile|skin|body)\b|\bno downtime\b|\bpain[- ]?free\b|\bpainless\b|\bzero (risk|pain|downtime)\b|\brisk[- ]free\b|\bno (side[- ]effects|risks?|scarring)\b|\b(100% |completely |totally )safe\b|\bsafest\b/i, issue: 'Unrealistic outcome or safety claim', risk: 'High', explanation: 'Absolute safety or outcome language can understate risks. Patients must receive balanced information about risks, recovery and variability of results.' },
  { re: /\bbefore[- ]and[- ]after\b|\bbefore & after\b|\bbefore\/after\b/i, issue: 'Before/after promotional content', risk: 'Medium', explanation: 'Before/after imagery or claims may be restricted. Where permitted, they typically need consent, should be unedited, representative and accompanied by "results vary" context.' },
  { re: /\blimited[- ]time\b|\bhurry\b|\bact now\b|\bbook (now|today) (and|to) (save|get)\b|\bonly \d+ (slots|spots|places|appointments) (left|remaining|available)\b|\bends (soon|today|tonight)\b|\blast chance\b|\bdon'?t miss out\b|\bwhile (stocks|slots) last\b/i, issue: 'Promotional urgency', risk: 'High', explanation: 'Time-pressure tactics may encourage patients to make medical decisions without adequate reflection, which many healthcare advertising codes discourage.' },
  { re: /\b\d+% off\b|\bdiscount(s|ed)?\b|\bspecial offer\b|\bbuy one\b|\bpackage deal\b|\bfree (gift|treatment|session|botox|filler)\b|\bvoucher\b|\bpromo(tion)? code\b|\bbonus\b/i, issue: 'Discount / inducement', risk: 'Medium', explanation: 'Discounts or free treatments linked to medical procedures may be seen as inducing unnecessary treatment. Requires verification against applicable advertising rules.' },
  { re: /\bfree consultation\b/i, issue: 'Free consultation offer', risk: 'Low', explanation: 'Generally acceptable, but ensure the consultation is genuinely without obligation and not used as pressure to book treatment.' },
  { re: /\btestimonial|\b(patient|client) (reviews?|stories|story|says|said)\b|\b5[- ]star (reviews?|rating)\b|\bfive[- ]star\b|\bour patients (love|rave|say)\b|★/i, issue: 'Patient testimonial / endorsement', risk: 'Medium', explanation: 'Patient testimonials used promotionally may be restricted in some jurisdictions. Where permitted, they must be genuine, verifiable, consented and not imply guaranteed outcomes.' },
  { re: /\bmiracle\b|\brevolutionary\b|\bbreakthrough\b|\bmagic(al)?\b|\bsecret (formula|treatment)\b/i, issue: 'Hype language for treatment', risk: 'Medium', explanation: 'Sensational language around treatments may overstate efficacy and mislead patients.' },
];

/** Patient-voice testimonial detection: quoted first-person praise or attributed quotes. */
export const TESTIMONIAL_QUOTE = /["“][^"”]{15,}["”]\s*[-–—]\s*[A-Z][a-z]+|["“][^"”]*\b(i|my|me)\b[^"”]*\b(amazing|happy|recommend|best|changed my life|thank|love|grateful|confident)\b[^"”]*["”]/i;

// ---------- Credentials / trust lexicon ----------

export const CREDENTIAL_RE =
  /\b(MD|MBBS|DDS|DMD|BDS|MDS|FRCS|FRCP|MRCS|MRCP|PhD|DO|FACS|FAAD|DNB|MS \(?Ortho\)?|MCh|FDS|MFDS|RN|NP|PA-C|CPA|CFA|PMP|board[- ]certified|board certified|fellowship[- ]trained|consultant (surgeon|dermatologist|dentist|physician)|licensed|registered (dentist|nurse|practitioner|with)|chartered|accredited|certified (by|in|member))\b/;

export const REGISTRATION_RE =
  /\b(GMC|GDC|NMC|HCPC|CQC|AHPRA|NMC|DCI|MCI|NMC|medical council|dental council|registration (no|number)|reg\.? no|licen[cs]e (no|number|#))\b/i;

export const AUTHOR_RE = /\b(written by|author:|authored by|by (Dr\.?|Prof\.?)?\s?[A-Z][a-z]+ [A-Z][a-z]+)\b/;
export const REVIEWER_RE = /\b(medically reviewed|clinically reviewed|reviewed by|fact[- ]checked by|peer[- ]reviewed)\b/i;
export const DATE_RE =
  /\b(last (updated|reviewed)|updated (on|:)|published (on|:)|reviewed on)\b|\b(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2},? \d{4}\b|\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/i;
export const SOURCE_RE =
  /\b(according to|source:|sources:|references?:|study (published|by|in)|journal of|et al\.?|NHS|NICE|WHO|CDC|NIH|PubMed|Mayo Clinic|Cochrane|American Academy|British Association|Royal College|\[\d+\])\b/i;
export const CONTACT_RE =
  /(\+?\d[\d\s().-]{8,}\d)|\b[\w.+-]+@[\w-]+\.[\w.]+\b|\b(contact us|call us|get in touch|email us|visit us at)\b|\b\d+ [A-Z][a-z]+ (Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Boulevard|Blvd|Drive|Dr|Suite)\b/i;
export const ABOUT_RE = /\b(about us|our team|our story|founded (in|by)|our mission|meet (the|our) (team|doctor|dentist|surgeon)|who we are)\b/i;
export const AUTHORITY_RE =
  /\b(member of|accredited by|affiliated with|fellow of|award|awarded|featured in|as seen (in|on)|recognised by|recognized by|published in|speaker at|lecturer|professor|faculty)\b/i;
export const DISCLAIMER_RE =
  /\b(results (may )?vary|individual results|consult (your|a) (doctor|gp|physician|dentist|professional|specialist)|not a substitute for|medical advice|suitab(le|ility) (will be|is) (assessed|determined)|subject to consultation|risks include|possible side effects|as with any (procedure|surgery|treatment))\b/i;
export const RISK_DISCLOSURE_RE = /\b(risks?|side[- ]effects?|complications?|limitations?|not suitable|contraindicat)\b/i;

export const CTA_RE =
  /\b(book (a|an|your)|schedule (a|an|your)|call (us|today|now)|contact us|get (a|your) (free )?(quote|consultation|estimate|demo|trial)|request (a|an) (appointment|consultation|quote|demo|callback)|buy now|add to (cart|basket)|shop now|sign up|start (your|a) (free )?trial|get started|enquire|enquiry|make an appointment|talk to)\b/i;

export const PASSIVE_RE =
  /\b(am|is|are|was|were|be|been|being|is being|are being|was being|were being)\s+(\w+ly\s+)?(\w+ed|built|done|made|given|taken|seen|known|shown|written|chosen|done|found|held|kept|left|lost|paid|put|read|run|said|sent|set|told|thought|understood|won|brought|bought|caught|taught|drawn|driven|eaten|fallen|forgotten|hidden|ridden|spoken|stolen|worn|performed)\b/i;

export const WORDY_REPLACEMENTS: [RegExp, string][] = [
  [/\bin order to\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\butili[sz]e(s|d)?\b/gi, 'use$1'],
  [/\butili[sz]ation\b/gi, 'use'],
  [/\ba (large|significant) (number|amount) of\b/gi, 'many'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bprior to\b/gi, 'before'],
  [/\bsubsequent to\b/gi, 'after'],
  [/\bfacilitate(s)?\b/gi, 'help$1'],
  [/\bcommence(s)?\b/gi, 'start$1'],
  [/\bin the event that\b/gi, 'if'],
  [/\bwith regard(s)? to\b/gi, 'about'],
  [/\bin regard(s)? to\b/gi, 'about'],
  [/\bis able to\b/gi, 'can'],
  [/\bare able to\b/gi, 'can'],
  [/\bhas the ability to\b/gi, 'can'],
  [/\bin close proximity to\b/gi, 'near'],
  [/\ba majority of\b/gi, 'most'],
  [/\bin spite of the fact that\b/gi, 'although'],
  [/\bit is important to note that\s*/gi, ''],
  [/\bit is worth noting that\s*/gi, ''],
  [/\bfurthermore,?\s*/gi, 'Also, '],
  [/\bmoreover,?\s*/gi, 'Also, '],
  [/\bindividuals\b/gi, 'people'],
  [/\bnumerous\b/gi, 'many'],
  [/\bapproximately\b/gi, 'about'],
  [/\bdemonstrate(s)?\b/gi, 'show$1'],
  [/\bendeavou?r(s)?\b/gi, 'try'],
  [/\bascertain\b/gi, 'find out'],
  [/\bsufficient\b/gi, 'enough'],
  [/\bobtain(s)?\b/gi, 'get$1'],
];

export const FILLER_PHRASES = [
  'very',
  'really',
  'basically',
  'actually',
  'literally',
  'simply',
  'just',
  'quite',
  'truly',
  'needless to say',
  'at the end of the day',
  'in order to',
  'it is important to note that',
  'it goes without saying',
  'for all intents and purposes',
  'the fact that',
  'all things considered',
  'as a matter of fact',
];

export const REDUNDANT_PHRASES = [
  'free gift',
  'end result',
  'past history',
  'advance planning',
  'completely eliminate',
  'absolutely essential',
  'close proximity',
  'each and every',
  'final outcome',
  'future plans',
  'new innovation',
  'unexpected surprise',
  'basic fundamentals',
  'added bonus',
  'revert back',
  'repeat again',
  'join together',
  'true fact',
  'brief summary',
  'combine together',
];

export const COMMON_MISSPELLINGS: Record<string, string> = {
  recieve: 'receive',
  seperate: 'separate',
  definately: 'definitely',
  occured: 'occurred',
  accomodate: 'accommodate',
  untill: 'until',
  wich: 'which',
  teh: 'the',
  alot: 'a lot',
  occurence: 'occurrence',
  begining: 'beginning',
  beleive: 'believe',
  calender: 'calendar',
  collegue: 'colleague',
  concious: 'conscious',
  enviroment: 'environment',
  existance: 'existence',
  goverment: 'government',
  independant: 'independent',
  maintainance: 'maintenance',
  neccessary: 'necessary',
  noticable: 'noticeable',
  occassion: 'occasion',
  publically: 'publicly',
  recomend: 'recommend',
  reccommend: 'recommend',
  refered: 'referred',
  relevent: 'relevant',
  succesful: 'successful',
  tommorow: 'tomorrow',
  truely: 'truly',
  wierd: 'weird',
  procedue: 'procedure',
  treatement: 'treatment',
  patiant: 'patient',
  surgury: 'surgery',
  anesthesic: 'anaesthetic',
  garantee: 'guarantee',
  guarentee: 'guarantee',
  experiance: 'experience',
  proffesional: 'professional',
  profesional: 'professional',
  buisness: 'business',
  sucess: 'success',
};

// ---------- Topic templates ----------

export interface Subtopic {
  id: string;
  label: string;
  heading: string; // suggested H2, {kw} and {loc} placeholders
  terms: RegExp;
}

const T = (id: string, label: string, heading: string, terms: RegExp): Subtopic => ({ id, label, heading, terms });

export const CONTENT_TYPE_TOPICS: Record<ContentType, Subtopic[]> = {
  blog: [
    T('definition', 'Clear definition / direct answer', 'What Is {kw}?', /\b(is a|is an|refers to|is the process|means|is when|defined as)\b/i),
    T('why', 'Why it matters', 'Why {kw} Matters', /\b(why|matters|important because|benefits?|reasons?)\b/i),
    T('how', 'How it works / steps', 'How {kw} Works: Step by Step', /\b(how (it|to|does)|step|process|works)\b/i),
    T('examples', 'Examples', 'Real Examples of {kw}', /\b(for example|for instance|e\.g\.|case|example)\b/i),
    T('mistakes', 'Common mistakes / pitfalls', 'Common {kw} Mistakes to Avoid', /\b(mistakes?|avoid|pitfalls?|myths?|misconceptions?|don'?t)\b/i),
    T('tips', 'Practical tips', 'Practical Tips for {kw}', /\b(tips?|advice|recommend|best practices?|checklist)\b/i),
    T('cost', 'Cost / time considerations', 'How Much Does {kw} Cost?', /\b(cost|price|budget|how long|time|duration|[£$€₹]\d)\b/i),
    T('faq', 'FAQ', 'Frequently Asked Questions About {kw}', /\b(faq|frequently asked|questions)\b/i),
    T('sources', 'Sources / references', 'Sources and Further Reading', /\b(according to|source|study|research|journal|reference)\b/i),
  ],
  service: [
    T('overview', 'What the service is', 'What Is {kw}?', /\b(is a|is an|involves|refers to|treatment (that|which)|service (that|which)|we offer|we provide)\b/i),
    T('audience', 'Who it is for / candidates', 'Who Is {kw} Suitable For?', /\b(suitable|candidate|ideal for|who (is|can|should)|eligib|right for you|recommended for)\b/i),
    T('benefits', 'Benefits', 'Benefits of {kw}', /\b(benefits?|advantages?|helps? (you|to)|improves?)\b/i),
    T('process', 'Procedure / process', 'What Happens During {kw}?', /\b(procedure|process|step|how it works|what to expect|during (the|your)|appointment|session)\b/i),
    T('risks', 'Risks / limitations', 'Risks, Side Effects and Limitations', /\b(risks?|side[- ]effects?|complications?|limitations?|not suitable|downsides?)\b/i),
    T('recovery', 'Recovery / timeframe', 'Recovery and Results Timeline', /\b(recover|downtime|aftercare|heal|timeline|how long|weeks?|days?|results (appear|show|last))\b/i),
    T('pricing', 'Pricing / cost', '{kw} Cost{locIn}', /\b(cost|price|pricing|fees?|financ|payment plan|[£$€₹]\s?\d|from \d)\b/i),
    T('trust', 'Credentials / trust signals', 'Why Choose Our Team{locIn}', /\b(qualified|certified|registered|accredited|experience|credentials|trained|board|member of|fellow)\b/i),
    T('faq', 'FAQs', '{kw} FAQs', /\b(faq|frequently asked|questions)\b/i),
    T('cta', 'Clear call to action', 'Book a {kw} Consultation{locIn}', CTA_RE),
  ],
  landing: [
    T('value', 'Clear value proposition', '{kw}: What You Get', /\b(get|helps? you|so you can|designed to|without)\b/i),
    T('benefits', 'Benefits', 'Key Benefits', /\b(benefits?|advantages?|save|faster|easier|improve)\b/i),
    T('proof', 'Social proof / results', 'Results Our Clients Have Seen', /\b(clients|customers|reviews?|case stud|results|rated|trusted by)\b/i),
    T('how', 'How it works', 'How It Works', /\b(how it works|step|simple|process)\b/i),
    T('offer', 'Offer details / pricing', 'Pricing and What\'s Included', /\b(price|pricing|cost|included|plan|package|[£$€₹]\s?\d)\b/i),
    T('objections', 'Objection handling / FAQs', 'Questions Before You Start', /\b(faq|questions|what if|worried|concern)\b/i),
    T('cta', 'Clear call to action', 'Get Started Today', CTA_RE),
  ],
  location: [
    T('local-intro', 'Location-specific introduction', '{kw}{locIn}', /\b(in|near|serving|based in)\b/i),
    T('services', 'Services offered at this location', 'Services We Offer{locIn}', /\b(services?|we offer|treatments?|we provide)\b/i),
    T('area', 'Areas served / landmarks', 'Areas We Serve Near {loc}', /\b(near|minutes from|close to|serving|neighbou?rhoods?|areas?|nearby|located (on|in|near))\b/i),
    T('access', 'Directions / parking / transport', 'How to Find Us', /\b(parking|directions|station|bus|tube|metro|train|wheelchair|access)\b/i),
    T('hours', 'Opening hours', 'Opening Hours', /\b(opening hours|open (from|monday|mon|daily)|hours|weekends?)\b/i),
    T('contact', 'Address & contact details', 'Contact Our {loc} Team', CONTACT_RE),
    T('team', 'Local team', 'Meet Our {loc} Team', /\b(team|staff|doctor|dentist|specialist|experts?)\b/i),
    T('proof', 'Local reviews / proof', 'What Local Clients Say', /\b(reviews?|rated|clients|patients|customers)\b/i),
    T('cta', 'Call to action', 'Book an Appointment{locIn}', CTA_RE),
  ],
  product: [
    T('features', 'Key features', 'Key Features', /\b(features?|includes?|comes with|built[- ]in)\b/i),
    T('specs', 'Specifications', 'Specifications', /\b(specs?|specifications?|dimensions?|weight|size|material|capacity|\d+\s?(mm|cm|kg|g|ml|inch|gb))\b/i),
    T('benefits', 'Benefits / use cases', 'Who It\'s For', /\b(ideal for|perfect for|benefits?|use (it|for)|helps?)\b/i),
    T('pricing', 'Price / value', 'Price and Value', /\b(price|cost|[£$€₹]\s?\d|value)\b/i),
    T('shipping', 'Shipping & delivery', 'Shipping and Delivery', /\b(shipping|delivery|dispatch|ships)\b/i),
    T('returns', 'Returns / warranty', 'Returns and Warranty', /\b(returns?|refund|warranty|guarantee)\b/i),
    T('reviews', 'Reviews', 'Customer Reviews', /\b(reviews?|rated|stars?)\b/i),
    T('faq', 'FAQs', 'Product FAQs', /\b(faq|questions)\b/i),
    T('cta', 'Purchase CTA', 'Buy Now', CTA_RE),
  ],
  homepage: [
    T('value', 'Value proposition', '{kw}{locIn}', /\b(we help|helps?|so you can|we (are|provide|offer))\b/i),
    T('services', 'Services overview', 'Our Services', /\b(services?|we offer|treatments?|products?|solutions?)\b/i),
    T('audience', 'Who you serve', 'Who We Help', /\b(for (families|patients|businesses|clients|teams)|we (work with|serve|help))\b/i),
    T('trust', 'Trust signals / credentials', 'Why Choose Us', /\b(qualified|certified|accredited|experience|award|years)\b/i),
    T('proof', 'Social proof', 'What Our Clients Say', /\b(reviews?|testimonials?|clients|customers|rated|trusted by)\b/i),
    T('contact', 'Contact / location', 'Visit or Contact Us', CONTACT_RE),
    T('cta', 'Primary CTA', 'Get Started', CTA_RE),
  ],
  about: [
    T('story', 'Story / history', 'Our Story', /\b(founded|started|began|history|story|since (19|20)\d{2})\b/i),
    T('mission', 'Mission / values', 'Our Mission and Values', /\b(mission|values?|believe|purpose|vision)\b/i),
    T('team', 'Team / people', 'Meet the Team', /\b(team|founder|doctor|dentist|staff|our people|meet)\b/i),
    T('credentials', 'Credentials / qualifications', 'Qualifications and Accreditations', CREDENTIAL_RE),
    T('experience', 'Experience / track record', 'Our Experience', /\b(years|experience|clients|patients|projects|procedures)\b/i),
    T('contact', 'Contact / location', 'Where to Find Us', CONTACT_RE),
  ],
  other: [
    T('overview', 'Clear overview', 'Overview of {kw}', /\b(is a|is an|overview|about)\b/i),
    T('details', 'Specific details', 'Key Details', /\d/),
    T('faq', 'FAQs', 'Frequently Asked Questions', /\b(faq|questions)\b/i),
    T('cta', 'Next step / CTA', 'Next Steps', CTA_RE),
  ],
};

/** Extra subtopics that matter for specific industries regardless of page type. */
export const INDUSTRY_TOPICS: Partial<Record<Industry, Subtopic[]>> = {
  dental: [
    T('consult', 'Consultation & assessment', 'Your Consultation and Assessment', /\b(consultation|assessment|x-?ray|examination|check-?up)\b/i),
    T('aftercare', 'Aftercare & maintenance', 'Aftercare and Maintenance', /\b(aftercare|maintenance|brush|floss|hygien|check-?ups?)\b/i),
  ],
  dermatology: [
    T('skin-types', 'Skin type suitability', 'Is It Suitable for My Skin Type?', /\b(skin type|fitzpatrick|sensitive skin|darker skin|skin tone)\b/i),
    T('sessions', 'Number of sessions', 'How Many Sessions Will I Need?', /\b(sessions?|treatments? (needed|required)|course of)\b/i),
  ],
  'cosmetic-surgery': [
    T('consult', 'Consultation & cooling-off', 'Consultation and Cooling-Off Period', /\b(consultation|cooling[- ]off|two[- ]stage|assessment)\b/i),
    T('surgeon', 'Surgeon qualifications', 'About Your Surgeon', /\b(surgeon|fellowship|frcs|board[- ]certified|gmc|specialist register)\b/i),
    T('anaesthesia', 'Anaesthesia', 'Anaesthesia and Hospital Stay', /\b(an(a)?esthe|general|local|sedation|hospital stay|overnight)\b/i),
  ],
  orthopedic: [
    T('diagnosis', 'Diagnosis & imaging', 'Diagnosis and Imaging', /\b(diagnos|mri|x-?ray|ct scan|imaging|assessment)\b/i),
    T('rehab', 'Rehabilitation / physiotherapy', 'Rehabilitation and Physiotherapy', /\b(rehab|physio|exercises?|mobility|return to (work|sport))\b/i),
    T('alternatives', 'Non-surgical alternatives', 'Non-Surgical Alternatives', /\b(non[- ]surgical|conservative|alternatives?|injections?)\b/i),
  ],
  healthcare: [
    T('symptoms', 'Symptoms / when to seek help', 'When Should You See a Doctor?', /\b(symptoms?|signs|when to see|seek (medical )?help|urgent)\b/i),
    T('diagnosis', 'Diagnosis', 'How It Is Diagnosed', /\b(diagnos|test|scan|assessment)\b/i),
  ],
  travel: [
    T('best-time', 'Best time to visit', 'Best Time to Visit {loc}', /\b(best time|season|weather|month|climate)\b/i),
    T('getting-there', 'Getting there / transport', 'How to Get to {loc}', /\b(flight|airport|train|drive|transport|getting there)\b/i),
    T('stay', 'Where to stay', 'Where to Stay in {loc}', /\b(hotel|stay|accommodation|hostel|resort|airbnb)\b/i),
    T('budget', 'Budget / costs', 'How Much Does a Trip to {loc} Cost?', /\b(cost|budget|price|[£$€₹]\s?\d)\b/i),
  ],
  'real-estate': [
    T('neighbourhood', 'Neighbourhood information', 'About the Neighbourhood', /\b(neighbou?rhood|schools?|amenities|transport|community)\b/i),
    T('market', 'Market / price data', 'Property Prices{locIn}', /\b(average price|market|prices?|valuation|[£$€₹]\s?\d)\b/i),
    T('process', 'Buying / selling process', 'How the Buying Process Works', /\b(mortgage|offer|survey|conveyanc|closing|completion|process)\b/i),
  ],
  ecommerce: [
    T('shipping', 'Shipping & returns', 'Shipping and Returns', /\b(shipping|delivery|returns?|refund)\b/i),
    T('sizing', 'Sizing / compatibility', 'Sizing and Compatibility', /\b(size|sizing|fit|compatib|dimensions?)\b/i),
  ],
  saas: [
    T('integrations', 'Integrations', 'Integrations', /\b(integrat|api|connects? with|works with|zapier)\b/i),
    T('security', 'Security & compliance', 'Security and Compliance', /\b(security|gdpr|soc ?2|iso ?27001|encrypt|hipaa)\b/i),
    T('pricing', 'Pricing / plans', 'Pricing and Plans', /\b(pricing|plans?|per (user|month|seat)|free trial)\b/i),
    T('use-cases', 'Use cases', 'Use Cases', /\b(use cases?|teams use|for (marketing|sales|support|developers))\b/i),
  ],
  'local-business': [
    T('area', 'Service area', 'Areas We Cover', /\b(areas?|serving|cover|nearby|local)\b/i),
    T('hours', 'Hours & availability', 'Opening Hours and Availability', /\b(hours|open|available|emergency|same[- ]day)\b/i),
  ],
};

/** Semantic terms commonly expected per industry, used for entity/related-term coverage. */
export const INDUSTRY_ENTITIES: Record<Industry, string[]> = {
  healthcare: ['diagnosis', 'symptoms', 'treatment options', 'GP', 'specialist', 'consultation', 'side effects', 'recovery', 'NHS', 'referral'],
  dental: ['dentist', 'oral health', 'gums', 'enamel', 'x-ray', 'local anaesthetic', 'hygienist', 'consultation', 'aftercare', 'GDC'],
  dermatology: ['dermatologist', 'skin type', 'consultation', 'patch test', 'sessions', 'side effects', 'SPF', 'pigmentation', 'aftercare', 'downtime'],
  'cosmetic-surgery': ['surgeon', 'consultation', 'anaesthesia', 'recovery', 'scarring', 'risks', 'cooling-off period', 'aftercare', 'GMC', 'revision'],
  orthopedic: ['orthopaedic surgeon', 'MRI', 'physiotherapy', 'rehabilitation', 'joint', 'mobility', 'pain management', 'non-surgical options', 'recovery time', 'X-ray'],
  travel: ['itinerary', 'best time to visit', 'budget', 'accommodation', 'transport', 'visa', 'weather', 'local food', 'safety', 'attractions'],
  'real-estate': ['property', 'mortgage', 'valuation', 'neighbourhood', 'schools', 'transport links', 'stamp duty', 'survey', 'listing', 'agent'],
  ecommerce: ['price', 'shipping', 'returns', 'warranty', 'specifications', 'reviews', 'size guide', 'stock', 'materials', 'delivery'],
  saas: ['integrations', 'pricing', 'free trial', 'onboarding', 'security', 'API', 'dashboard', 'support', 'use cases', 'workflow'],
  'local-business': ['service area', 'opening hours', 'reviews', 'contact', 'quote', 'licensed', 'insured', 'emergency', 'local', 'directions'],
  other: ['overview', 'benefits', 'examples', 'cost', 'process'],
};

export const AUTHORITATIVE_SOURCES: Record<Industry, { source: string; useFor: string }[]> = {
  healthcare: [
    { source: 'NHS (nhs.uk) condition and treatment pages', useFor: 'Symptoms, treatment options and risks' },
    { source: 'NICE guidelines (nice.org.uk)', useFor: 'Clinical recommendations and eligibility' },
    { source: 'PubMed / peer-reviewed journals', useFor: 'Statistics and efficacy claims' },
    { source: 'WHO (who.int)', useFor: 'Population-level data' },
  ],
  dental: [
    { source: 'NHS dental services pages', useFor: 'Treatment explanations and costs bands (UK)' },
    { source: 'Oral Health Foundation / ADA', useFor: 'Patient guidance and oral health statistics' },
    { source: 'General Dental Council (GDC) register', useFor: 'Verifying dentist registration' },
    { source: 'Peer-reviewed dental journals (e.g. BDJ, JADA)', useFor: 'Success rates and longevity claims' },
  ],
  dermatology: [
    { source: 'British Association of Dermatologists / AAD', useFor: 'Condition information and treatment guidance' },
    { source: 'NHS skin condition pages', useFor: 'Risks and suitability' },
    { source: 'Device manufacturer clinical data / regulatory clearance', useFor: 'Laser or device efficacy claims' },
  ],
  'cosmetic-surgery': [
    { source: 'BAAPS / ASPS / ISAPS', useFor: 'Procedure statistics and patient safety guidance' },
    { source: 'GMC specialist register / Royal College of Surgeons', useFor: 'Surgeon credentials and patient guidance' },
    { source: 'NHS cosmetic procedures pages', useFor: 'Risks, recovery and choosing a surgeon' },
  ],
  orthopedic: [
    { source: 'AAOS (orthoinfo.aaos.org) / BOA', useFor: 'Procedure and recovery information' },
    { source: 'NICE / NHS', useFor: 'Treatment pathways and eligibility' },
    { source: 'National Joint Registry', useFor: 'Implant outcome and revision statistics' },
  ],
  travel: [
    { source: 'Official tourism board websites', useFor: 'Opening times, events and local facts' },
    { source: 'Government travel advice (e.g. FCDO, US State Dept)', useFor: 'Entry requirements and safety' },
    { source: 'Transport operator websites', useFor: 'Routes, prices and timetables' },
  ],
  'real-estate': [
    { source: 'Land Registry / official house price index', useFor: 'Average price and market data' },
    { source: 'Local council / school inspection reports', useFor: 'Neighbourhood and school information' },
    { source: 'Government tax guidance', useFor: 'Stamp duty / transaction cost claims' },
  ],
  ecommerce: [
    { source: 'Manufacturer specification sheets', useFor: 'Technical specifications' },
    { source: 'Recognised standards bodies (e.g. CE, UL, ISO)', useFor: 'Safety and certification claims' },
    { source: 'Independent review platforms', useFor: 'Rating and review claims' },
  ],
  saas: [
    { source: 'Your own product documentation', useFor: 'Feature and integration claims' },
    { source: 'Independent review sites (G2, Capterra)', useFor: 'Rating claims' },
    { source: 'Security attestations (SOC 2, ISO 27001 certificates)', useFor: 'Security claims' },
    { source: 'Industry research (Gartner, Forrester)', useFor: 'Market statistics' },
  ],
  'local-business': [
    { source: 'Google Business Profile', useFor: 'Reviews, hours and address consistency' },
    { source: 'Trade body / licensing registers', useFor: 'Licence and accreditation claims' },
    { source: 'Local authority information', useFor: 'Service area and regulations' },
  ],
  other: [
    { source: 'Primary sources and official bodies relevant to your topic', useFor: 'Statistics and factual claims' },
    { source: 'Peer-reviewed or industry research', useFor: 'Data-driven claims' },
  ],
};

export const INFORMATIONAL_MODIFIERS = /\b(what|how|why|when|who|guide|tips|ideas|examples|vs|versus|meaning|definition|benefits|symptoms|causes|types|is it|does|can)\b/i;
export const COMMERCIAL_MODIFIERS = /\b(best|top|review|reviews|compare|comparison|alternatives?|cost|price|pricing|cheap|affordable)\b/i;
export const TRANSACTIONAL_MODIFIERS = /\b(buy|book|hire|near me|clinic|services?|company|agency|treatment|surgery|appointment|quote|order|shop|for sale)\b/i;
