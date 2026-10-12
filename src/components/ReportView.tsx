import { useState } from 'react';
import type { AnalysisReport } from '../types/analysis';
import { CONTENT_TYPE_LABELS, INDUSTRY_LABELS } from '../engine/lexicon';
import { ScoreDashboard } from './ScoreDashboard';
import { AIDetectionTab } from './tabs/AIDetectionTab';
import { ClaimsTab } from './tabs/ClaimsTab';
import { ComplianceTab } from './tabs/ComplianceTab';
import { EEATTab } from './tabs/EEATTab';
import { OverviewTab } from './tabs/OverviewTab';
import { QualityTab } from './tabs/QualityTab';
import { RecommendationsTab } from './tabs/RecommendationsTab';
import { SEOTab } from './tabs/SEOTab';
import { cx } from './ui';

export type TabId = 'overview' | 'ai' | 'seo' | 'quality' | 'eeat' | 'claims' | 'compliance' | 'recommendations';

export function ReportView({ report }: { report: AnalysisReport }) {
  const [tab, setTab] = useState<TabId>('overview');
  const [locate, setLocate] = useState<string | null>(null);

  const onLocate = (text: string) => {
    setTab('overview');
    // New object identity each time so repeated clicks re-trigger the scroll.
    setLocate(null);
    setTimeout(() => setLocate(text), 50);
  };

  const mustCount = report.issues.filter((i) => i.severity === 'must').length;
  const tabs: { id: TabId; label: string; badge?: number | string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'ai', label: 'AI Detection', badge: `${report.scores.aiLikeness}%` },
    { id: 'seo', label: 'SEO', badge: report.scores.seo },
    { id: 'quality', label: 'Content Quality', badge: report.scores.quality },
    { id: 'eeat', label: 'E-E-A-T', badge: report.scores.eeat },
    { id: 'claims', label: 'Claims', badge: report.claims.length },
    { id: 'compliance', label: 'Compliance', badge: report.compliance.flags.length },
    { id: 'recommendations', label: 'Recommendations', badge: mustCount || undefined },
  ];

  return (
    <div className="space-y-5" id="report">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Audit report</h2>
          <p className="text-sm text-slate-500">
            {CONTENT_TYPE_LABELS[report.input.contentType]} · {INDUSTRY_LABELS[report.input.industry]}
            {report.input.primaryKeyword && <> · “{report.input.primaryKeyword}”</>}
            {report.input.targetLocation && <> · {report.input.targetLocation}</>}
          </p>
        </div>
        <p className="text-xs text-slate-400">
          {new Date(report.createdAt).toLocaleString()} · {report.engine.label}
        </p>
      </div>

      <ScoreDashboard report={report} />

      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 backdrop-blur sm:mx-0 sm:rounded-t-lg sm:px-0 print:hidden">
        <nav className="no-scrollbar flex gap-1 overflow-x-auto" role="tablist" aria-label="Report sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-600 hover:text-slate-900',
              )}
            >
              {t.label}
              {t.badge !== undefined && (
                <span className={cx('rounded-full px-1.5 py-0.5 text-[11px] tabular-nums', t.id === 'recommendations' ? 'bg-red-100 text-red-700' : tab === t.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600')}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div role="tabpanel">
        {tab === 'overview' && <OverviewTab report={report} locate={locate} onLocate={onLocate} onViewAll={() => setTab('recommendations')} />}
        {tab === 'ai' && <AIDetectionTab report={report} />}
        {tab === 'seo' && <SEOTab report={report} />}
        {tab === 'quality' && <QualityTab report={report} />}
        {tab === 'eeat' && <EEATTab report={report} />}
        {tab === 'claims' && <ClaimsTab report={report} onLocate={onLocate} />}
        {tab === 'compliance' && <ComplianceTab report={report} onLocate={onLocate} />}
        {tab === 'recommendations' && <RecommendationsTab report={report} onLocate={onLocate} />}
      </div>
    </div>
  );
}
