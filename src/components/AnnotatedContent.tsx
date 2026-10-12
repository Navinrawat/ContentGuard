import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnalysisReport, Issue, Severity } from '../types/analysis';
import { splitSentences } from '../engine/text';
import { IssueCard } from './IssueCard';
import { cx } from './ui';

const ORDER: Severity[] = ['must', 'should', 'consider', 'good'];
const HIGHLIGHT: Record<Severity, string> = {
  must: 'bg-red-100 decoration-red-500 hover:bg-red-200',
  should: 'bg-orange-100 decoration-orange-500 hover:bg-orange-200',
  consider: 'bg-yellow-100 decoration-yellow-500 hover:bg-yellow-200',
  good: '',
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Match an issue's original text to a rendered sentence without fragment false positives. */
function sameText(original: string, sentence: string): boolean {
  if (original === sentence) return true;
  const [short, long] = original.length < sentence.length ? [original, sentence] : [sentence, original];
  return short.length > 20 && short.length / long.length >= 0.6 && long.includes(short);
}

/** Renders the parsed document with flagged sentences highlighted; click a highlight to see its issues. */
export function AnnotatedContent({ report, locate }: { report: AnalysisReport; locate?: string | null }) {
  const [selected, setSelected] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const issuesWithText = useMemo(() => report.issues.filter((i) => i.original && i.severity !== 'good'), [report]);

  const issuesFor = (sentence: string): Issue[] => {
    const n = norm(sentence);
    if (n.length < 8) return [];
    return issuesWithText.filter((i) => sameText(norm(i.original!), n));
  };

  useEffect(() => {
    if (!locate || !containerRef.current) return;
    const target = norm(locate);
    const els = [...containerRef.current.querySelectorAll<HTMLElement>('[data-sentence]')];
    const el = els.find((e) => sameText(target, norm(e.dataset.sentence || ''))) || els.find((e) => target.includes(norm(e.dataset.sentence || '')) && (e.dataset.sentence || '').length > 20);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setSelected(el.dataset.sentence || null);
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1600);
    }
  }, [locate]);

  const selectedIssues = selected ? issuesFor(selected) : [];
  const flaggedCount = report.document.blocks.reduce((n, b) => n + splitSentences(b.text).filter((s) => issuesFor(s).length).length, 0);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <div className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">Annotated content</h3>
            <p className="text-xs text-slate-500">{flaggedCount} flagged sentence(s). Click a highlight to see the issue.</p>
          </div>
          <div className="flex gap-3 text-xs text-slate-600">
            <Legend cls="bg-red-200" label="Must fix" />
            <Legend cls="bg-orange-200" label="Should fix" />
            <Legend cls="bg-yellow-200" label="Consider" />
          </div>
        </div>
        <div ref={containerRef} className="max-h-[640px] space-y-3 overflow-y-auto px-5 py-4 text-[15px] leading-7 text-slate-800">
          {report.document.blocks.map((b, bi) => {
            const parts = splitSentences(b.text);
            const content = (parts.length ? parts : [b.text]).map((s, si) => {
              const iss = issuesFor(s);
              const top = iss.map((i) => i.severity).sort((a, c) => ORDER.indexOf(a) - ORDER.indexOf(c))[0];
              return (
                <span key={si}>
                  {iss.length ? (
                    <button
                      type="button"
                      data-sentence={s}
                      onClick={() => setSelected(s)}
                      className={cx('rounded px-0.5 text-left underline decoration-2 underline-offset-4 transition-colors', HIGHLIGHT[top], selected === s && 'ring-2 ring-indigo-400')}
                      title={`${iss.length} issue(s)`}
                    >
                      {s}
                    </button>
                  ) : (
                    <span data-sentence={s}>{s}</span>
                  )}{' '}
                </span>
              );
            });
            const tag = b.type;
            if (tag === 'h1') return <h1 key={bi} className="text-2xl font-bold leading-tight text-slate-900"><Tag t="H1" />{content}</h1>;
            if (tag === 'h2') return <h2 key={bi} className="pt-2 text-xl font-semibold text-slate-900"><Tag t="H2" />{content}</h2>;
            if (tag === 'h3' || tag === 'h4') return <h3 key={bi} className="text-base font-semibold text-slate-900"><Tag t={tag.toUpperCase()} />{content}</h3>;
            if (tag === 'li') return <div key={bi} className="flex gap-2 pl-2"><span className="text-slate-400">•</span><div>{content}</div></div>;
            if (tag === 'quote') return <blockquote key={bi} className="border-l-4 border-slate-300 pl-3 italic text-slate-600">{content}</blockquote>;
            return <p key={bi}>{content}</p>;
          })}
        </div>
      </div>
      <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
        {selected ? (
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">{selectedIssues.length} issue(s) for this sentence</h4>
              <button type="button" className="text-xs text-slate-500 hover:text-slate-800" onClick={() => setSelected(null)}>
                Close ✕
              </button>
            </div>
            {selectedIssues.map((i) => (
              <IssueCard key={i.id} issue={i} defaultOpen={selectedIssues.length <= 2} />
            ))}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">Select a highlighted sentence to see the original text, problem, explanation and a suggested improvement.</div>
        )}
      </aside>
    </div>
  );
}

function Tag({ t }: { t: string }) {
  return <span className="mr-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 align-middle font-mono text-[10px] font-medium text-slate-500">{t}</span>;
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cx('h-3 w-3 rounded-sm', cls)} aria-hidden />
      {label}
    </span>
  );
}
