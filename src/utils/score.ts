import type { CheckStatus, RiskLevel, Severity } from '../types/analysis';

export type Tone = 'good' | 'fair' | 'warn' | 'bad' | 'neutral';

export function scoreTone(score: number): Tone {
  if (score >= 75) return 'good';
  if (score >= 55) return 'fair';
  if (score >= 35) return 'warn';
  return 'bad';
}

/** For AI-likeness, higher means more generic patterns, so the tone is inverted. */
export function aiTone(score: number): Tone {
  if (score <= 40) return 'good';
  if (score <= 60) return 'fair';
  if (score <= 80) return 'warn';
  return 'bad';
}

export function riskTone(r: RiskLevel): Tone {
  return r === 'Low' ? 'good' : r === 'Medium' ? 'warn' : 'bad';
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 55) return 'Fair';
  if (score >= 35) return 'Needs work';
  return 'Poor';
}

export const TONE_STYLES: Record<Tone, { text: string; bg: string; ring: string; bar: string; soft: string; border: string; left: string }> = {
  good: { text: 'text-emerald-700', bg: 'bg-emerald-600', ring: 'stroke-emerald-500', bar: 'bg-emerald-500', soft: 'bg-emerald-50', border: 'border-emerald-200', left: 'border-l-emerald-400' },
  fair: { text: 'text-yellow-700', bg: 'bg-yellow-500', ring: 'stroke-yellow-400', bar: 'bg-yellow-400', soft: 'bg-yellow-50', border: 'border-yellow-200', left: 'border-l-yellow-400' },
  warn: { text: 'text-orange-700', bg: 'bg-orange-500', ring: 'stroke-orange-500', bar: 'bg-orange-500', soft: 'bg-orange-50', border: 'border-orange-200', left: 'border-l-orange-400' },
  bad: { text: 'text-red-700', bg: 'bg-red-600', ring: 'stroke-red-500', bar: 'bg-red-500', soft: 'bg-red-50', border: 'border-red-200', left: 'border-l-red-400' },
  neutral: { text: 'text-slate-700', bg: 'bg-slate-500', ring: 'stroke-slate-400', bar: 'bg-slate-400', soft: 'bg-slate-50', border: 'border-slate-200', left: 'border-l-slate-300' },
};

export const SEVERITY_META: Record<Severity, { label: string; emoji: string; tone: Tone; short: string; description: string }> = {
  must: { label: 'Must Fix', emoji: '🔴', tone: 'bad', short: 'Must fix', description: 'High-risk or high-impact issues to resolve before publishing.' },
  should: { label: 'Should Fix', emoji: '🟠', tone: 'warn', short: 'High priority', description: 'Important improvements with clear SEO, trust or conversion impact.' },
  consider: { label: 'Consider', emoji: '🟡', tone: 'fair', short: 'Improvement', description: 'Worthwhile refinements once the above are done.' },
  good: { label: 'Good As Is', emoji: '🟢', tone: 'good', short: 'Good', description: 'Elements that already meet best practice.' },
};

export const CHECK_META: Record<CheckStatus, { label: string; tone: Tone; icon: string }> = {
  pass: { label: 'Pass', tone: 'good', icon: '✓' },
  warn: { label: 'Improve', tone: 'fair', icon: '!' },
  fail: { label: 'Fail', tone: 'bad', icon: '✕' },
  na: { label: 'N/A', tone: 'neutral', icon: '–' },
};
