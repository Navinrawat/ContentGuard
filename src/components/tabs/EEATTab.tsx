import type { AnalysisReport, EEATSignal } from '../../types/analysis';
import { scoreTone } from '../../utils/score';
import { Card, ScoreRing, ToneBadge, cx } from '../ui';

const PILLARS: { id: EEATSignal['pillar']; label: string; desc: string }[] = [
  { id: 'experience', label: 'Experience', desc: 'First-hand, lived experience of the topic' },
  { id: 'expertise', label: 'Expertise', desc: 'Qualifications and knowledge of the author/reviewer' },
  { id: 'authoritativeness', label: 'Authoritativeness', desc: 'Recognition, references and reputation' },
  { id: 'trustworthiness', label: 'Trustworthiness', desc: 'Accuracy, transparency and balanced information' },
];

export function EEATTab({ report }: { report: AnalysisReport }) {
  const { eeat } = report;
  return (
    <div className="space-y-5">
      <Card title={`E-E-A-T score: ${eeat.overall}/100`} subtitle={eeat.isYMYL ? 'YMYL topic: expertise and trust are weighted more heavily' : 'Experience, Expertise, Authoritativeness, Trustworthiness'}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {PILLARS.map((p) => {
            const v = eeat[p.id];
            return (
              <div key={p.id} className="flex flex-col items-center rounded-lg border border-slate-200 p-4 text-center">
                <ScoreRing score={v} size={84} tone={scoreTone(v)} />
                <div className="mt-2 text-sm font-semibold text-slate-900">{p.label}</div>
                <div className="text-xs text-slate-500">{p.desc}</div>
              </div>
            );
          })}
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        {PILLARS.map((p) => (
          <Card key={p.id} title={`${p.label} signals`}>
            <ul className="space-y-3">
              {eeat.signals
                .filter((s) => s.pillar === p.id)
                .map((s) => (
                  <li key={s.id} className="flex gap-3">
                    <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white', s.found ? 'bg-emerald-600' : 'bg-red-500')} aria-hidden>
                      {s.found ? '✓' : '✕'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{s.label}</span>
                        <ToneBadge tone={s.found ? 'good' : 'bad'}>{s.found ? 'Found' : 'Missing'}</ToneBadge>
                      </div>
                      {s.found && s.evidence ? <p className="mt-0.5 text-sm italic text-slate-500">“{s.evidence}”</p> : <p className="mt-0.5 text-sm text-slate-600">{s.recommendation}</p>}
                    </div>
                  </li>
                ))}
            </ul>
          </Card>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Signals are detected in the pasted content only. Author boxes, schema, bylines and About pages that live elsewhere on the site will not be visible here. Verify on the live page.
      </p>
    </div>
  );
}
