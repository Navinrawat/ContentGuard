// Text parsing and low-level linguistic utilities.
// Pure functions with no DOM dependency so the engine can also run server-side.

import type { Block, BlockType, Link, ParsedDocument } from '../types/analysis';

const ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&pound;': '£',
  '&euro;': '€',
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&[a-z]+;|&#\d+;/gi, (m) => {
      if (ENTITY_MAP[m]) return ENTITY_MAP[m];
      const num = m.match(/&#(\d+);/);
      return num ? String.fromCharCode(Number(num[1])) : m;
    })
    .replace(/ /g, ' ');
}

export function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export function looksLikeHtml(s: string): boolean {
  return /<(p|div|h[1-6]|ul|ol|li|br|strong|em|a|span|blockquote)\b[^>]*>/i.test(s);
}

function extractLinks(html: string, siteUrl: string): Link[] {
  const links: Link[] = [];
  let host = '';
  try {
    host = siteUrl ? new URL(siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`).hostname.replace(/^www\./, '') : '';
  } catch {
    host = '';
  }
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1];
    const text = clean(decodeEntities(m[2].replace(/<[^>]+>/g, '')));
    const internal = href.startsWith('/') || href.startsWith('#') || (!!host && href.includes(host));
    links.push({ href, text, internal });
  }
  return links;
}

const MARK = '\u0001';

/** Convert HTML into tagged lines, then into blocks. */
function htmlToLines(html: string): string[] {
  const s = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<h([1-6])\b[^>]*>/gi, (_m, l) => `\n${MARK}H${l}${MARK}`)
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, `\n${MARK}LI${MARK}`)
    .replace(/<blockquote\b[^>]*>/gi, `\n${MARK}Q${MARK}`)
    .replace(/<\/(p|div|li|blockquote|ul|ol|tr|section|article)>/gi, '\n')
    .replace(/<(p|div|ul|ol|tr|section|article)\b[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(s).split('\n');
}

function wordCount(s: string): number {
  return (s.match(/[A-Za-z0-9’'£$€₹%-]+/g) || []).length;
}

/** Heuristic: a short line without terminal punctuation followed by body text reads like a heading. */
function isHeadingLike(line: string, next?: string): boolean {
  const wc = wordCount(line);
  if (wc === 0 || wc > 14) return false;
  if (/[.,;]$/.test(line)) return false;
  if (/^[-*•]\s/.test(line)) return false;
  if (!next) return false;
  return wordCount(next) > wc;
}

export function parseContent(raw: string, siteUrl = ''): ParsedDocument {
  const html = looksLikeHtml(raw);
  const links = html ? extractLinks(raw, siteUrl) : [];
  // Markdown links [text](url)
  if (!html) {
    const mdLink = /\[([^\]]+)\]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = mdLink.exec(raw))) {
      links.push({ text: m[1], href: m[2], internal: m[2].startsWith('/') || (!!siteUrl && m[2].includes(siteUrl)) });
    }
  }
  const lines = (html ? htmlToLines(raw) : raw.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').split(/\r?\n/))
    .map((l) => clean(l))
    .filter(Boolean);

  const blocks: Block[] = [];
  const markedUp = html ? lines.some((l) => l.startsWith(`${MARK}H`)) : lines.some((l) => /^#{1,4}\s/.test(l));

  lines.forEach((line, i) => {
    let type: BlockType = 'p';
    let text = line;
    let inferred = false;
    const tag = line.match(new RegExp(`^${MARK}(H[1-6]|LI|Q)${MARK}`));
    if (tag) {
      text = clean(line.slice(tag[0].length));
      const t = tag[1];
      type = t === 'LI' ? 'li' : t === 'Q' ? 'quote' : (`h${Math.min(4, Number(t[1]))}` as BlockType);
    } else if (/^#{1,6}\s/.test(line)) {
      const level = Math.min(4, line.match(/^#+/)![0].length);
      type = `h${level}` as BlockType;
      text = line.replace(/^#+\s*/, '');
    } else if (/^([-*•]|\d+[.)])\s+/.test(line)) {
      type = 'li';
      text = line.replace(/^([-*•]|\d+[.)])\s+/, '');
    } else if (/^>\s?/.test(line)) {
      type = 'quote';
      text = line.replace(/^>\s?/, '');
    } else if (!markedUp && isHeadingLike(line, lines[i + 1])) {
      inferred = true;
      const hasH1 = blocks.some((b) => b.type === 'h1');
      type = !hasH1 && blocks.length === 0 ? 'h1' : /\?$/.test(line) ? 'h3' : 'h2';
    }
    text = text.replace(/\*\*|__/g, '').trim();
    if (text) blocks.push({ type, text, inferred: inferred || undefined });
  });

  const bodyBlocks = blocks.filter((b) => b.type === 'p' || b.type === 'li' || b.type === 'quote');
  const paragraphs = blocks.filter((b) => b.type === 'p' || b.type === 'quote').map((b) => b.text);
  const plainText = blocks.map((b) => b.text).join('\n');
  const sentences = bodyBlocks.flatMap((b) => splitSentences(b.text));
  return {
    blocks,
    links,
    plainText,
    sentences,
    paragraphs,
    headings: blocks.filter((b) => b.type.startsWith('h')),
    words: tokenize(plainText),
  };
}

const ABBREVIATIONS = ['Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'St', 'vs', 'etc', 'e.g', 'i.e', 'approx', 'No', 'Inc', 'Ltd', 'Jr', 'Sr', 'Mt', 'Fig'];

export function splitSentences(text: string): string[] {
  let t = text;
  for (const a of ABBREVIATIONS) {
    t = t.replace(new RegExp(`\\b${a.replace('.', '\\.')}\\.`, 'g'), `${a}\u0002`);
  }
  // Protect decimals such as 4.5
  t = t.replace(/(\d)\.(\d)/g, '$1\u0003$2');
  const parts = t
    .split(/(?<=[.!?…])["”’)]?\s+(?=["“(‘]?[A-Z0-9£$€₹])/)
    .map((s) => clean(s.replace(/\u0002/g, '.').replace(/\u0003/g, '.')))
    .filter((s) => wordCount(s) > 0);
  return parts;
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9’'-]+/g) || []).map((w) => w.replace(/’/g, "'")).filter((w) => /[a-z0-9]/.test(w));
}

export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Coefficient of variation; 0 when undefined. */
export function cv(xs: number[]): number {
  const m = mean(xs);
  return m ? stdev(xs) / m : 0;
}

export const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
export const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

export function sentenceWords(s: string): number {
  return tokenize(s).length;
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Count case-insensitive whole-phrase matches. */
export function countPhrase(text: string, phrase: string): number {
  if (!phrase.trim()) return 0;
  const re = new RegExp(`(?<![a-z0-9])${escapeRegExp(phrase.toLowerCase()).replace(/\s+/g, '\\s+')}(?![a-z0-9])`, 'gi');
  return (text.toLowerCase().match(re) || []).length;
}

export function containsPhrase(text: string, phrase: string): boolean {
  return countPhrase(text, phrase) > 0;
}

/** Find sentences matching a regex, returning unique sentences. */
export function findSentences(sentences: string[], re: RegExp, limit = 50): string[] {
  const out: string[] = [];
  for (const s of sentences) {
    re.lastIndex = 0;
    if (re.test(s) && !out.includes(s)) out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}

export function truncate(s: string, n = 160): string {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

export function titleCase(s: string): string {
  const small = new Set(['a', 'an', 'and', 'or', 'the', 'in', 'on', 'of', 'for', 'to', 'with', 'at', 'by', 'vs']);
  return s
    .split(/\s+/)
    .map((w, i) => (i > 0 && small.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

export function shingles(text: string, n = 3): Set<string> {
  const t = tokenize(text);
  const set = new Set<string>();
  for (let i = 0; i <= t.length - n; i++) set.add(t.slice(i, i + n).join(' '));
  return set;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  a.forEach((x) => {
    if (b.has(x)) inter++;
  });
  return inter / (a.size + b.size - inter);
}

let idCounter = 0;
export function uid(prefix = 'id'): string {
  idCounter += 1;
  return `${prefix}-${idCounter.toString(36)}`;
}

/** Fix a/an only in front of the qualifier words our rewrite rules insert. */
export function fixArticles(s: string): string {
  return s
    .replace(/\b([Aa]) (?=(experienced|established|accredited|award|evidence|individual|independent|estimated|approximate)\b)/g, (_m, a) =>
      a === 'A' ? 'An ' : 'an ',
    )
    .replace(/\b([Aa])n (?=(trusted|well-|highly|qualified|modern|carefully|dedicated|registered|long-|low-|minimally|recognised|reputable)\b)/g, (_m, a) =>
      a === 'A' ? 'A ' : 'a ',
    );
}

export function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function brandFromUrl(url: string): string {
  if (!url) return '';
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
    const name = host.split('.')[0];
    return name
      .split(/[-_]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  } catch {
    return '';
  }
}
