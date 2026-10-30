import { esc, safeUrl } from '../core/utils.js';
import { renderRich } from '../core/richtext.js';

/*
 * Built-in blocks. Each component is { label, icon?, fields, defaultProps, render(props, { slot, edit }) }.
 * Rules for render: return an HTML string, wrap every user value in esc(), pass every URL
 * through safeUrl(), and output rich text with renderRich().
 * The markup is styled by blocks.css under the .fp-site root.
 */

/** Reusable field definition: left / center / right alignment. */
export const alignField = { type: 'radio', label: 'Alignment', options: [{ label: 'Left', value: 'left' }, { label: 'Center', value: 'center' }, { label: 'Right', value: 'right' }] };
const ALIGNS = ['left', 'center', 'right'];
const align = v => ALIGNS.includes(v) ? v : 'left';
const oneOf = (v, list, d) => list.includes(v) ? v : d;

const PIC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></svg>';

export const Image = {
  label: 'Picture',
  icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  fields: {
    src: { type: 'image', label: 'Picture' },
    alt: { type: 'text', label: 'Alt text (describe the picture)' },
    caption: { type: 'text', label: 'Caption' },
    size: { type: 'select', label: 'Size', options: [{ label: 'Full bleed', value: 'full' }, { label: 'Wide', value: 'wide' }, { label: 'Medium', value: 'medium' }, { label: 'Small', value: 'small' }] },
    ratio: { type: 'select', label: 'Shape', options: [{ label: 'Original', value: 'auto' }, { label: 'Landscape 16:9', value: '16 / 9' }, { label: 'Classic 4:3', value: '4 / 3' }, { label: 'Square 1:1', value: '1 / 1' }, { label: 'Portrait 3:4', value: '3 / 4' }] },
    align: alignField
  },
  defaultProps: { src: '', alt: '', caption: '', size: 'wide', ratio: 'auto', align: 'center' },
  render: (p, { edit }) => {
    const src = safeUrl(p.src, true);
    const ratio = oneOf(p.ratio, ['16 / 9', '4 / 3', '1 / 1', '3 / 4'], 'auto');
    const auto = ratio === 'auto';
    const style = auto ? '' : ` style="aspect-ratio:${ratio}"`;
    const body = src
      ? `<img src="${esc(src)}" alt="${esc(p.alt)}" loading="lazy">`
      : `<div class="b-img-empty">${PIC_ICON}<span>${edit ? 'Select this block, then upload a picture' : ''}</span></div>`;
    return `<figure class="b-img size-${oneOf(p.size, ['full', 'wide', 'medium', 'small'], 'wide')} align-${align(p.align)}"><div class="b-img-frame${auto ? ' auto' : ''}"${style}>${body}</div>${p.caption ? `<figcaption>${esc(p.caption)}</figcaption>` : ''}</figure>`;
  }
};

export const Hero = {
  label: 'Hero',
  icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h9M7 12.5h6"/><rect x="7" y="15" width="5" height="2" rx="1"/>',
  fields: {
    title: { type: 'text', label: 'Title' },
    subtitle: { type: 'textarea', label: 'Subtitle' },
    cta: { type: 'text', label: 'Button label' },
    href: { type: 'text', label: 'Button link' },
    align: { ...alignField, options: alignField.options.slice(0, 2) }
  },
  defaultProps: { title: 'Page headline', subtitle: 'A short supporting line.', cta: 'Get started', href: '#', align: 'left' },
  render: p => `<section class="b-hero ${p.align === 'center' ? 'center' : ''}"><h1>${esc(p.title)}</h1>${p.subtitle ? `<p>${esc(p.subtitle)}</p>` : ''}${p.cta ? `<div><a class="b-btn" href="${esc(safeUrl(p.href) || '#')}">${esc(p.cta)}</a></div>` : ''}</section>`
};

export const Heading = {
  label: 'Heading',
  icon: '<path d="M6 4v16M18 4v16M6 12h12"/>',
  fields: {
    text: { type: 'text', label: 'Text' },
    level: { type: 'select', label: 'Level', options: [{ label: 'H1', value: 'h1' }, { label: 'H2', value: 'h2' }, { label: 'H3', value: 'h3' }] },
    align: alignField
  },
  defaultProps: { text: 'Section heading', level: 'h2', align: 'left' },
  render: p => { const L = oneOf(p.level, ['h1', 'h2', 'h3'], 'h2'); return `<div class="b-head ${align(p.align)}"><${L}>${esc(p.text)}</${L}></div>`; }
};

export const Text = {
  label: 'Text',
  icon: '<path d="M4 6h16M4 10h16M4 14h16M4 18h10"/>',
  fields: { text: { type: 'richtext', label: 'Text' }, align: alignField },
  defaultProps: { text: { ops: [{ insert: 'Write your paragraph here. Use the toolbar for bold, lists, quotes and links.\n' }] }, align: 'left' },
  render: p => `<div class="b-text ${align(p.align)}">${renderRich(p.text)}</div>`
};

export const Notice = {
  label: 'Notice',
  icon: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  fields: {
    tone: { type: 'radio', label: 'Tone', options: [{ label: 'Info', value: 'info' }, { label: 'Warning', value: 'warning' }] },
    title: { type: 'text', label: 'Title' },
    text: { type: 'textarea', label: 'Message' }
  },
  defaultProps: { tone: 'info', title: 'Note', text: 'Important information for readers.' },
  render: p => `<div class="b-note ${p.tone === 'warning' ? 'warning' : 'info'}" role="note"><strong>${esc(p.title)}</strong><span>${esc(p.text)}</span></div>`
};

