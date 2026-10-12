// Core domain types for ContentGuard AI.
// The AnalysisReport shape is the contract between the UI and any analysis provider
// (the built-in heuristic engine today, an LLM-backed service later).

export type ContentType =
  | 'blog'
  | 'service'
  | 'landing'
  | 'location'
  | 'product'
  | 'homepage'
  | 'about'
  | 'other';

export type Industry =
  | 'healthcare'
  | 'dental'
  | 'dermatology'
  | 'cosmetic-surgery'
  | 'orthopedic'
  | 'travel'
  | 'real-estate'
  | 'ecommerce'
  | 'saas'
  | 'local-business'
  | 'other';

export interface AnalysisInput {
  contentType: ContentType;
  industry: Industry;
  primaryKeyword: string;
  secondaryKeywords: string[];
  targetLocation: string;
  targetAudience: string;
  websiteUrl: string;
  /** HTML (from the rich editor) or plain text / Markdown. */
  content: string;
}

export type RiskLevel = 'Low' | 'Medium' | 'High';
export type Confidence = 'Low' | 'Medium' | 'High';

/** must = red, should = orange, consider = yellow, good = green */
export type Severity = 'must' | 'should' | 'consider' | 'good';

export type IssueCategory =
  | 'ai'
  | 'human'
  | 'seo'
  | 'keyword'
  | 'structure'
  | 'readability'
  | 'quality'
  | 'eeat'
  | 'claims'
  | 'compliance'
  | 'page-type'
  | 'spam';

export interface Issue {
  id: string;
  category: IssueCategory;
  severity: Severity;
  title: string;
  /** Exact sentence or section the issue refers to, if any. */
  original?: string;
  /** Which section/location of the content. */
  location?: string;
  problem: string;
  /** Why it matters. */
  explanation: string;
  /** Recommended action. */
  suggestion: string;
  /** Optional sentence-level rewrite. */
  rewrite?: string;
}

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'na';

export interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

// ---------- Parsed document ----------

export type BlockType = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'li' | 'quote';

export interface Block {
  type: BlockType;
  text: string;
  /** Heading was inferred from plain text rather than marked up. */
  inferred?: boolean;
}

export interface Link {
  href: string;
  text: string;
  internal: boolean;
}

export interface ParsedDocument {
  blocks: Block[];
  links: Link[];
  plainText: string;
  sentences: string[];
  paragraphs: string[];
  headings: Block[];
  words: string[];
}

export interface DocStats {
  words: number;
  sentences: number;
  paragraphs: number;
  headings: number;
  readingTimeMin: number;
  links: number;
}

// ---------- Module results ----------

export interface AISignal {
  id: string;
  name: string;
  /** 0..1 strength of the signal in this text. */
  strength: number;
  detected: boolean;
  detail: string;
  examples: string[];
}

export interface AIAnalysis {
  score: number;
  band: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';
  confidence: Confidence;
  signals: AISignal[];
  reasons: string[];
  examples: { text: string; signal: string }[];
  metrics: {
    sentenceLengthVariation: number;
    paragraphSymmetry: number;
    transitionRate: number;
    clichePer1000: number;
  };
}

export interface HumanAnalysis {
  score: number;
  checks: Check[];
  summary: string[];
  originalityScore: number;
}

export interface HeadingIssue {
  text: string;
  problem: string;
}

export interface SEOAnalysis {
  score: number;
  searchIntent: {
    score: number;
    detected: string;
    expected: string;
    aligned: boolean;
    notes: string[];
  };
  checks: Check[];
  good: string[];
  missing: string[];
  changes: string[];
  missingSubtopics: string[];
  coveredSubtopics: string[];
  entitiesFound: string[];
  entitiesMissing: string[];
  headingIssues: HeadingIssue[];
  questionOpportunities: string[];
  snippetOpportunities: string[];
  duplicateSections: string[];
}

export interface KeywordPlacement {
  title: boolean;
  introduction: boolean;
  h2: boolean;
  body: boolean;
  conclusion: boolean;
  faq: boolean;
}

