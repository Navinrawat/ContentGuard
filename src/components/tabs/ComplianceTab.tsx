import { useState } from 'react';
import type { AnalysisReport, RiskLevel } from '../../types/analysis';
import { Card, CopyButton, Quote, RiskBadge, ToneBadge } from '../ui';
import { Chip } from './ClaimsTab';

export function ComplianceTab({ report, onLocate }: { report: AnalysisReport; onLocate: (t: string) => void }) {
  const { compliance } = report;
  const [risk, setRisk] = useState<RiskLevel | 'All'>('All');
  const shown = compliance.flags.filter((f) => risk === 'All' || f.risk === risk);
  const byIssue = compliance.flags.reduce<Record<string, number>>((m, f) => ((m[f.issue] = (m[f.issue] || 0) + 1), m), {});

  return (
    <div className="space-y-5">
      <Card
        title={compliance.applicable ? 'Healthcare / medical compliance-risk review' : 'Advertising claims review'}
        action={<RiskBadge risk={compliance.risk} prefix="Overall risk" />}
      >
        <div className="space-y-2">
          {compliance.notes.map((n, i) => (
            <p key={i} className="text-sm leading-relaxed text-slate-600">
              {n}
            </p>
          ))}
        </div>
        {Object.keys(byIssue).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {Object.entries(byIssue).map(([k, v]) => (
              <ToneBadge key={k} tone="neutral">
                {k} · {v}
              </ToneBadge>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {(['All', 'High', 'Medium', 'Low'] as const).map((r) => (
            <Chip key={r} active={risk === r} onClick={() => setRisk(r)}>
              {r} {r !== 'All' && `(${compliance.flags.filter((f) => f.risk === r).length})`}
            </Chip>
          ))}
        </div>
      </Card>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          {compliance.flags.length ? 'No flags match this filter.' : 'No potential compliance-risk wording detected. Factual claims should still be verified.'}
        </p>
      ) : (
        <div className="space-y-3">
          {shown.map((f) => (
            <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge risk={f.risk} prefix="Risk" />
                <span className="text-sm font-semibold text-slate-900">{f.issue}</span>
                <span className="text-xs text-slate-500">triggered by “{f.trigger}”</span>
                <button type="button" onClick={() => onLocate(f.original)} className="ml-auto text-xs font-medium text-indigo-600 hover:underline">
                  Show in content →
                </button>
              </div>
              <dl className="mt-3 grid gap-3 lg:grid-cols-2">
                <div>
                  <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Original</dt>
                  <dd>
                    <Quote tone={f.risk === 'High' ? 'bad' : f.risk === 'Medium' ? 'warn' : 'fair'}>“{f.original}”</Quote>
                  </dd>
                  <dt className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Issue</dt>
                  <dd className="text-sm leading-relaxed text-slate-700">{f.explanation}</dd>
                </div>
                <div>
                  <dt className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Suggested safer version
                    <CopyButton text={f.saferVersion} />
                  </dt>
                  <dd>
                    <Quote tone="good">{f.saferVersion}</Quote>
                  </dd>
                  <p className="mt-2 text-xs text-slate-500">Review before publishing. [Bracketed] text marks facts you must verify or supply.</p>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">ContentGuard AI flags potential compliance risk for human review. It does not determine whether content is legally permitted and is not legal or regulatory advice.</p>
    </div>
  );
}
