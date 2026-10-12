import { useEffect, useRef, useState } from 'react';

export type ExportFormat = 'html' | 'markdown' | 'json' | 'print';

const OPTIONS: { id: ExportFormat; label: string; hint: string }[] = [
  { id: 'html', label: 'HTML report', hint: 'Styled, client-ready file' },
  { id: 'markdown', label: 'Markdown', hint: 'For docs, Notion, tickets' },
  { id: 'json', label: 'JSON', hint: 'Raw data for integrations' },
  { id: 'print', label: 'Print / Save as PDF', hint: 'Uses the browser print dialog' },
];

export function ExportMenu({ disabled, onExport }: { disabled: boolean; onExport: (f: ExportFormat) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        title={disabled ? 'Run an analysis first' : undefined}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Export Report ▾
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-1 w-64 rounded-lg border border-slate-200 bg-white p-1 shadow-lg sm:bottom-auto sm:top-full sm:mb-0 sm:mt-1">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-50"
              onClick={() => {
                onExport(o.id);
                setOpen(false);
              }}
            >
              <div className="text-sm font-medium text-slate-800">{o.label}</div>
              <div className="text-xs text-slate-500">{o.hint}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
