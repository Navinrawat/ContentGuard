import type { AnalysisReport } from '../../types/analysis';
import { TONE_STYLES, aiTone } from '../../utils/score';
import { AIDisclaimer } from '../Disclaimer';
import { BulletList, Card, CheckList, Quote, ScoreRing, Stat, ToneBadge, cx } from '../ui';

const BANDS = [
  { range: '0–20', label: 'Very Low' },
  { range: '21–40', label: 'Low' },
  { range: '41–60', label: 'Moderate' },
  { range: '61–80', label: 'High' },
  { range: '81–100', label: 'Very High' },
];

export function AIDetectionTab({ report }: { report: AnalysisReport }) {
  const { ai, human } = report;
  const tone = aiTone(ai.score);
  const detected = ai.signals.filter((s) => s.detected).sort((a, b) => b.strength - a.strength);
  const notDetected = ai.signals.filter((s) => !s.detected);

  return (
    <div className="space-y-5">
      <AIDisclaimer />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card title="AI-likeness estimate">
          <div className="flex flex-col items-center text-center">
            <ScoreRing score={ai.score} size={140} tone={tone} label="%" sub="AI-likeness" />
            <div className="mt-3 space-y-1">
              <div className="text-sm text-slate-600">
                AI-likeness: <strong className={TONE_STYLES[tone].text}>{ai.band}</strong>
              </div>
              <div className="text-sm text-slate-600">
                Estimated AI probability: <strong className="text-slate-900">{ai.score}%</strong>
              </div>
              <div className="text-sm text-slate-600">
                Confidence: <strong className="text-slate-900">{ai.confidence}</strong>
              </div>
            </div>
            <div className="mt-4 flex w-full overflow-hidden rounded-md border border-slate-200 text-[10px]">
              {BANDS.map((b) => (
                <div key={b.label} className={cx('flex-1 px-1 py-1.5', b.label === ai.band ? 'bg-slate-900 font-semibold text-white' : 'bg-slate-50 text-slate-500')}>
                  <div>{b.range}</div>
                  <div>{b.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Stat label="Sentence variation" value={ai.metrics.sentenceLengthVariation} hint="Higher = more human rhythm" />
            <Stat label="Paragraph symmetry" value={ai.metrics.paragraphSymmetry} hint="Lower = more uniform" />
            <Stat label="Transition openers" value={`${ai.metrics.transitionRate}%`} hint="of sentences" />
            <Stat label="Stock phrases" value={ai.metrics.clichePer1000} hint="per 1,000 words" />
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Why this score was given">
            <BulletList items={ai.reasons} />
          </Card>
          <Card title={`Signals detected (${detected.length} of ${ai.signals.length})`} subtitle="Each signal is weak on its own; the estimate reflects how many co-occur">
            {detected.length ? (
              <ol className="space-y-3">
                {detected.map((s, i) => (
                  <li key={s.id} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{s.name}</span>
                        <ToneBadge tone={s.strength >= 0.75 ? 'bad' : s.strength >= 0.5 ? 'warn' : 'fair'}>strength {Math.round(s.strength * 100)}%</ToneBadge>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">No AI-associated patterns reached the detection threshold.</p>
            )}
            {notDetected.length > 0 && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-medium text-slate-600">Signals checked but not detected ({notDetected.length})</summary>
                <ul className="mt-2 space-y-1.5 text-slate-500">
                  {notDetected.map((s) => (
                    <li key={s.id}>
                      <span className="font-medium text-slate-700">{s.name}:</span> {s.detail}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
        </div>
      </div>

      <Card title="Examples from the content" subtitle="Specific passages that contributed to the estimate">
        {ai.examples.length ? (
          <ul className="space-y-3">
            {ai.examples.map((e, i) => (
              <li key={i}>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{e.signal}</div>
                <Quote tone="warn">“{e.text}”</Quote>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No example passages to highlight.</p>
        )}
      </Card>

      <Card title={`Human writing analysis: ${human.score}/100`} subtitle="Signals of experience, specificity and a natural voice">
        <div className="mb-4">
          <BulletList items={human.summary} />
        </div>
        <CheckList checks={human.checks} columns={2} />
      </Card>
    </div>
  );
}
