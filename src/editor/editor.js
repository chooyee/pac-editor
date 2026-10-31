import { esc, uid, clone } from '../core/utils.js';
import { slotNames, findById, getZone, reId, countItems, emptyData, validateData } from '../core/tree.js';
import { render, ICON } from '../core/render.js';
import { defaultConfig } from '../blocks/index.js';
import { buildField, patchQuill, el } from './fields.js';
import { dataUrlUpload } from './upload.js';

const NARROW = '(max-width: 960px)';
const BLOCK_ICON = '<rect x="4" y="4" width="16" height="16" rx="2"/>';
const SVG = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${extra}>${p}</svg>`;
const I = {
  left: SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>'),
  right: SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>'),
  close: SVG('<path d="M6 6l12 12M18 6 6 18"/>', ' stroke-linecap="round"'),
  undo: SVG('<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>'),
  redo: SVG('<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>')
};
let instances = 0;

/**
 * Mount an editor into an element.
 * @param {HTMLElement|string} target  element or CSS selector
 * @param {import('../../types/index').EditorOptions} [options]
 */
export function createEditor(target, options = {}) {
  return new Editor(target, options);
}

export class Editor {
  constructor(target, options = {}) {
    const root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) throw new Error(`PacEditor: mount element not found (${target})`);
    this.root = root;
    this.options = options;
    this.config = options.config || defaultConfig;
    this.quill = options.quill === undefined ? globalThis.Quill : options.quill;
    patchQuill(this.quill);
    this.upload = options.upload || this.config.upload || dataUrlUpload;
    this.prefix = `fp${++instances}-`;
    this.storageKey = options.storageKey || null;
    this.uiKey = options.rememberLayout === false ? null : (typeof options.rememberLayout === 'string' ? options.rememberLayout : 'pac-editor:ui');

    this.selected = null; this.preview = false; this.viewport = 'desktop';
    this.drag = null; this.drop = null; this.lastCoalesce = null; this.lastTime = 0;
    this.ui = { leftClosed: false, rightClosed: false, outlineClosed: false };
    this.cleanup = [];
    this.handlers = {};
    for (const [type, fn] of Object.entries(options.on || {})) this.on(type, fn);

    let start = options.data ? clone(options.data) : emptyData(this.config);
    if (this.storageKey) {
      try { const d = JSON.parse(localStorage.getItem(this.storageKey)); if (d && validateData(this.config, d).ok) start = d; } catch (e) { /* no draft */ }
    }
    start.root ||= { props: {} }; start.root.props ||= {};
    this.data = start;
    this.history = [clone(this.data)]; this.hIndex = 0;

    this.mount();
  }

  /* ---------------- public API ---------------- */

  /** Listen for an editor event ('change', 'select', 'preview', 'viewport', 'publish', 'import'). Returns an unsubscribe function. */
  on(type, fn) { (this.handlers[type] ||= new Set()).add(fn); return () => this.off(type, fn); }
  off(type, fn) { this.handlers[type]?.delete(fn); }
  emit(type, ...args) {
    this.handlers[type]?.forEach(fn => { try { fn(...args); } catch (err) { console.error(`PacEditor: ${type} handler failed`, err); } });
  }

  /** Current page data (a copy). */
  getData() { return clone(this.data); }

  /** Replace the page data. Clears undo history unless { keepHistory: true }. */
  setData(data, { keepHistory = false } = {}) {
    const v = validateData(this.config, data);
    if (!v.ok) throw new Error(`PacEditor: invalid data — ${v.errors.join('; ')}`);
    const d = clone(data); d.root ||= { props: {} }; d.root.props ||= {};
    this.selected = null;
    if (keepHistory) this.commit(d);
    else { this.data = d; this.history = [clone(d)]; this.hIndex = 0; this.save(); this.render(true); }
  }

  undo() { if (this.hIndex > 0) { this.hIndex--; this.restore(); } }
  redo() { if (this.hIndex < this.history.length - 1) { this.hIndex++; this.restore(); } }

  /** Select a block by id (null selects the page). */
  select(id, scroll) {
    const changed = this.selected !== id;
    this.selected = id; this.render(true);
    if (changed) this.emit('select', id);
    if (scroll && id) requestAnimationFrame(() => this.$(`.fp-item[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }

  /** Turn preview mode on or off (same as the Preview button). */
  setPreview(on) {
    on = !!on; if (on === this.preview) return;
    this.preview = on;
    if (on) this.closeDrawers();
    this.root.classList.toggle('is-preview', on);
    const b = this.$('[data-fp="preview"]');
    if (b) { b.classList.toggle('on', on); b.textContent = on ? 'Edit' : 'Preview'; }
    this.render(false);
    this.emit('preview', on);
  }

  /** Canvas width: 'desktop', 'tablet' or 'mobile'. Works even when the viewport buttons are hidden. */
  setViewport(name) {
    if (!['desktop', 'tablet', 'mobile'].includes(name) || name === this.viewport) return;
    this.viewport = name;
    this.$('[data-fp="frame"]').className = `fp-frame vp-${name}`;
    this.$$('[data-vp]').forEach(x => x.classList.toggle('on', x.dataset.vp === name));
    this.emit('viewport', name);
  }

  /** 'auto' follows the operating system; 'light' or 'dark' forces one. */
  setTheme(theme = 'auto') {
    this.theme = theme;
    this.root.dataset.theme = theme === 'auto' ? (this.darkMq.matches ? 'dark' : 'light') : theme;
  }

  /** Open or close a side panel: side is 'left' (blocks) or 'right' (properties). */
  setPanel(side, open) {
    const panel = this.$(`[data-fp="${side}-panel"]`);
    const hadFocus = panel.contains(document.activeElement);
    if (this.narrow.matches) {
      this.root.classList.remove('is-left-open', 'is-right-open'); // one drawer at a time
      if (open) this.root.classList.add(`is-${side}-open`);
    } else {
      this.root.classList.toggle(`is-${side}-closed`, !open);
      this.ui[`${side}Closed`] = !open; this.saveUi();
    }
    this.syncToggles();
    if (open && this.narrow.matches) panel.querySelector('[data-close-panel]').focus();
    else if (!open && hadFocus) this.$(`[data-panel="${side}"]`).focus(); // don't strand focus in a hidden panel
  }

  /** Remove the editor and every listener it added. */
  destroy() {
    this.cleanup.forEach(fn => fn());
    this.cleanup = [];
    this.handlers = {};
    this.root.innerHTML = '';
    this.root.classList.remove('fp-editor', 'is-left-closed', 'is-right-closed', 'is-left-open', 'is-right-open', 'is-preview');
    delete this.root.dataset.theme;
  }

  /* ---------------- setup ---------------- */

  $(s) { return this.root.querySelector(s); }
  $$(s) { return this.root.querySelectorAll(s); }
  listen(target, type, fn, opts) { target.addEventListener(type, fn, opts); this.cleanup.push(() => target.removeEventListener(type, fn, opts)); }

  /* Built-in toolbar buttons can be hidden; the older showImport / viewports options still work. */
  toolbarOptions() {
    const o = this.options, t = o.toolbar || {};
    return {
      undo: t.undo !== false,
      viewports: t.viewports ?? o.viewports !== false,
      preview: t.preview !== false,
      import: t.import ?? o.showImport !== false,
      publish: t.publish !== false,
      buttons: (t.buttons || []).filter(b => b && b.id && (b.label || b.icon))
    };
  }

  mount() {
    const o = this.options, p = this.prefix;
    const root = this.root;
    const tb = this.toolbarOptions();
    // icon is trusted markup from the developer; label and title are escaped
    const custom = tb.buttons.map(b => `<button type="button" class="fp-btn${b.primary ? ' primary' : ''}" data-fp-btn="${esc(b.id)}"${b.title || b.icon ? ` title="${esc(b.title || b.label || '')}"` : ''}${b.icon && b.label ? ` aria-label="${esc(b.label)}"` : ''}>${b.icon || ''}${b.label ? (b.icon ? `<span class="fp-txt">${esc(b.label)}</span>` : esc(b.label)) : ''}</button>`).join('');
    const actions = (tb.preview ? '<button type="button" class="fp-btn" data-fp="preview">Preview</button>' : '')
      + (tb.import ? '<button type="button" class="fp-btn" data-fp="import">Import</button>' : '')
      + custom
      + (tb.publish ? `<button type="button" class="fp-btn primary" data-fp="publish">${esc(o.publishLabel || 'Publish')}</button>` : '');
    root.classList.add('fp-editor');
    root.innerHTML = `
      <header class="fp-topbar">
        <button type="button" class="fp-btn fp-panel-toggle" data-panel="left" aria-controls="${p}left" aria-expanded="true" aria-label="Blocks panel" title="Show or hide the blocks panel">${I.left}<span class="fp-txt">Blocks</span></button>
        <div class="fp-brand">${esc(o.title ?? 'Page Builder')} <small data-fp="status"></small></div>
        ${tb.undo ? `<div class="fp-grp">
          <button type="button" class="fp-btn" data-fp="undo" title="Undo (Ctrl+Z)" aria-label="Undo">${I.undo}<span class="fp-txt">Undo</span></button>
          <button type="button" class="fp-btn" data-fp="redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo">${I.redo}<span class="fp-txt">Redo</span></button>
        </div>` : ''}
        ${tb.viewports ? `<div class="fp-grp fp-vp-group" data-fp="vp">
          <button type="button" class="fp-btn on" data-vp="desktop">Desktop</button>
          <button type="button" class="fp-btn" data-vp="tablet">Tablet</button>
          <button type="button" class="fp-btn" data-vp="mobile">Mobile</button>
        </div>` : ''}
        ${actions ? `<div class="fp-grp">${actions}</div>` : ''}
        <button type="button" class="fp-btn fp-panel-toggle" data-panel="right" aria-controls="${p}right" aria-expanded="true" aria-label="Properties panel" title="Show or hide the properties panel">${I.right}<span class="fp-txt">Properties</span></button>
      </header>
      <div class="fp-main">
        <aside class="fp-side left" id="${p}left" data-fp="left-panel" aria-label="Blocks">
          <div class="fp-side-head"><p class="fp-label">Blocks</p><button type="button" class="fp-icon-btn" data-close-panel="left" aria-label="Close blocks panel" title="Close">${I.close}</button></div>
          <section>
            <div data-fp="palette"></div>
            <p class="fp-hint">Drag a block onto the page, or tap it to add after the selected block.</p>
          </section>
          <details class="fp-outline-wrap" data-fp="outline-wrap" open>
            <summary class="fp-label">Outline <span class="fp-count" data-fp="count"></span></summary>
            <nav class="fp-outline" data-fp="outline" aria-label="Page outline"></nav>
          </details>
        </aside>
        <main class="fp-stage"><div class="fp-frame vp-desktop" data-fp="frame"></div></main>
        <aside class="fp-side right" id="${p}right" data-fp="right-panel" aria-label="Properties">
          <div class="fp-side-head"><p class="fp-label">Properties</p><button type="button" class="fp-icon-btn" data-close-panel="right" aria-label="Close properties panel" title="Close">${I.close}</button></div>
          <div class="fp-props" data-fp="props"></div>
        </aside>
      </div>
      <div class="fp-scrim" data-fp="scrim"></div>
      <div data-fp="modal-root"></div>`;
    this.indicator = el('div', 'fp-indicator');
    this.narrow = matchMedia(NARROW);
    this.darkMq = matchMedia('(prefers-color-scheme: dark)');
    this.listen(this.darkMq, 'change', () => { if (this.theme === 'auto') this.setTheme('auto'); });
    this.setTheme(o.theme || 'auto');
    this.initPanels();
    this.renderPalette();
    this.bind();
    this.setStatus(this.storageKey ? 'draft' : '');
    this.render(true);
  }

  fieldCtx() { return { idPrefix: this.prefix, quill: this.quill, upload: this.upload, toast: t => this.toast(t) }; }

  /* ---------------- side panels ---------------- */

  initPanels() {
    if (this.uiKey) { try { Object.assign(this.ui, JSON.parse(localStorage.getItem(this.uiKey)) || {}); } catch (e) { /* defaults */ } }
    this.root.classList.toggle('is-left-closed', !!this.ui.leftClosed);
    this.root.classList.toggle('is-right-closed', !!this.ui.rightClosed);
    const wrap = this.$('[data-fp="outline-wrap"]');
    wrap.open = !this.ui.outlineClosed;
    this.listen(wrap, 'toggle', () => { this.ui.outlineClosed = !wrap.open; this.saveUi(); });
    this.$$('.fp-panel-toggle').forEach(b => this.listen(b, 'click', () => this.setPanel(b.dataset.panel, !this.panelOpen(b.dataset.panel))));
    this.$$('[data-close-panel]').forEach(b => this.listen(b, 'click', () => this.setPanel(b.dataset.closePanel, false)));
    this.listen(this.$('[data-fp="scrim"]'), 'click', () => this.closeDrawers());
    this.listen(this.narrow, 'change', () => { this.root.classList.remove('is-left-open', 'is-right-open'); this.syncToggles(); });
    this.syncToggles();
  }
  saveUi() { if (this.uiKey) try { localStorage.setItem(this.uiKey, JSON.stringify(this.ui)); } catch (e) { /* storage unavailable */ } }
  panelOpen(side) {
    return this.narrow.matches ? this.root.classList.contains(`is-${side}-open`) : !this.root.classList.contains(`is-${side}-closed`);
  }
  closeDrawers() {
    if (!this.narrow.matches) return false;
    const open = ['left', 'right'].find(s => this.panelOpen(s));
    if (open) this.setPanel(open, false);
    return !!open;
  }
  syncToggles() { this.$$('.fp-panel-toggle').forEach(b => b.setAttribute('aria-expanded', String(this.panelOpen(b.dataset.panel)))); }

  /* ---------------- state ---------------- */

  commit(next, { coalesce = null, keepPanel = false } = {}) {
    const now = Date.now();
    if (coalesce && coalesce === this.lastCoalesce && now - this.lastTime < 1200) {
      this.history[this.hIndex] = clone(next); // typing in one field is one undo step
    } else {
      this.history = this.history.slice(0, this.hIndex + 1);
      this.history.push(clone(next)); this.hIndex++;
      if (this.history.length > 100) { this.history.shift(); this.hIndex--; }
    }
    this.lastCoalesce = coalesce; this.lastTime = now;
    this.data = next; this.changed(); this.render(!keepPanel);
  }
  mutate(fn, opts) { const next = clone(this.data); const r = fn(next); if (r === false) return; this.commit(next, opts); }
  restore() {
    this.data = clone(this.history[this.hIndex]); this.lastCoalesce = null;
    if (this.selected && !findById(this.config, this.data.content, this.selected)) this.selected = null;
    this.changed(); this.render(true);
  }
  changed() {
    this.save();
    if (!this.storageKey) this.setStatus('unsaved changes');
    const data = this.getData();
    this.options.onChange?.(data);
    this.emit('change', data);
  }
  save() {
    if (!this.storageKey) return;
    try { localStorage.setItem(this.storageKey, JSON.stringify(this.data)); this.setStatus('draft saved'); }
    catch (e) { this.setStatus('too large to autosave — publish to keep a copy'); }
  }
  setStatus(t) { const s = this.$('[data-fp="status"]'); if (s) s.textContent = t; }

  /* ---------------- actions (Puck: insert / move / remove / duplicate / setProps) ---------------- */

  insert(type, zoneKey, index, extra = {}) {
    const comp = this.config.components[type]; if (!comp) return;
    const id = `${type}-${uid()}`;
    this.mutate(d => {
      const z = getZone(this.config, d, zoneKey); if (!z) return false;
      z.splice(Math.min(index, z.length), 0, { type, props: { ...clone(comp.defaultProps || {}), ...extra, id } });
    });
    this.select(id, true);
  }
  move(id, zoneKey, index) {
    this.mutate(d => {
      const src = findById(this.config, d.content, id); if (!src) return false;
      const target = getZone(this.config, d, zoneKey); if (!target) return false;
      if (src.zone === target && src.index < index) index--;
      if (src.zone === target && src.index === index) return false;
      const [item] = src.zone.splice(src.index, 1);
      target.splice(index, 0, item);
    });
  }
  moveBy(id, delta) {
    this.mutate(d => {
      const f = findById(this.config, d.content, id); if (!f) return false;
      const j = f.index + delta; if (j < 0 || j >= f.zone.length) return false;
      [f.zone[f.index], f.zone[j]] = [f.zone[j], f.zone[f.index]];
    });
  }
  remove(id) {
    this.mutate(d => { const f = findById(this.config, d.content, id); if (!f) return false; f.zone.splice(f.index, 1); });
    if (this.selected === id) this.select(null);
  }
  duplicate(id) {
    let newId;
    this.mutate(d => {
      const f = findById(this.config, d.content, id); if (!f) return false;
      const c = reId(this.config, clone(f.item)); newId = c.props.id; f.zone.splice(f.index + 1, 0, c);
    });
    if (newId) this.select(newId);
  }
  setProp(id, key, value) {
    this.mutate(d => {
      if (id === 'root') { d.root.props = { ...d.root.props, [key]: value }; return; }
      const f = findById(this.config, d.content, id); if (!f) return false; f.item.props[key] = value;
    }, { coalesce: `${id}:${key}`, keepPanel: true });
  }

  /* ---------------- rendering ---------------- */

  render(panel) {
    this.$('[data-fp="frame"]').innerHTML = render(this.config, this.data, { edit: !this.preview, selected: this.selected });
    this.renderOutline();
    if (panel) this.renderPanel();
    const undo = this.$('[data-fp="undo"]'), redo = this.$('[data-fp="redo"]');
    if (undo) undo.disabled = this.hIndex <= 0;
    if (redo) redo.disabled = this.hIndex >= this.history.length - 1;
  }
  renderPalette() {
    const wrap = this.$('[data-fp="palette"]');
    const comps = this.config.components;
    const cats = { ...(this.config.categories || {}) };
    const listed = new Set(Object.values(cats).flat());
    const rest = Object.keys(comps).filter(t => !listed.has(t));
    if (rest.length) cats[Object.keys(cats).length ? 'Other' : 'Blocks'] = rest;
    for (const [cat, types] of Object.entries(cats)) {
      const sec = el('div', 'fp-cat'); sec.append(el('p', 'fp-cat-name', esc(cat)));
      const list = el('div', 'fp-palette');
      for (const t of types) {
        const c = comps[t]; if (!c) continue;
        const b = el('button', 'fp-pal-item', `<span class="fp-pal-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${c.icon || BLOCK_ICON}</svg></span><span class="fp-pal-name">${esc(c.label || t)}</span><span class="fp-grip" aria-hidden="true">⋮⋮</span>`);
        b.draggable = true; b.dataset.type = t; b.type = 'button';
        list.append(b);
      }
      sec.append(list); wrap.append(sec);
    }
  }
  renderOutline() {
    const build = items => {
      const ul = el('ul');
      for (const it of items) {
        const li = el('li');
        const b = el('button', it.props.id === this.selected ? 'sel' : '', esc(this.config.components[it.type]?.label || it.type));
        b.type = 'button'; b.dataset.sel = it.props.id; li.append(b);
        for (const s of slotNames(this.config, it.type)) {
          const sub = el('div'); sub.append(el('div', 'fp-slot-name', esc(s)));
          sub.append(build(it.props[s] || [])); li.append(sub);
        }
        ul.append(li);
      }
      return ul;
    };
    const o = this.$('[data-fp="outline"]'); o.innerHTML = ''; o.append(build(this.data.content));
    const n = countItems(this.config, this.data.content), c = this.$('[data-fp="count"]');
    c.textContent = n; c.title = `${n} block${n === 1 ? '' : 's'}`;
  }
  renderPanel() {
    const p = this.$('[data-fp="props"]'); p.innerHTML = '';
    let target, fields, id, title;
    if (this.selected) {
      const f = findById(this.config, this.data.content, this.selected);
      if (!f) { this.selected = null; return this.renderPanel(); }
      const comp = this.config.components[f.item.type];
      target = f.item.props; fields = comp.fields || {}; id = this.selected; title = comp.label || f.item.type;
    } else {
      target = this.data.root.props || {}; fields = this.config.root.fields || {}; id = 'root'; title = 'Page';
    }
    p.append(el('div', 'fp-props-head', `<h2>${esc(title)}</h2><code>${esc(id)}</code>`));
    const box = el('div', 'fp-fields'), ctx = this.fieldCtx();
    for (const [k, f] of Object.entries(fields)) {
      const n = buildField(ctx, `${id}-${k}`, f, target[k], v => this.setProp(id, k, v), () => this.renderPanel());
      if (n) box.append(n);
    }
    if (!box.children.length) box.append(el('p', 'fp-empty', 'This block has no settings. Drop blocks into its areas on the page.'));
    p.append(box);
    if (this.selected) {
      const row = el('div', 'fp-grp');
      row.style.flexWrap = 'wrap';
      row.innerHTML = `<button type="button" class="fp-btn" data-pact="dup">${ICON.copy}Duplicate</button><button type="button" class="fp-btn" data-pact="del">${ICON.del}Delete</button><button type="button" class="fp-btn" data-pact="page">Page settings</button>`;
      p.append(row);
    } else {
      p.append(el('p', 'fp-empty', 'Select a block on the page to edit it.'));
    }
  }

  /* ---------------- events ---------------- */

  bind() {
    const frame = this.$('[data-fp="frame"]');
    this.listen(frame, 'click', e => {
      if (this.preview) { if (e.target.closest('a')) e.preventDefault(); return; }
      e.preventDefault();
      const act = e.target.closest('[data-act]');
      const item = e.target.closest('.fp-item');
      if (act && item) {
        const id = item.dataset.id, a = act.dataset.act;
        if (a === 'up') this.moveBy(id, -1); else if (a === 'down') this.moveBy(id, 1);
        else if (a === 'dup') this.duplicate(id); else if (a === 'del') this.remove(id);
        return;
      }
      this.select(item ? item.dataset.id : null);
      if (item && this.narrow.matches) this.setPanel('right', true); // small screens: tapping a block opens its settings
    });
    this.listen(this.$('[data-fp="outline"]'), 'click', e => { const b = e.target.closest('[data-sel]'); if (!b) return; this.closeDrawers(); this.select(b.dataset.sel, true); });
    this.listen(this.$('[data-fp="props"]'), 'click', e => {
      const b = e.target.closest('[data-pact]'); if (!b) return;
      const a = b.dataset.pact;
      if (a === 'dup') this.duplicate(this.selected); else if (a === 'del') this.remove(this.selected); else this.select(null);
    });

    /* palette: tap to add, drag to place */
    const pal = this.$('[data-fp="palette"]');
    this.listen(pal, 'click', e => {
      const b = e.target.closest('[data-type]'); if (!b) return;
      const f = this.selected && findById(this.config, this.data.content, this.selected);
      if (f) this.insert(b.dataset.type, f.zoneKey, f.index + 1);
      else this.insert(b.dataset.type, 'root', this.data.content.length);
      this.closeDrawers(); // small screens: show the page with the new block
    });
    this.listen(pal, 'dragstart', e => {
      const b = e.target.closest('[data-type]'); if (!b) return;
      this.drag = { kind: 'new', type: b.dataset.type };
      e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', b.dataset.type);
    });

    this.listen(frame, 'dragstart', e => {
      const item = e.target.closest('.fp-item'); if (!item || this.preview) return;
      e.stopPropagation();
      this.drag = { kind: 'move', id: item.dataset.id };
      e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item.dataset.id);
      setTimeout(() => item.classList.add('is-dragging'));
    });
    this.listen(frame, 'dragover', e => {
      if (!this.drag && !this.preview && [...(e.dataTransfer?.types || [])].includes('Files')) this.drag = { kind: 'file' };
      if (!this.drag) return;
      const zone = e.target.closest('.fp-dz'); if (!zone) return;
      if (this.drag.kind === 'move' && zone.closest(`.fp-item[data-id="${CSS.escape(this.drag.id)}"]`)) { this.clearIndicator(); return; }
      e.preventDefault(); e.stopPropagation();
      e.dataTransfer.dropEffect = this.drag.kind === 'move' ? 'move' : 'copy';
      const kids = [...zone.children].filter(c => c.classList.contains('fp-item'));
      let idx = kids.findIndex(c => { const r = c.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
      if (idx === -1) idx = kids.length;
      if (kids[idx]) zone.insertBefore(this.indicator, kids[idx]); else zone.append(this.indicator);
      this.drop = { zoneKey: zone.dataset.zone, index: idx };
    });
    this.listen(frame, 'drop', e => {
      e.preventDefault();
      const d = this.drag, t = this.drop; this.endDrag();
      if (!d || !t) return;
      if (d.kind === 'file') {
        const files = [...(e.dataTransfer.files || [])].filter(f => /^image\//.test(f.type));
        if (!files.length) { this.toast('Only picture files can be dropped here'); return; }
        if (!this.config.components.Image) return;
        (async () => {
          for (const [n, f] of files.entries()) {
            try { const src = await this.upload(f); this.insert('Image', t.zoneKey, t.index + n, { src, alt: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') }); }
            catch (err) { this.toast(err.message); }
          }
        })();
        return;
      }
      if (d.kind === 'new') this.insert(d.type, t.zoneKey, t.index); else this.move(d.id, t.zoneKey, t.index);
    });
    this.listen(frame, 'dragleave', e => { if (!frame.contains(e.relatedTarget)) { this.clearIndicator(); if (this.drag?.kind === 'file') this.drag = null; } });
    this.listen(document, 'dragend', () => this.endDrag());
    /* stop the browser opening a dropped file when it misses a drop area */
    const noFileNav = e => { if (this.root.contains(e.target) && [...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); };
    this.listen(document, 'dragover', noFileNav); this.listen(document, 'drop', noFileNav);

    /* top bar */
    const on = (sel, fn) => { const n = this.$(sel); if (n) this.listen(n, 'click', fn); };
    on('[data-fp="undo"]', () => this.undo());
    on('[data-fp="redo"]', () => this.redo());
    on('[data-fp="vp"]', e => { const b = e.target.closest('[data-vp]'); if (b) this.setViewport(b.dataset.vp); });
    on('[data-fp="preview"]', () => this.setPreview(!this.preview));
    on('[data-fp="publish"]', () => this.publish());
    on('[data-fp="import"]', () => this.openImport());
    /* developer buttons: onClick(editor, event); a returned promise keeps the button disabled until it settles */
    for (const b of this.toolbarOptions().buttons) {
      const n = this.$(`[data-fp-btn="${CSS.escape(b.id)}"]`);
      if (n && b.onClick) this.listen(n, 'click', async e => {
        n.disabled = true;
        try { await b.onClick(this, e); }
        catch (err) { this.toast(`${b.label || b.id} failed: ${err?.message || err}`); }
        finally { n.disabled = false; }
      });
    }

    /* keyboard: only when focus is in this editor (or nowhere in particular) */
    this.listen(document, 'keydown', e => {
      const a = document.activeElement;
      if (!(this.root.contains(a) || a === document.body || !a)) return;
      const typing = /INPUT|TEXTAREA|SELECT/.test(a?.tagName) || !!a?.isContentEditable;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); }
      else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); this.redo(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && this.selected && !typing && !this.preview && !this.modalOpen()) { e.preventDefault(); this.remove(this.selected); }
      else if (e.key === 'Escape') { if (this.modalOpen()) this.closeModal(); else this.closeDrawers(); }
    });
  }
  clearIndicator() { this.indicator.remove(); this.drop = null; }
  endDrag() { this.clearIndicator(); this.drag = null; this.$$('.is-dragging').forEach(n => n.classList.remove('is-dragging')); }

  /* ---------------- publish / import / dialogs ---------------- */

  /** Same as the Publish button: runs onPublish, or opens the JSON / HTML dialog without it. */
  async publish() {
    const onPublish = this.options.onPublish;
    this.emit('publish', this.getData());
    if (!onPublish) return this.openPublish();
    const btn = this.$('[data-fp="publish"]');
    if (btn) btn.disabled = true;
    try { await onPublish(this.getData()); this.setStatus('published'); this.toast('Published'); }
    catch (err) { this.toast(`Could not publish: ${err?.message || err}`); }
    finally { if (btn) btn.disabled = false; }
  }

  toast(t) { const n = el('div', 'fp-toast', esc(t)); n.setAttribute('role', 'status'); this.root.append(n); setTimeout(() => n.remove(), 2200); }
  modalOpen() { return !!this.$('[data-fp="modal-root"]')?.children.length; }
  closeModal() {
    const r = this.$('[data-fp="modal-root"]'); if (!r?.children.length) return;
    r.innerHTML = '';
    this.lastFocus?.focus?.();
  }
  modal(title, bodyHtml) {
    this.closeModal();
    this.lastFocus = document.activeElement;
    const m = el('div', 'fp-modal'); m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', title);
    m.innerHTML = `<div class="fp-modal-card"><h2>${esc(title)}</h2>${bodyHtml}</div>`;
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) this.closeModal(); });
    this.$('[data-fp="modal-root"]').append(m);
    requestAnimationFrame(() => m.querySelector('textarea, button')?.focus());
    return m;
  }
  openPublish() {
    const data = this.getData();
    const json = JSON.stringify(data, null, 2);
    const html = render(this.config, data);
    const m = this.modal('Publish', `
      <div class="fp-grp"><button type="button" class="fp-btn on" data-tab="json">Page data (JSON)</button><button type="button" class="fp-btn" data-tab="html">Rendered HTML</button></div>
      <textarea readonly aria-label="Output"></textarea>
      <div class="fp-modal-foot"><span class="fp-msg">Pass onPublish to createEditor to save this to your server.</span>
        <div class="fp-grp"><button type="button" class="fp-btn" data-close>Close</button><button type="button" class="fp-btn primary" data-copy>Copy</button></div></div>`);
    const out = m.querySelector('textarea'); out.value = json;
    m.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
      m.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === b));
      out.value = b.dataset.tab === 'json' ? json : html;
    });
    m.querySelector('[data-copy]').onclick = () => {
      const fallback = () => { out.focus(); out.select(); this.toast('Press Ctrl+C to copy'); };
      if (navigator.clipboard) navigator.clipboard.writeText(out.value).then(() => this.toast('Copied'), fallback); else fallback();
    };
  }
  /** Same as the Import button: opens the paste-JSON dialog. */
  openImport() {
    const example = this.options.exampleData;
    const m = this.modal('Import page data', `
      <textarea placeholder='{"root":{"props":{}},"content":[]}' aria-label="Page data JSON"></textarea>
      <div class="fp-modal-foot"><span class="fp-msg" data-msg>Paste JSON exported from Publish.</span>
        <div class="fp-grp">${example ? '<button type="button" class="fp-btn" data-example>Load example</button>' : ''}<button type="button" class="fp-btn" data-close>Cancel</button><button type="button" class="fp-btn primary" data-load>Load</button></div></div>`);
    const load = d => { this.selected = null; d.root ||= { props: {} }; d.root.props ||= {}; this.commit(d); this.closeModal(); this.toast('Page loaded'); this.emit('import', this.getData()); };
    m.querySelector('[data-example]')?.addEventListener('click', () => load(clone(example)));
    m.querySelector('[data-load]').onclick = () => {
      const msg = m.querySelector('[data-msg]');
      try {
        const d = JSON.parse(m.querySelector('textarea').value);
        const v = validateData(this.config, d);
        if (!v.ok) throw new Error(v.errors.slice(0, 3).join('; '));
        load(d);
      } catch (err) { msg.textContent = `Could not load: ${err.message}. Check the JSON and try again.`; msg.classList.add('err'); }
    };
  }
}
