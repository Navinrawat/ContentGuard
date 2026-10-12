export const AI_DISCLAIMER =
  'AI-likeness is an estimated linguistic signal, not proof of AI authorship. No AI detector can reliably determine authorship with 100% accuracy. The score should be used as a content-quality diagnostic, not as evidence that content was written by AI.';

export function AIDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div role="note" className={`flex gap-3 rounded-lg border border-indigo-200 bg-indigo-50 ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white" aria-hidden>
        i
      </span>
      <p className={`leading-relaxed text-indigo-900 ${compact ? 'text-xs' : 'text-sm'}`}>
        <strong className="font-semibold">AI detection disclaimer: </strong>
        {AI_DISCLAIMER}
      </p>
    </div>
  );
}
