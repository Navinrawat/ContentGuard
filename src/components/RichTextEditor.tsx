import { useEffect, useRef, useState } from 'react';
import { markdownToHtml, sanitizeHtml } from '../utils/sanitize';
import { cx } from './ui';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

type Tool = { label: string; title: string; run: () => void; className?: string };

/**
 * Lightweight rich-text editor. Heading markup matters for the SEO analysis, so the
 * toolbar focuses on block structure. Pasted HTML is sanitised; pasted plain text is
 * parsed as Markdown so "# Heading" lines become real headings.
 */
export function RichTextEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>('');
  const [empty, setEmpty] = useState(!value);

  // Only overwrite the DOM when the value changes from outside (sample load, clear).
  useEffect(() => {
    if (ref.current && value !== lastEmitted.current) {
      ref.current.innerHTML = value;
      lastEmitted.current = value;
      setEmpty(!ref.current.textContent?.trim());
    }
  }, [value]);

  const emit = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastEmitted.current = html;
    setEmpty(!ref.current.textContent?.trim());
    onChange(html);
  };

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    emit();
  };

  const tools: Tool[] = [
    { label: 'P', title: 'Paragraph', run: () => exec('formatBlock', '<p>') },
    { label: 'H1', title: 'Heading 1', run: () => exec('formatBlock', '<h1>') },
    { label: 'H2', title: 'Heading 2', run: () => exec('formatBlock', '<h2>') },
    { label: 'H3', title: 'Heading 3', run: () => exec('formatBlock', '<h3>') },
    { label: 'B', title: 'Bold', run: () => exec('bold'), className: 'font-bold' },
    { label: 'I', title: 'Italic', run: () => exec('italic'), className: 'italic' },
    { label: '• List', title: 'Bulleted list', run: () => exec('insertUnorderedList') },
    { label: '1. List', title: 'Numbered list', run: () => exec('insertOrderedList') },
    { label: '❝', title: 'Quote', run: () => exec('formatBlock', '<blockquote>') },
    {
      label: 'Link',
      title: 'Insert link',
      run: () => {
        const url = window.prompt('Link URL (e.g. /services/ or https://…)');
        if (url) exec('createLink', url);
      },
    },
    { label: 'Clear', title: 'Remove formatting', run: () => exec('removeFormat') },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5" role="toolbar" aria-label="Formatting">
        {tools.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.title}
            aria-label={t.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={t.run}
            className={cx('rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm', t.className)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="relative">
        {empty && <div className="pointer-events-none absolute left-4 top-3 pr-4 text-sm text-slate-400">{placeholder}</div>}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Content"
          onInput={emit}
          onPaste={(e) => {
            e.preventDefault();
            const html = e.clipboardData.getData('text/html');
            const text = e.clipboardData.getData('text/plain');
            const clean = html ? sanitizeHtml(html) : markdownToHtml(text);
            document.execCommand('insertHTML', false, clean);
            emit();
          }}
          className="editor-content max-h-[520px] min-h-[280px] overflow-y-auto px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none"
        />
      </div>
    </div>
  );
}
