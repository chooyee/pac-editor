import { uid } from './utils.js';

/*
 * Page data mirrors Puck:
 *   { root: { props }, content: [ { type, props: { id, ...fields } } ] }
 * Slot fields store nested item arrays directly in props.
 * A zone key is "root" or "<itemId>/<slotName>".
 */

export function slotNames(config, type) {
  const f = config.components[type]?.fields || {};
  return Object.keys(f).filter(k => f[k].type === 'slot');
}

export function findById(config, items, id, zoneKey = 'root') {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.props.id === id) return { item: it, zone: items, index: i, zoneKey };
    for (const s of slotNames(config, it.type)) {
      const r = findById(config, it.props[s] || [], id, `${it.props.id}/${s}`);
      if (r) return r;
    }
  }
  return null;
}

export function getZone(config, data, key) {
  if (key === 'root') return data.content;
  const [id, slot] = key.split('/');
  const f = findById(config, data.content, id);
  if (!f) return null;
  return (f.item.props[slot] ||= []);
}

/** Give an item (and everything in its slots) fresh ids, e.g. after duplicating it. */
export function reId(config, item) {
  item.props.id = item.type + '-' + uid();
  for (const s of slotNames(config, item.type)) (item.props[s] || []).forEach(c => reId(config, c));
  return item;
}

/** Count every item in the page, including items inside slots. */
export function countItems(config, items) {
  return (items || []).reduce((n, it) => n + 1 + slotNames(config, it.type).reduce((m, s) => m + countItems(config, it.props[s]), 0), 0);
}

/** An empty page for a config, using the root's default props. */
export function emptyData(config) {
  return { root: { props: { ...(config.root?.defaultProps || {}) } }, content: [] };
}

/**
 * Check the shape of page data against a config.
 * Returns { ok, errors }. Use it before loading untrusted data and on the server before saving.
 */
export function validateData(config, data) {
  const errors = [];
  if (!data || typeof data !== 'object') return { ok: false, errors: ['data must be an object'] };
  if (!Array.isArray(data.content)) errors.push('missing a "content" array');
  if (data.root != null && (typeof data.root !== 'object' || (data.root.props != null && typeof data.root.props !== 'object'))) errors.push('"root.props" must be an object');
  const ids = new Set();
  (function walk(items, where) {
    if (!Array.isArray(items)) return;
    items.forEach((it, i) => {
      const at = `${where}[${i}]`;
      if (!it || typeof it !== 'object') { errors.push(`${at} is not an object`); return; }
      if (!config.components[it.type]) { errors.push(`${at} has unknown type "${it.type}"`); return; }
      if (!it.props || typeof it.props !== 'object') { errors.push(`${at} is missing "props"`); return; }
      if (typeof it.props.id !== 'string' || !it.props.id) errors.push(`${at} is missing "props.id"`);
      else if (ids.has(it.props.id)) errors.push(`${at} repeats id "${it.props.id}"`);
      else ids.add(it.props.id);
      for (const s of slotNames(config, it.type)) {
        if (it.props[s] != null && !Array.isArray(it.props[s])) errors.push(`${at}.props.${s} must be an array`);
        else walk(it.props[s] || [], `${at}.props.${s}`);
      }
    });
  })(data.content, 'content');
  return { ok: errors.length === 0, errors };
}
