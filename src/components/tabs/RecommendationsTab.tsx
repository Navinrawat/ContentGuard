import { useState } from 'react';
import type { AnalysisReport, Severity } from '../../types/analysis';
import { SEVERITY_META, TONE_STYLES } from '../../utils/score';
import { IssueCard } from '../IssueCard';
import { BulletList, Card, CopyButton, Quote, cx } from '../ui';

const ORDER: Severity[] = ['must', 'should', 'consider', 'good'];

export function RecommendationsTab({ report, onLocate }: { report: AnalysisReport; onLocate: (t: string) => void }) {
  const [active, setActive] = useState<Severity | 'all'>('all');
  const r = report.rewrites;
  const groups = ORDER.map((s) => ({ s, items: report.issues.filter((i) => i.severity === s) }));

  return (
    <div className="space-y-5">
      <Card title="Final action plan" subtitle="Each item shows the exact issue, the sentence or section, why it matters and the recommended action">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {groups.map(({ s, items }) => {
            const m = SEVERITY_META[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => setActive(active === s ? 'all' : s)}
                className={cx('rounded-lg border p-3 text-left transition', TONE_STYLES[m.tone].border, active === s ? TONE_STYLES[m.tone].soft + ' ring-2 ring-offset-1 ring-slate-300' : 'bg-white hover:bg-slate-50')}
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden>{m.emoji}</span>
                  <span className="text-sm font-semibold text-slate-900">{m.label.toUpperCase()}</span>
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{items.length}</div>
                <div className="text-xs text-slate-500">{m.description}</div>
              </button>
            );
          })}
        </div>
      </Card>

      {groups
        .filter((g) => active === 'all' || g.s === active)
        .map(({ s, items }) =>
          items.length ? (
            <section key={s}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span aria-hidden>{SEVERITY_META[s].emoji}</span>
                {SEVERITY_META[s].label.toUpperCase()} ({items.length})
              </h3>
              <div className="grid gap-2.5 lg:grid-cols-2">
                {items.map((i) => (
                  <IssueCard key={i.id} issue={i} onLocate={i.original ? onLocate : undefined} />
                ))}
              </div>
            </section>
          ) : null,
        )}

      <Card title="SEO rewrite suggestions" subtitle="Metadata, structure and sentence-level fixes only. The full article is not rewritten.">
        <div className="grid gap-5 lg:grid-cols-2">
          <Suggestion label="1. Suggested SEO title" text={r.seoTitle} meta={`${r.seoTitle.length} characters`} />
          <Suggestion label="2. Suggested meta description" text={r.metaDescription} meta={`${r.metaDescription.length} characters`} />
          <Suggestion label="3. Suggested H1" text={r.h1} />
          {r.cta && <Suggestion label="9. CTA suggestion" text={r.cta} />}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <Header label="4. Suggested H2 structure" copy={r.h2Structure.map((h) => h.replace(/\s+[✓+].*$/, '')).join('\n')} />
            <ol className="space-y-1.5">
              {r.h2Structure.map((h, i) => {
                const existing = h.includes('✓');
                return (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-right text-xs tabular-nums text-slate-400">{i + 1}.</span>
                    <span className="rounded bg-slate-100 px-1.5 font-mono text-[10px] text-slate-500">H2</span>
                    <span className="text-slate-800">{h.replace(/\s+[✓+].*$/, '')}</span>
                    <span className={cx('ml-auto text-[11px] font-medium', existing ? 'text-emerald-600' : 'text-orange-600')}>{existing ? 'existing' : 'add'}</span>
                  </li>
                );
              })}
            </ol>
          </div>
          <div>
            <Header label="5. Missing topics" />
            <BulletList items={r.missingTopics} empty="No missing topics." />
            <div className="mt-5">
              <Header label="6. FAQ suggestions" copy={r.faqs.join('\n')} />
              <BulletList items={r.faqs} empty="Common questions are already covered." />
            </div>
          </div>
          <div>
            <Header label="7. Internal linking suggestions" />
            <ul className="space-y-2">
              {r.internalLinks.map((l, i) => (
                <li key={i} className="rounded-lg border border-slate-200 p-2.5 text-sm">
                  <div>
                    Anchor <span className="font-medium text-indigo-700">“{l.anchor}”</span> → <span className="text-slate-700">{l.target}</span>
                  </div>
                  <div className="text-xs text-slate-500">{l.reason}</div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Header label="8. External source / citation suggestions" />
            <ul className="space-y-2">
              {r.externalSources.map((s, i) => (
                <li key={i} className="rounded-lg border border-slate-200 p-2.5 text-sm">
                  <div className="font-medium text-slate-800">{s.source}</div>
                  <div className="text-xs text-slate-500">Use for: {s.useFor}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <Card title={`Sentence-level rewrites (${r.sentenceRewrites.length})`} subtitle="Only sentences with a clear issue">
        {r.sentenceRewrites.length ? (
          <ul className="space-y-4">
            {r.sentenceRewrites.map((s, i) => (
              <li key={i} className="grid gap-2 rounded-lg border border-slate-200 p-3 lg:grid-cols-2">
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Original · {s.issue}</div>
                  <Quote tone="warn">{s.original}</Quote>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Suggested
                    <CopyButton text={s.rewrite} />
                  </div>
                  <Quote tone="good">{s.rewrite}</Quote>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No sentence needs a rewrite.</p>
        )}
      </Card>
    </div>
  );
}

function Header({ label, copy }: { label: string; copy?: string }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h4 className="text-sm font-semibold text-slate-900">{label}</h4>
      {copy && <CopyButton text={copy} label="Copy all" />}
    </div>
  );
}

function Suggestion({ label, text, meta }: { label: string; text: string; meta?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">{label}</h4>
        <div className="flex items-center gap-2">
          {meta && <span className="text-xs tabular-nums text-slate-400">{meta}</span>}
          <CopyButton text={text} />
        </div>
      </div>
      <Quote tone="neutral">{text}</Quote>
    </div>
  );
}
