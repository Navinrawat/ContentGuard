import { useState } from 'react';
import type { Issue } from '../types/analysis';
import { SEVERITY_META, TONE_STYLES } from '../utils/score';
import { CopyButton, Quote, SeverityBadge, cx } from './ui';

const CATEGORY_LABELS: Record<Issue['category'], string> = {
  ai: 'AI-likeness',
  human: 'Human writing',
  seo: 'SEO',
  keyword: 'Keyword',
  structure: 'Structure',
  readability: 'Readability',
  quality: 'Quality',
  eeat: 'E-E-A-T',
  claims: 'Claims',
  compliance: 'Compliance',
  'page-type': 'Page type',
  spam: 'Spam risk',
};

export function IssueCard({ issue, defaultOpen = false, onLocate }: { issue: Issue; defaultOpen?: boolean; onLocate?: (text: string) => void }) {
  const [open, setOpen] = useState(defaultOpen);
  const tone = SEVERITY_META[issue.severity].tone;
  const quoted = issue.original?.replace(/^["“]|["”]$/g, "");
  return (
    <div className={cx('overflow-hidden rounded-lg border bg-white transition-shadow', open ? 'shadow-md' : 'hover:shadow-sm', TONE_STYLES[tone].border)}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <span className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', TONE_STYLES[tone].bg)} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{issue.title}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <SeverityBadge severity={issue.severity} />
            <span>{CATEGORY_LABELS[issue.category]}</span>
            {issue.location && <span>· {issue.location}</span>}
          </div>
          {!open && issue.original && <p className="mt-1.5 line-clamp-1 text-sm italic text-slate-500">“{quoted}”</p>}
        </div>
        <span className={cx('mt-0.5 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 px-4 py-4 text-sm">
          {issue.original && (
            <Field label="Original text">
              <Quote tone={tone}>“{quoted}”</Quote>
              {onLocate && (
                <button type="button" onClick={() => onLocate(issue.original!)} className="mt-1.5 text-xs font-medium text-indigo-600 hover:underline">
                  Show in content →
                </button>
              )}
            </Field>
          )}
          <Field label="Problem">
            <p className="leading-relaxed text-slate-700">{issue.problem}</p>
          </Field>
          <Field label="Why it matters">
            <p className="leading-relaxed text-slate-700">{issue.explanation}</p>
          </Field>
          <Field label="Recommended action">
            <p className="leading-relaxed text-slate-700">{issue.suggestion}</p>
          </Field>
          {issue.rewrite && (
            <Field label="Suggested improvement" action={<CopyButton text={issue.rewrite} />}>
              <Quote tone="good">{issue.rewrite}</Quote>
            </Field>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, action }: { label: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}
