import { esc } from './utils.js';

const SVG = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${p}</svg>`;
export const ICON = {
  up: SVG('<path d="m6 15 6-6 6 6"/>'),
  down: SVG('<path d="m6 9 6 6 6-6"/>'),
  copy: SVG('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'),
  del: SVG('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>')
};
const ACTIONS = `<div class="fp-actions">
  <button type="button" data-act="up" title="Move up" aria-label="Move up">${ICON.up}</button>
  <button type="button" data-act="down" title="Move down" aria-label="Move down">${ICON.down}</button>
  <button type="button" data-act="dup" title="Duplicate" aria-label="Duplicate">${ICON.copy}</button>
  <button type="button" data-act="del" title="Delete" aria-label="Delete">${ICON.del}</button></div>`;

/* Render items in a zone; ctx.edit adds the editor's wrappers and drop zones. */
function renderZone(config, items, zoneKey, ctx) {
  const html = (items || []).map(it => renderItem(config, it, ctx)).join('');
  if (!ctx.edit) return html;
  return `<div class="fp-dz" data-zone="${esc(zoneKey)}">${html || '<div class="fp-dz-empty">Drop blocks here</div>'}</div>`;
}

function renderItem(config, it, ctx) {
  const comp = config.components[it?.type];
  if (!comp || !it.props) return '';
  const id = it.props.id;
  const inner = comp.render(it.props, {
    slot: name => renderZone(config, it.props[name] || [], `${id}/${name}`, ctx),
    edit: !!ctx.edit
  });
  if (!ctx.edit) return inner;
  const sel = ctx.selected === id;
  return `<div class="fp-item${sel ? ' is-sel' : ''}" data-id="${esc(id)}" draggable="true" data-label="${esc(comp.label || it.type)}">${sel ? ACTIONS : ''}${inner}</div>`;
}

/**
 * Render page data to an HTML string. Pure: safe to run on a server.
 * @param {object} config  component config
 * @param {object} data    page data { root, content }
 * @param {object} [ctx]   internal: { edit, selected } used by the editor canvas
 */
export function render(config, data, ctx = {}) {
  const children = renderZone(config, data?.content || [], 'root', ctx);
  return config.root.render(data?.root?.props || {}, { children, edit: !!ctx.edit });
}
