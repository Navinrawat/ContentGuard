import type { AnalysisReport } from '../types/analysis';
import { TONE_STYLES, aiTone, riskTone, scoreLabel, scoreTone, type Tone } from '../utils/score';
import { AIDisclaimer } from './Disclaimer';
import { ScoreRing, cx } from './ui';

interface Tile {
  label: string;
  value: string;
  suffix?: string;
  tone: Tone;
  status: string;
  pct?: number;
  hint: string;
}

export function ScoreDashboard({ report }: { report: AnalysisReport }) {
  const s = report.scores;
  const counts = {
    must: report.issues.filter((i) => i.severity === 'must').length,
    should: report.issues.filter((i) => i.severity === 'should').length,
    consider: report.issues.filter((i) => i.severity === 'consider').length,
  };

  const tiles: Tile[] = [
    { label: 'SEO Score', value: String(s.seo), suffix: '/100', tone: scoreTone(s.seo), status: scoreLabel(s.seo), pct: s.seo, hint: '25 on-page SEO checks' },
    { label: 'AI-Likeness', value: String(s.aiLikeness), suffix: '%', tone: aiTone(s.aiLikeness), status: `${report.ai.band} · ${report.ai.confidence} confidence`, pct: s.aiLikeness, hint: 'Estimated, not proof' },
    { label: 'Human Writing', value: String(s.human), suffix: '/100', tone: scoreTone(s.human), status: scoreLabel(s.human), pct: s.human, hint: 'Experience, specifics, voice' },
    { label: 'Search Intent', value: String(s.searchIntent), suffix: '/100', tone: scoreTone(s.searchIntent), status: report.seo.searchIntent.detected, pct: s.searchIntent, hint: `Expected: ${report.seo.searchIntent.expected}` },
    { label: 'Readability', value: String(s.readability), suffix: '/100', tone: scoreTone(s.readability), status: report.readability.difficulty, pct: s.readability, hint: `Flesch ${report.readability.fleschEase} · Grade ${report.readability.gradeLevel}` },
    { label: 'E-E-A-T', value: String(s.eeat), suffix: '/100', tone: scoreTone(s.eeat), status: scoreLabel(s.eeat), pct: s.eeat, hint: report.eeat.isYMYL ? 'YMYL topic: higher bar' : 'Trust & expertise signals' },
    { label: 'Originality / Specificity', value: String(s.originality), suffix: '/100', tone: scoreTone(s.originality), status: scoreLabel(s.originality), pct: s.originality, hint: 'Concrete, first-hand detail' },
    { label: 'Content Quality', value: String(s.quality), suffix: '/100', tone: scoreTone(s.quality), status: scoreLabel(s.quality), pct: s.quality, hint: '12 quality dimensions' },
    { label: 'Spam Risk', value: s.spamRisk, tone: riskTone(s.spamRisk), status: `${report.spam.reasons.length} factor(s)`, hint: 'Over-optimisation patterns' },
    {
      label: 'Compliance Risk',
      value: s.complianceRisk,
      tone: riskTone(s.complianceRisk),
      status: `${report.compliance.flags.length} flag(s)`,
      hint: report.compliance.applicable ? 'Healthcare review' : 'General advertising review',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:flex-row sm:text-left lg:flex-col lg:text-center">
          <ScoreRing score={s.overall} size={148} tone={scoreTone(s.overall)} label="/100" sub="Overall" />
          <div>
            <div className="text-sm font-medium text-slate-500">Overall Content Score</div>
            <div className={cx('text-xl font-semibold', TONE_STYLES[scoreTone(s.overall)].text)}>{scoreLabel(s.overall)}</div>
            <div className="mt-3 flex flex-wrap justify-center gap-3 text-xs text-slate-600 sm:justify-start lg:justify-center">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-600" aria-hidden />
                {counts.must} must fix
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-500" aria-hidden />
                {counts.should} should fix
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-yellow-400" aria-hidden />
                {counts.consider} consider
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {tiles.map((t) => (
            <div key={t.label} className="flex flex-col rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
              <div className="text-xs font-medium text-slate-500">{t.label}</div>
              <div className="mt-1 flex items-baseline gap-0.5">
                <span className="text-2xl font-bold tabular-nums text-slate-900">{t.value}</span>
                {t.suffix && <span className="text-sm text-slate-400">{t.suffix}</span>}
              </div>
              {t.pct !== undefined ? (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
                  <div className={cx('h-full rounded-full', TONE_STYLES[t.tone].bar)} style={{ width: `${Math.max(2, t.pct)}%` }} />
                </div>
              ) : (
                <div className={cx('mt-2 h-1.5 w-full rounded-full', TONE_STYLES[t.tone].bar)} aria-hidden />
              )}
              <div className={cx('mt-2 text-xs font-semibold', TONE_STYLES[t.tone].text)}>{t.status}</div>
              <div className="mt-auto pt-1 text-[11px] leading-snug text-slate-400">{t.hint}</div>
            </div>
          ))}
        </div>
      </div>
      <AIDisclaimer compact />
    </div>
  );
}
