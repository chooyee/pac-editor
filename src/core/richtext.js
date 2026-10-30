import { esc, safeUrl, paras } from './utils.js';

/*
 * Rich text is stored as a Quill Delta ({ ops: [...] }), not HTML, and turned into HTML here.
 * Every character goes through esc() and every link through safeUrl(), and formats outside
 * RICH_FORMATS are dropped, so stored or imported JSON cannot inject markup.
 * A plain string (older data) renders as paragraphs.
 */
export const RICH_FORMATS = ['bold', 'italic', 'underline', 'strike', 'link', 'list', 'blockquote'];
const RICH_INLINE = [['strike', 's'], ['underline', 'u'], ['italic', 'em'], ['bold', 'strong']];

export function renderRich(value) {
  if (typeof value === 'string') return paras(value);
  const ops = Array.isArray(value?.ops) ? value.ops : [];
  const lines = []; let cur = '';
  for (const op of ops) {
    if (!op || typeof op.insert !== 'string') continue; // embeds are not allowed
    const a = op.attributes && typeof op.attributes === 'object' ? op.attributes : {};
    op.insert.split('\n').forEach((part, n) => {
      if (n > 0) { lines.push({ html: cur, a }); cur = ''; } // a newline carries its line's format
      if (!part) return;
      let h = esc(part);
      for (const [k, tag] of RICH_INLINE) if (a[k]) h = `<${tag}>${h}</${tag}>`;
      if (a.link) h = `<a href="${esc(safeUrl(a.link) || '#')}">${h}</a>`;
      cur += h;
    });
  }
  if (cur) lines.push({ html: cur, a: {} });
  let out = '', open = '';
  for (const { html, a } of lines) {
    const list = a.list === 'ordered' ? 'ol' : a.list === 'bullet' ? 'ul' : '';
    const wrap = list || (a.blockquote ? 'blockquote' : '');
    if (wrap !== open) { if (open) out += `</${open}>`; if (wrap) out += `<${wrap}>`; open = wrap; }
    if (!html) continue; // blank lines only add space in the editor
    out += list ? `<li>${html}</li>` : `<p>${html}</p>`;
  }
  if (open) out += `</${open}>`;
  return out;
}

/** Delta or plain string → Delta (each paragraph becomes one line). */
export const toDelta = v => Array.isArray(v?.ops) ? v : { ops: [{ insert: String(v || '').split(/\n{2,}/).join('\n').replace(/\n*$/, '\n') }] };

/** Delta → plain text with blank lines between paragraphs. */
export const richText = v => typeof v === 'string' ? v : toDelta(v).ops.map(o => typeof o?.insert === 'string' ? o.insert : '').join('').trim().replace(/\n+/g, '\n\n');
