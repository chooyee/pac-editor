/* Small helpers shared by the renderer and the editor. No DOM access. */

/** Escape a value for use in HTML text or a quoted attribute. */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const uid = () => Math.random().toString(36).slice(2, 9);

export const clone = o => JSON.parse(JSON.stringify(o));

/**
 * Only allow safe link and picture schemes in rendered output.
 * Links: http(s), mailto and relative paths; anything else becomes '#'.
 * Pictures (img=true): http(s), relative paths and data:image/*; anything else becomes ''.
 */
export const safeUrl = (u, img) => {
  const s = String(u || '').replace(/[\x00-\x20]/g, '');
  if (img && /^data:image\/(png|jpe?g|gif|webp|svg\+xml)[;,]/i.test(s)) return s;
  const scheme = /^[a-z][a-z0-9+.-]*:/i.exec(s);
  if (!scheme || /^https?:$/i.test(scheme[0]) || (!img && /^mailto:$/i.test(scheme[0]))) return s;
  return img ? '' : '#';
};

/** Plain text with blank lines between paragraphs → <p> elements. */
export const paras = t => String(t || '').split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