export interface KeywordAnalysis {
  keyword: string;
  exactCount: number;
  partialCount: number;
  density: number;
  naturalUsage: string;
  placement: KeywordPlacement;
  stuffingRisk: RiskLevel;
  secondary: { keyword: string; count: number }[];
  relatedFound: string[];
  relatedMissing: string[];
}

export interface HardSentence {
  original: string;
  words: number;
  reason: string;
  suggestion: string;
}

export interface ReadabilityAnalysis {
  score: number;
  fleschEase: number;
  gradeLevel: number;
  difficulty: string;
  avgSentenceLength: number;
  avgParagraphWords: number;
  longParagraphs: number;
  passiveCount: number;
  passivePercent: number;
  passiveExamples: string[];
  complexSentences: number;
  jargon: string[];
  hardest: HardSentence[];
}

export interface EEATSignal {
  id: string;
  label: string;
  found: boolean;
  evidence?: string;
  pillar: 'experience' | 'expertise' | 'authoritativeness' | 'trustworthiness';
  recommendation: string;
}

export interface EEATAnalysis {
  experience: number;
  expertise: number;
  authoritativeness: number;
  trustworthiness: number;
  overall: number;
  isYMYL: boolean;
  signals: EEATSignal[];
}

export type ClaimType =
  | 'Medical claim'
  | 'Statistical claim'
  | 'Superiority claim'
  | 'Outcome claim'
  | 'Safety claim'
  | 'Guarantee'
  | 'Pricing claim'
  | 'Experience claim'
  | 'Ranking claim';

export interface Claim {
  id: string;
  original: string;
  types: ClaimType[];
  trigger: string;
  risk: RiskLevel;
  evidenceNeeded: boolean;
  evidenceNote: string;
  suggestion: string;
}

export interface ComplianceFlag {
  id: string;
  original: string;
  issue: string;
  trigger: string;
  risk: RiskLevel;
  explanation: string;
  saferVersion: string;
}

export interface ComplianceAnalysis {
  applicable: boolean;
  mode: 'healthcare' | 'general';
  risk: RiskLevel;
  flags: ComplianceFlag[];
  notes: string[];
}

export interface QualityAnalysis {
  score: number;
  dimensions: { label: string; score: number; note: string }[];
  grammar: { original: string; issue: string; fix: string }[];
  redundancy: string[];
  filler: { phrase: string; count: number }[];
}

export interface PageTypeAnalysis {
  kind: ContentType;
  title: string;
  score: number;
  checks: Check[];
  missingTopics: string[];
  suggestedH2s: string[];
  suggestedFaqs: string[];
  snippetOpportunities: string[];
  promotionalPhrases: { phrase: string; sentence: string; why: string }[];
  overlyPromotional: boolean;
}

export interface SentenceRewrite {
  original: string;
  issue: string;
  rewrite: string;
}

export interface RewriteSuggestions {
  seoTitle: string;
  metaDescription: string;
  h1: string;
  h2Structure: string[];
  missingTopics: string[];
  faqs: string[];
  internalLinks: { anchor: string; target: string; reason: string }[];
  externalSources: { source: string; useFor: string }[];
  cta?: string;
  sentenceRewrites: SentenceRewrite[];
}

export interface ScoreSummary {
  overall: number;
  seo: number;
  aiLikeness: number;
  human: number;
  searchIntent: number;
  readability: number;
  eeat: number;
  originality: number;
  quality: number;
  spamRisk: RiskLevel;
  complianceRisk: RiskLevel;
}

export interface AnalysisReport {
  id: string;
  createdAt: string;
  engine: { id: string; label: string };
  input: AnalysisInput;
  document: ParsedDocument;
  stats: DocStats;
  scores: ScoreSummary;
  ai: AIAnalysis;
  human: HumanAnalysis;
  seo: SEOAnalysis;
  keyword: KeywordAnalysis | null;
  readability: ReadabilityAnalysis;
  eeat: EEATAnalysis;
  claims: Claim[];
  compliance: ComplianceAnalysis;
  quality: QualityAnalysis;
  pageType: PageTypeAnalysis;
  spam: { risk: RiskLevel; reasons: string[] };
  rewrites: RewriteSuggestions;
  issues: Issue[];
  /** Page-specific editor notes from the LLM review, when it ran. */
  llmNotes?: string[];
}
