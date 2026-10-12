import { useEffect, useRef, useState } from 'react';
import type { AnalysisInput, AnalysisReport } from './types/analysis';
import { heuristicProvider, resolveProvider, type AnalysisProvider } from './services/providers';
import { EMPTY_FORM, InputPanel, type FormState } from './components/InputPanel';
import type { ExportFormat } from './components/ExportMenu';
import { ReportView } from './components/ReportView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AIDisclaimer } from './components/Disclaimer';
import { exportHTML, exportJSON, exportMarkdown, printReport } from './utils/export';
import { htmlToText } from './utils/sanitize';

export default function App() {
  const [provider, setProvider] = useState<AnalysisProvider>(heuristicProvider);
  useEffect(() => {
    resolveProvider().then(setProvider);
  }, []);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const reportRef = useRef<HTMLDivElement>(null);

  const analyze = async () => {
    const words = (htmlToText(form.content).match(/\S+/g) || []).length;
    if (words < 30) {
      setError('Please paste at least 30 words of content to analyse.');
      return;
    }
    setError(undefined);
    setLoading(true);
    const input: AnalysisInput = {
      ...form,
      primaryKeyword: form.primaryKeyword.trim(),
      secondaryKeywords: form.secondaryKeywords.split(',').map((s) => s.trim()).filter(Boolean),
    };
    try {
      const r = await provider.analyze(input);
      setReport(r);
      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const onExport = (f: ExportFormat) => {
    if (!report) return;
    if (f === 'html') exportHTML(report);
    else if (f === 'markdown') exportMarkdown(report);
    else if (f === 'json') exportJSON(report);
    else printReport(report);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-slate-900">ContentGuard AI</h1>
              <p className="text-xs text-slate-500">Content audit · SEO · E-E-A-T · Compliance</p>
            </div>
          </div>
          <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 sm:inline-flex">Engine: {provider.label}</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <InputPanel
          form={form}
          setForm={setForm}
          onAnalyze={analyze}
          onClear={() => {
            setForm(EMPTY_FORM);
            setReport(null);
            setError(undefined);
          }}
          onExport={onExport}
          loading={loading}
          canExport={!!report}
          error={error}
        />

        <div ref={reportRef} className="scroll-mt-4">
          {report ? (
            <ErrorBoundary key={report.id}>
              <ReportView report={report} />
            </ErrorBoundary>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['AI-likeness', 'Probability estimate from 12 linguistic signals, with examples'],
                  ['SEO & intent', '25 on-page checks, keyword placement, topics, snippets'],
                  ['E-E-A-T & quality', 'Experience, expertise, trust, readability, specificity'],
                  ['Claims & compliance', 'Evidence-needed claims and healthcare risk wording'],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">{t}</div>
                    <div className="mt-1 text-sm text-slate-500">{d}</div>
                  </div>
                ))}
              </div>
              <AIDisclaimer />
            </div>
          )}
        </div>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-slate-400 sm:px-6">
        ContentGuard AI provides heuristic diagnostics for editorial review. AI-likeness scores are estimates, not proof of authorship. Compliance flags are potential risks, not legal advice.
      </footer>
    </div>
  );
}
