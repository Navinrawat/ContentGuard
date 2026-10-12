// Browser-side helpers for the rich-text editor: sanitise pasted HTML and convert Markdown/plain text.

const ALLOWED = new Set(['H1', 'H2', 'H3', 'H4', 'P', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'A', 'BR', 'BLOCKQUOTE']);
const BLOCK_ALIASES: Record<string, string> = { DIV: 'P', SECTION: 'P', ARTICLE: 'P', H5: 'H4', H6: 'H4', TD: 'P' };

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = document.createElement('div');

  const walk = (node: Node, parent: HTMLElement) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        parent.appendChild(document.createTextNode(child.textContent || ''));
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as HTMLElement;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'svg', 'IMG', 'BUTTON', 'FORM', 'NAV', 'FOOTER', 'HEADER'].includes(el.tagName)) return;
      const tag = BLOCK_ALIASES[el.tagName] || el.tagName;
      if (ALLOWED.has(tag)) {
        const clean = document.createElement(tag);
        if (tag === 'A') {
          const href = el.getAttribute('href') || '';
          if (/^(https?:|\/|#|mailto:|tel:)/i.test(href)) clean.setAttribute('href', href);
        }
        walk(el, clean);
        parent.appendChild(clean);
      } else {
        walk(el, parent);
      }
    });
  };
  walk(doc.body, out);
  return out.innerHTML.replace(/<p>\s*<\/p>/g, '');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}

/** Minimal Markdown → HTML for pasted plain text. Unmarked lines become paragraphs. */
export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) html.push(`</${list}>`);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    const ul = line.match(/^[-*•]\s+(.*)$/);
    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (h) {
      closeList();
      html.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
    } else if (ul || ol) {
      const kind = ul ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        html.push(`<${kind}>`);
        list = kind;
      }
      html.push(`<li>${inline((ul || ol)![1])}</li>`);
    } else if (line.startsWith('>')) {
      closeList();
      html.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`);
    } else {
      closeList();
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return html.join('');
}

export function htmlToText(html: string): string {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.innerText || d.textContent || '';
}
