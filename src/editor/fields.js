import { esc, clone, safeUrl } from '../core/utils.js';
import { RICH_FORMATS, toDelta, richText } from '../core/richtext.js';

export const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

/**
 * Build the control for one field.
 * ctx: { idPrefix, quill, upload, toast }
 * Returns an element, or null for fields without a control (slot).
 */
export function buildField(ctx, key, f, value, onChange, rebuild) {
  if (!f || f.type === 'slot') return null;
  const wrap = el('div', 'fp-fld');
  const id = `${ctx.idPrefix}f-${key.replace(/[^a-z0-9_-]/gi, '_')}`;
  const lbl = f.label || key;
  switch (f.type) {
    case 'text': case 'number': {
      wrap.innerHTML = `<label for="${id}">${esc(lbl)}</label>`;
      const i = el('input'); i.id = id; i.type = f.type === 'number' ? 'number' : 'text';
      if (f.min != null) i.min = f.min; if (f.max != null) i.max = f.max;
      if (f.placeholder) i.placeholder = f.placeholder;
      i.value = value ?? '';
      i.addEventListener('input', () => onChange(f.type === 'number' ? (i.value === '' ? '' : Number(i.value)) : i.value));
      wrap.append(i); break;
    }
    case 'textarea': {
      wrap.innerHTML = `<label for="${id}">${esc(lbl)}</label>`;
      const t = el('textarea'); t.id = id; t.value = value ?? '';
      if (f.placeholder) t.placeholder = f.placeholder;
      t.addEventListener('input', () => onChange(t.value)); wrap.append(t); break;
    }
    case 'richtext': {
      if (!ctx.quill) { // Quill not available: fall back to plain paragraphs
        wrap.innerHTML = `<label for="${id}">${esc(lbl)}</label>`;
        const t = el('textarea'); t.id = id; t.value = richText(value);
        t.addEventListener('input', () => onChange(t.value)); wrap.append(t); break;
      }
      wrap.append(el('span', 'fp-flabel', esc(lbl)));
      wrap.append(buildRichText(ctx, id, lbl, value, onChange)); break;
    }
    case 'select': {
      wrap.innerHTML = `<label for="${id}">${esc(lbl)}</label>`;
      const s = el('select'); s.id = id;
      s.innerHTML = (f.options || []).map(o => `<option value="${esc(o.value)}"${o.value === value ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
      s.addEventListener('change', () => onChange(s.value)); wrap.append(s); break;
    }
    case 'radio': {
      wrap.append(el('span', 'fp-flabel', esc(lbl)));
      const seg = el('div', 'fp-seg'); seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', lbl);
      (f.options || []).forEach((o, n) => {
        const l = el('label', '', `<input type="radio" id="${id}-${n}" name="${id}" value="${esc(o.value)}"${o.value === value ? ' checked' : ''}><span>${esc(o.label)}</span>`);
        l.querySelector('input').addEventListener('change', () => onChange(o.value));
        seg.append(l);
      });
      wrap.append(seg); break;
    }
    case 'image': {
      wrap.append(el('span', 'fp-flabel', esc(lbl)));
      wrap.append(buildImageField(ctx, id, value, onChange, rebuild)); break;
    }
    case 'array': {
      wrap.append(el('span', 'fp-flabel', esc(lbl)));
      let cur = Array.isArray(value) ? clone(value) : [];
      const list = el('div', 'fp-arr');
      const sub = f.arrayFields || {};
      cur.forEach((item, i) => {
        const card = el('div', 'fp-arr-item');
        const title = (f.getItemSummary ? f.getItemSummary(item, i) : item?.[Object.keys(sub)[0]]) || `Item ${i + 1}`;
        const head = el('div', 'fp-arr-head', `<span>${esc(title)}</span>`);
        const g = el('div', 'fp-grp');
        g.innerHTML = '<button type="button" data-a="up" aria-label="Move up">↑</button><button type="button" data-a="down" aria-label="Move down">↓</button><button type="button" data-a="del" aria-label="Remove">✕</button>';
        g.addEventListener('click', e => {
          const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
          if (a === 'del') cur.splice(i, 1);
          else { const j = i + (a === 'up' ? -1 : 1); if (j < 0 || j >= cur.length) return; [cur[i], cur[j]] = [cur[j], cur[i]]; }
          onChange(clone(cur)); rebuild();
        });
        head.append(g); card.append(head);
        for (const [k, sf] of Object.entries(sub)) {
          const n = buildField(ctx, `${key}-${i}-${k}`, sf, item?.[k], v => { cur[i] = { ...cur[i], [k]: v }; onChange(clone(cur)); }, rebuild);
          if (n) card.append(n);
        }
        list.append(card);
      });
      if (f.max == null || cur.length < f.max) {
        const add = el('button', 'fp-btn', '+ Add item'); add.type = 'button';
        add.onclick = () => { cur.push(clone(f.defaultItemProps || {})); onChange(clone(cur)); rebuild(); };
        list.append(add);
      }
      wrap.append(list); break;
    }
    case 'object': {
      wrap.append(el('span', 'fp-flabel', esc(lbl)));
      let cur = value && typeof value === 'object' ? clone(value) : {};
      const box = el('div', 'fp-arr-item');
      for (const [k, sf] of Object.entries(f.objectFields || {})) {
        const n = buildField(ctx, `${key}-${k}`, sf, cur[k], v => { cur = { ...cur, [k]: v }; onChange(clone(cur)); }, rebuild);
        if (n) box.append(n);
      }
      wrap.append(box); break;
    }
    case 'custom': {
      // f.render({ id, field, value, onChange }) returns an element; label it with `id`.
      wrap.innerHTML = `<label for="${id}">${esc(lbl)}</label>`;
      const n = f.render({ id, field: f, value, onChange });
      if (n) wrap.append(n);
      break;
    }
    default: return null;
  }
  return wrap;
}

function buildImageField(ctx, id, value, onChange, rebuild) {
  const box = el('div', 'fp-imgfld');
  const src = safeUrl(value, true);
  box.innerHTML = `
    <div class="fp-thumb">${src ? `<img src="${esc(src)}" alt="">` : 'No picture yet — upload or drop one here'}</div>
    <div class="fp-grp" style="flex-wrap:wrap">
      <input class="fp-vh" type="file" accept="image/*" id="${id}-file">
      <label class="fp-btn" for="${id}-file">${value ? 'Replace' : 'Upload'}</label>
      ${value ? '<button type="button" class="fp-btn" data-rm>Remove</button>' : ''}
    </div>
    <input type="text" id="${id}-url" placeholder="…or paste an image URL" value="${value && !String(value).startsWith('data:') ? esc(value) : ''}" aria-label="Image URL">
    <p class="fp-msg" aria-live="polite"></p>`;
  const msg = box.querySelector('.fp-msg');
  const take = async file => {
    msg.classList.remove('err'); msg.textContent = 'Processing…';
    try { const url = await ctx.upload(file); onChange(url); rebuild(); }
    catch (err) { msg.textContent = `${err.message}. Choose a JPG, PNG, GIF, WebP or SVG file.`; msg.classList.add('err'); }
  };
  box.querySelector('input[type=file]').addEventListener('change', e => { const f = e.target.files?.[0]; if (f) take(f); });
  box.querySelector('[data-rm]')?.addEventListener('click', () => { onChange(''); rebuild(); });
  const urlIn = box.querySelector(`#${CSS.escape(id)}-url`);
  urlIn.addEventListener('change', () => {
    const v = urlIn.value.trim();
    if (v && !safeUrl(v, true)) { msg.textContent = 'Use an http(s) link or a site path, such as /media/photo.jpg.'; msg.classList.add('err'); return; }
    onChange(v); rebuild();
  });
  box.addEventListener('dragover', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); box.classList.add('over'); } });
  box.addEventListener('dragleave', () => box.classList.remove('over'));
  box.addEventListener('drop', e => { e.preventDefault(); box.classList.remove('over'); const f = e.dataTransfer.files?.[0]; if (f) take(f); });
  box.addEventListener('paste', e => { const f = [...(e.clipboardData?.files || [])][0]; if (f) { e.preventDefault(); take(f); } });
  return box;
}

