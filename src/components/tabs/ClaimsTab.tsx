import { useMemo, useState } from 'react';
import type { AnalysisReport, ClaimType, RiskLevel } from '../../types/analysis';
import { Card, CopyButton, Quote, RiskBadge, ToneBadge, cx } from '../ui';

export function ClaimsTab({ report, onLocate }: { report: AnalysisReport; onLocate: (t: string) => void }) {
  const [risk, setRisk] = useState<RiskLevel | 'All'>('All');
  const [type, setType] = useState<ClaimType | 'All'>('All');
  const types = useMemo(() => [...new Set(report.claims.flatMap((c) => c.types))], [report]);
  const shown = report.claims.filter((c) => (risk === 'All' || c.risk === risk) && (type === 'All' || c.types.includes(type)));

  return (
    <div className="space-y-5">
      <Card title={`Claims requiring evidence (${report.claims.filter((c) => c.evidenceNeeded).length} of ${report.claims.length})`} subtitle="Statements that may need substantiation. No evidence is invented: placeholders mark where facts must be supplied.">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Risk:</span>
          {(['All', 'High', 'Medium', 'Low'] as const).map((r) => (
            <Chip key={r} active={risk === r} onClick={() => setRisk(r)}>
              {r} {r !== 'All' && `(${report.claims.filter((c) => c.risk === r).length})`}
            </Chip>
          ))}
          <span className="ml-3 text-xs font-medium text-slate-500">Type:</span>
          <select value={type} onChange={(e) => setType(e.target.value as ClaimType | 'All')} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
            <option value="All">All types</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
      </Card>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No claims match this filter.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge risk={c.risk} prefix="Risk" />
                {c.types.map((t) => (
                  <ToneBadge key={t} tone="neutral">
                    {t}
                  </ToneBadge>
                ))}
                <ToneBadge tone={c.evidenceNeeded ? 'warn' : 'good'}>{c.evidenceNeeded ? 'Evidence needed' : 'Source referenced'}</ToneBadge>
                <button type="button" onClick={() => onLocate(c.original)} className="ml-auto text-xs font-medium text-indigo-600 hover:underline">
                  Show in content →
                </button>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Original statement</div>
                  <Quote tone={c.risk === 'High' ? 'bad' : c.risk === 'Medium' ? 'warn' : 'fair'}>“{c.original}”</Quote>
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-800">Evidence: </span>
                    {c.evidenceNote}
                  </p>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Suggested modification</span>
                    <CopyButton text={c.suggestion} />
                  </div>
                  <Quote tone="good">{c.suggestion}</Quote>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cx('rounded-full border px-3 py-1 text-xs font-medium', active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')}>
      {children}
    </button>
  );
}
