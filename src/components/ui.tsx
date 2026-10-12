import { useState, type ReactNode } from 'react';
import type { Check, RiskLevel, Severity } from '../types/analysis';
import { CHECK_META, SEVERITY_META, TONE_STYLES, riskTone, scoreTone, type Tone } from '../utils/score';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

export function Card({ children, className, title, subtitle, action }: { children: ReactNode; className?: string; title?: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function ToneBadge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  const t = TONE_STYLES[tone];
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', t.soft, t.text, t.border, className)}>{children}</span>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const m = SEVERITY_META[severity];
  return (
    <ToneBadge tone={m.tone}>
      <span className={cx('h-2 w-2 rounded-full', TONE_STYLES[m.tone].bg)} aria-hidden />
      {m.short}
    </ToneBadge>
  );
}

export function RiskBadge({ risk, prefix }: { risk: RiskLevel; prefix?: string }) {
  return (
    <ToneBadge tone={riskTone(risk)}>
      <span className={cx('h-2 w-2 rounded-full', TONE_STYLES[riskTone(risk)].bg)} aria-hidden />
      {prefix ? `${prefix}: ` : ''}
      {risk}
    </ToneBadge>
  );
}

export function StatusIcon({ status }: { status: Check['status'] }) {
  const m = CHECK_META[status];
  return (
    <span className={cx('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white', TONE_STYLES[m.tone].bg)} aria-label={m.label} title={m.label}>
      {m.icon}
    </span>
  );
}

export function CheckList({ checks, columns = 1 }: { checks: Check[]; columns?: 1 | 2 }) {
  return (
    <ul className={cx('grid gap-x-6 gap-y-3', columns === 2 && 'md:grid-cols-2')}>
      {checks.map((c) => (
        <li key={c.id} className="flex gap-3">
          <StatusIcon status={c.status} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-800">{c.label}</span>
              <span className={cx('text-[11px] font-semibold uppercase tracking-wide', TONE_STYLES[CHECK_META[c.status].tone].text)}>{CHECK_META[c.status].label}</span>
            </div>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{c.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ScoreBar({ label, score, note, invert }: { label: string; score: number; note?: string; invert?: boolean }) {
  const tone = invert ? scoreTone(100 - score) : scoreTone(score);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">
          {score}
          <span className="text-xs font-normal text-slate-400">/100</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={cx('h-full rounded-full', TONE_STYLES[tone].bar)} style={{ width: `${Math.max(2, score)}%` }} />
      </div>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

export function ScoreRing({ score, size = 120, tone, label, sub }: { score: number; size?: number; tone: Tone; label?: string; sub?: string }) {
  const stroke = size > 100 ? 10 : 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="stroke-slate-100" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} className={TONE_STYLES[tone].ring} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: 'stroke-dashoffset 600ms ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={cx('font-bold tabular-nums text-slate-900', size > 100 ? 'text-3xl' : 'text-lg')}>
          {score}
          {label && <span className="text-sm font-medium text-slate-400">{label}</span>}
        </span>
        {sub && <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{sub}</span>}
      </div>
    </div>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        });
      }}
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    >
      {done ? '✓ Copied' : label}
    </button>
  );
}

export function Quote({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <blockquote className={cx('rounded-lg border-l-4 px-3 py-2 text-sm leading-relaxed text-slate-800', TONE_STYLES[tone].soft, TONE_STYLES[tone].left)}>{children}</blockquote>;
}

export function TagList({ items, tone = 'neutral', empty = 'None' }: { items: string[]; tone?: Tone; empty?: string }) {
  if (!items.length) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <ToneBadge key={i} tone={tone} className="whitespace-normal text-left">
          {i}
        </ToneBadge>
      ))}
    </div>
  );
}

export function BulletList({ items, empty = 'None' }: { items: ReactNode[]; empty?: string }) {
  if (!items.length) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-700">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />
          <span className="min-w-0">{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