/* ---------------- rich text (Quill core with a themed toolbar) ---------------- */

const RT_TOOLS = [
  { f: 'bold', label: 'Bold (Ctrl+B)', icon: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>' },
  { f: 'italic', label: 'Italic (Ctrl+I)', icon: '<path d="M14 5h-4M14 19h-4M14 5l-4 14"/>' },
  { f: 'underline', label: 'Underline (Ctrl+U)', icon: '<path d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14"/>' },
  { f: 'strike', label: 'Strikethrough', icon: '<path d="M5 12h14M16 6.5A4 3 0 0 0 12 5c-2.5 0-4 1.3-4 3 0 3 8 2.5 8 7 0 1.8-1.7 3-4 3a4.5 3.2 0 0 1-4.3-2"/>' },
  'sep',
  { f: 'list', v: 'bullet', label: 'Bulleted list', icon: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>' },
  { f: 'list', v: 'ordered', label: 'Numbered list', icon: '<path d="M10 6h10M10 12h10M10 18h10M4 5h1.5v4M4 9h3M4 14.5c.5-.7 2.8-.7 2.8.7 0 1-2.8 1.6-2.8 2.8h3"/>' },
  { f: 'blockquote', label: 'Quote', icon: '<path d="M5 6v12M10 8h9M10 12h9M10 16h6"/>' },
  'sep',
  { f: 'link', label: 'Link', icon: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>' },
  { f: 'clean', label: 'Clear formatting', icon: '<path d="M6 5h12M12 5l-3 14M15 15l5 5M20 15l-5 5"/>' }
];

const RT_FULL_ICON = '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>';
const RT_EXIT_ICON = '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>';

/* Quill's own link check resolves against the page URL (so /path fails on file://); use safeUrl as the one policy. */
const patched = new WeakSet();
export function patchQuill(Quill) {
  if (!Quill || patched.has(Quill)) return;
  Quill.import('formats/link').sanitize = url => safeUrl(url);
  patched.add(Quill);
}

/* The properties panel is rebuilt on undo/redo, so each build makes a fresh editor from the stored Delta. */
function buildRichText(ctx, id, lbl, value, onChange) {
  const Quill = ctx.quill;
  const box = el('div', 'fp-rt');
  const bar = el('div', 'fp-rt-bar'); bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', `${lbl} formatting`);
  bar.innerHTML = RT_TOOLS.map((t, n) => t === 'sep' ? '<span class="sep" aria-hidden="true"></span>'
    : `<button type="button" data-n="${n}" title="${esc(t.label)}" aria-label="${esc(t.label)}"${t.f === 'clean' ? '' : ' aria-pressed="false"'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg></button>`).join('')
    + `<button type="button" class="fp-rt-full" data-full title="Full screen" aria-label="Full screen" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${RT_FULL_ICON}</svg></button>`;
  const linkRow = el('div', 'fp-rt-link', `<input type="text" id="${id}-link" placeholder="https://… or /page" aria-label="Link address"><button type="button" class="fp-btn primary" data-l="apply">Apply</button><button type="button" class="fp-btn" data-l="remove">Remove</button><button type="button" class="fp-btn" data-l="cancel">Cancel</button><p class="fp-msg" aria-live="polite"></p>`);
  linkRow.hidden = true;
  const ed = el('div');
  box.append(bar, linkRow, ed);

  const q = new Quill(ed, {
    formats: RICH_FORMATS,
    placeholder: 'Start writing…',
    modules: {
      toolbar: false,
      uploader: { handler: () => {} }, // no pictures inside text; use a Picture block
      keyboard: { bindings: { tab: null, indent: null, outdent: null } } // let Tab move focus out of the editor
    }
  });
  q.setContents(toDelta(value), 'silent');
  q.history.clear();
  q.root.id = id; q.root.setAttribute('aria-label', lbl); q.root.setAttribute('aria-multiline', 'true'); q.root.setAttribute('role', 'textbox');
  q.on('text-change', (_d, _o, source) => { if (source !== 'silent') onChange({ ops: q.getContents().ops }); });

  const sync = () => {
    const r = q.getSelection(); const fmt = r ? q.getFormat(r) : {};
    bar.querySelectorAll('[data-n]').forEach(b => {
      const t = RT_TOOLS[b.dataset.n]; if (t.f === 'clean') return;
      b.setAttribute('aria-pressed', String(t.v ? fmt[t.f] === t.v : !!fmt[t.f]));
    });
  };
  q.on('editor-change', sync);

  let linkRange = null;
  const msg = linkRow.querySelector('.fp-msg'), linkIn = linkRow.querySelector('input');
  const closeLink = () => { linkRow.hidden = true; msg.textContent = ''; linkRange = null; };
  const openLink = () => {
    const r = q.getSelection();
    if (!r || !r.length) { ctx.toast('Select the words to link first'); return; }
    linkRange = r; linkIn.value = q.getFormat(r).link || ''; linkRow.hidden = false; linkIn.focus();
  };
  const setLink = url => { q.formatText(linkRange.index, linkRange.length, 'link', url, 'user'); q.setSelection(linkRange); closeLink(); };
  linkRow.addEventListener('click', e => {
    const a = e.target.closest('[data-l]')?.dataset.l; if (!a || !linkRange) return;
    if (a === 'cancel') { q.setSelection(linkRange); closeLink(); }
    else if (a === 'remove') setLink(false);
    else {
      const v = linkIn.value.trim();
      if (!v) return setLink(false);
      if (safeUrl(v) !== v) { msg.textContent = 'Use an http(s) or mailto: link, or a site path such as /contact.'; msg.classList.add('err'); return; }
      setLink(v);
    }
  });
  linkIn.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); linkRow.querySelector('[data-l="apply"]').click(); }
    else if (e.key === 'Escape') { e.stopPropagation(); q.setSelection(linkRange); closeLink(); }
  });

  // Full screen: the same editor is pinned over the whole window, so there is nothing to sync back.
  const fullBtn = bar.querySelector('[data-full]');
  const setFull = on => {
    box.classList.toggle('is-full', on);
    const label = on ? 'Exit full screen (Esc)' : 'Full screen';
    fullBtn.title = label; fullBtn.setAttribute('aria-label', label); fullBtn.setAttribute('aria-pressed', String(on));
    fullBtn.querySelector('svg').innerHTML = on ? RT_EXIT_ICON : RT_FULL_ICON;
    q.focus();
  };
  box.addEventListener('keydown', e => {
    if (e.key === 'Escape' && box.classList.contains('is-full')) { e.stopPropagation(); setFull(false); }
  });

  bar.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); }); // keep the text selection
  bar.addEventListener('click', e => {
    if (e.target.closest('[data-full]')) return setFull(!box.classList.contains('is-full'));
    const b = e.target.closest('[data-n]'); if (!b) return;
    const t = RT_TOOLS[b.dataset.n];
    const r = q.getSelection(true); const fmt = q.getFormat(r);
    if (t.f === 'link') return openLink();
    if (t.f === 'clean') { if (r.length) q.removeFormat(r.index, r.length, 'user'); else q.formatLine(r.index, 0, { list: false, blockquote: false }, 'user'); }
    else if (t.v) q.format(t.f, fmt[t.f] === t.v ? false : t.v, 'user');
    else q.format(t.f, !fmt[t.f], 'user');
    sync();
  });
  return box;
}
