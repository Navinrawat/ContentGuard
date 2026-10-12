import { useState } from 'react';
import type { ContentType, Industry } from '../types/analysis';
import { CONTENT_TYPE_LABELS, INDUSTRY_LABELS, isHealthcare } from '../engine/lexicon';
import { SAMPLES } from '../data/samples';
import { htmlToText, markdownToHtml } from '../utils/sanitize';
import { RichTextEditor } from './RichTextEditor';
import { ExportMenu, type ExportFormat } from './ExportMenu';
import { cx } from './ui';

export interface FormState {
  contentType: ContentType;
  industry: Industry;
  primaryKeyword: string;
  secondaryKeywords: string;
  targetLocation: string;
  targetAudience: string;
  websiteUrl: string;
  content: string;
}

export const EMPTY_FORM: FormState = {
  contentType: 'blog',
  industry: 'other',
  primaryKeyword: '',
  secondaryKeywords: '',
  targetLocation: '',
  targetAudience: '',
  websiteUrl: '',
  content: '',
};

interface Props {
  form: FormState;
  setForm: (f: FormState) => void;
  onAnalyze: () => void;
  onClear: () => void;
  onExport: (f: ExportFormat) => void;
  loading: boolean;
  canExport: boolean;
  error?: string;
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';

export function InputPanel({ form, setForm, onAnalyze, onClear, onExport, loading, canExport, error }: Props) {
  const [showSamples, setShowSamples] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm({ ...form, [k]: v });
  const words = form.content ? (htmlToText(form.content).match(/\S+/g) || []).length : 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Content to audit</h2>
          <p className="text-sm text-slate-500">Paste page copy (HTML, Markdown or plain text). Headings are used for the structure analysis.</p>
        </div>
        <div className="relative">
          <button type="button" onClick={() => setShowSamples((s) => !s)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Load sample ▾
          </button>
          {showSamples && (
            <div className="absolute left-0 z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg md:left-auto md:right-0 border border-slate-200 bg-white p-1 shadow-lg">
              {SAMPLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setForm({ ...s.input, secondaryKeywords: s.input.secondaryKeywords.join(', '), content: markdownToHtml(s.input.content) });
                    setShowSamples(false);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Field label="Content type" htmlFor="ct">
            <select id="ct" className={inputCls} value={form.contentType} onChange={(e) => set('contentType', e.target.value as ContentType)}>
              {Object.entries(CONTENT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Industry" htmlFor="ind" hint={isHealthcare(form.industry) ? 'Healthcare compliance review will run' : undefined}>
            <select id="ind" className={inputCls} value={form.industry} onChange={(e) => set('industry', e.target.value as Industry)}>
              {Object.entries(INDUSTRY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Primary keyword" optional htmlFor="pk">
            <input id="pk" className={inputCls} value={form.primaryKeyword} onChange={(e) => set('primaryKeyword', e.target.value)} placeholder="e.g. laser hair removal london" />
          </Field>
          <Field label="Secondary keywords" optional htmlFor="sk" hint="Comma-separated">
            <input id="sk" className={inputCls} value={form.secondaryKeywords} onChange={(e) => set('secondaryKeywords', e.target.value)} placeholder="cost, recovery, side effects" />
          </Field>
          <Field label="Target location" optional htmlFor="loc">
            <input id="loc" className={inputCls} value={form.targetLocation} onChange={(e) => set('targetLocation', e.target.value)} placeholder="e.g. Manchester" />
          </Field>
          <Field label="Target audience" optional htmlFor="aud">
            <input id="aud" className={inputCls} value={form.targetAudience} onChange={(e) => set('targetAudience', e.target.value)} placeholder="e.g. first-time patients" />
          </Field>
          <Field label="Website URL" optional htmlFor="url" className="sm:col-span-2 lg:col-span-1">
            <input id="url" type="url" className={inputCls} value={form.websiteUrl} onChange={(e) => set('websiteUrl', e.target.value)} placeholder="https://www.client-site.com" />
          </Field>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <label className="text-sm font-medium text-slate-700">Content</label>
            <span className="text-xs tabular-nums text-slate-400">{words.toLocaleString()} words</span>
          </div>
          <RichTextEditor value={form.content} onChange={(html) => set('content', html)} placeholder="Paste your page content here. Use the toolbar (or # Markdown) to mark H1/H2/H3 headings…" />
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAnalyze}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-70"
            >
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
              {loading ? 'Analyzing…' : 'Analyze Content'}
            </button>
            <button type="button" onClick={onClear} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Clear
            </button>
            <ExportMenu disabled={!canExport} onExport={onExport} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children, optional, hint, htmlFor, className }: { label: string; children: React.ReactNode; optional?: boolean; hint?: string; htmlFor: string; className?: string }) {
  return (
    <div className={cx('min-w-0', className)}>
      <label htmlFor={htmlFor} className="mb-1 flex items-baseline gap-1.5 text-sm font-medium text-slate-700">
        {label}
        {optional && <span className="text-xs font-normal text-slate-400">optional</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