export const Button = {
  label: 'Button',
  icon: '<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M8 12h8"/>',
  fields: {
    label: { type: 'text', label: 'Label' },
    href: { type: 'text', label: 'Link' },
    variant: { type: 'radio', label: 'Style', options: [{ label: 'Primary', value: 'primary' }, { label: 'Secondary', value: 'secondary' }] },
    align: alignField
  },
  defaultProps: { label: 'Learn more', href: '#', variant: 'primary', align: 'left' },
  render: p => `<div class="b-btnrow ${align(p.align)}"><a class="b-btn ${p.variant === 'secondary' ? 'secondary' : ''}" href="${esc(safeUrl(p.href) || '#')}">${esc(p.label)}</a></div>`
};

export const Columns = {
  label: 'Columns',
  icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  fields: {
    ratio: { type: 'select', label: 'Column split', options: [{ label: '50 / 50', value: '1fr 1fr' }, { label: '66 / 33', value: '2fr 1fr' }, { label: '33 / 66', value: '1fr 2fr' }] },
    left: { type: 'slot' },
    right: { type: 'slot' }
  },
  defaultProps: { ratio: '1fr 1fr', left: [], right: [] },
  render: (p, { slot }) => `<div class="b-cols" style="grid-template-columns:${oneOf(p.ratio, ['1fr 1fr', '2fr 1fr', '1fr 2fr'], '1fr 1fr')}"><div>${slot('left')}</div><div>${slot('right')}</div></div>`
};

export const CardGrid = {
  label: 'Card grid',
  icon: '<rect x="3" y="4" width="7.5" height="7" rx="1.5"/><rect x="13.5" y="4" width="7.5" height="7" rx="1.5"/><rect x="3" y="13" width="7.5" height="7" rx="1.5"/><rect x="13.5" y="13" width="7.5" height="7" rx="1.5"/>',
  fields: {
    columns: { type: 'number', label: 'Columns', min: 1, max: 4 },
    items: {
      type: 'array', label: 'Cards', defaultItemProps: { title: 'Card title', body: 'Card description.', image: '', alt: '' },
      arrayFields: { title: { type: 'text', label: 'Title' }, body: { type: 'textarea', label: 'Body' }, image: { type: 'image', label: 'Picture (optional)' }, alt: { type: 'text', label: 'Picture alt text' } }
    }
  },
  defaultProps: { columns: 3, items: [{ title: 'First', body: 'Description.' }, { title: 'Second', body: 'Description.' }, { title: 'Third', body: 'Description.' }] },
  render: p => `<div class="b-cards" style="grid-template-columns:repeat(${Math.min(4, Math.max(1, +p.columns || 1))},minmax(0,1fr))">${(Array.isArray(p.items) ? p.items : []).map(c => `<article class="b-card">${safeUrl(c?.image, true) ? `<img class="b-card-img" src="${esc(safeUrl(c.image, true))}" alt="${esc(c.alt)}" loading="lazy">` : ''}<h3>${esc(c?.title)}</h3><p>${esc(c?.body)}</p></article>`).join('')}</div>`
};

export const Spacer = {
  label: 'Spacer',
  icon: '<path d="M4 4h16M4 20h16M12 8v8M9.5 10.5 12 8l2.5 2.5M9.5 13.5 12 16l2.5-2.5"/>',
  fields: { size: { type: 'number', label: 'Height (px)', min: 0, max: 240 } },
  defaultProps: { size: 32 },
  render: p => `<div aria-hidden="true" style="height:${Math.min(240, Math.max(0, +p.size || 0))}px"></div>`
};

/** The default page root: page title and footer, wrapped in .fp-site. */
export const root = {
  fields: {
    title: { type: 'text', label: 'Page title' },
    footer: { type: 'text', label: 'Footer text' }
  },
  defaultProps: { title: 'Untitled page', footer: '' },
  render: (p, { children }) => `<div class="fp-site">${children}${p.footer ? `<footer class="fp-site-footer">${esc(p.footer)}</footer>` : ''}</div>`
};

export const blocks = { Image, Hero, Heading, Text, Notice, Button, Columns, CardGrid, Spacer };

/** Ready-to-use config with every built-in block. */
export const defaultConfig = {
  root,
  categories: {
    Text: ['Heading', 'Text', 'Notice'],
    Media: ['Image'],
    Actions: ['Button'],
    Layout: ['Hero', 'Columns', 'CardGrid', 'Spacer']
  },
  components: blocks
};

/**
 * Build a config from a base (the default config unless given), adding or replacing components,
 * categories and the root. Pass a component as null to remove it.
 *   extendConfig({ components: { Quote }, categories: { Text: ['Heading', 'Text', 'Quote'] } })
 */
export function extendConfig(extra = {}, base = defaultConfig) {
  const components = { ...base.components, ...(extra.components || {}) };
  for (const [k, v] of Object.entries(components)) if (v == null) delete components[k];
  const categories = {};
  for (const [cat, types] of Object.entries({ ...base.categories, ...(extra.categories || {}) })) {
    if (types == null) continue;
    const list = types.filter(t => components[t]);
    if (list.length) categories[cat] = list;
  }
  return { ...base, ...extra, root: extra.root || base.root, components, categories };
}
