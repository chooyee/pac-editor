# Configuration

The config tells PacEditor which blocks exist, what settings each one has, and how to turn them into HTML. It has the same structure as a [Puck config](https://puckeditor.com/docs/api-reference/configuration/config), except that `render` returns an HTML string instead of a React element.

```js
const config = {
  root: { fields, defaultProps, render },        // the page itself
  components: { Heading: {...}, Text: {...} },  // the blocks
  categories: { Text: ['Heading', 'Text'] },     // palette groups (optional)
  upload: async file => url                      // optional default picture upload
};
```

Pass it to the editor (`createEditor(el, { config })`) **and** to `render(config, data)`. If you leave it out, the editor uses `defaultConfig`.

## Built-in blocks

`defaultConfig` contains:

| Name | Label | Fields |
|---|---|---|
| `Heading` | Heading | text, level (h1–h3), align |
| `Text` | Text | text (rich text), align |
| `Notice` | Notice | tone (info/warning), title, text |
| `Image` | Picture | src (image), alt, caption, size, ratio, align |
| `Button` | Button | label, href, variant, align |
| `Hero` | Hero | title, subtitle, cta, href, align |
| `Columns` | Columns | ratio, left (slot), right (slot) |
| `CardGrid` | Card grid | columns, items (array of title, body, image, alt) |
| `Spacer` | Spacer | size |

Each one is also exported on its own (`blocks.Heading`, `blocks.Text`, …) if you want to build a config from scratch.

## Extending the default config

`extendConfig` copies a base config (the default one unless you pass another) and changes only what you name:

```js
import { extendConfig } from 'pac-editor';

const config = extendConfig({
  components: { Quote, Pricing, Spacer: null },          // add two blocks, remove Spacer
  categories: { Marketing: ['Hero', 'Pricing', 'Quote'] } // add a palette group
});
```

- A component set to `null` is removed, and it disappears from every category.
- A category set to `null` is removed. Components that are not in any category appear under **Other**.
- `extendConfig` never changes the base config.

## Writing a block

```js
import { esc, safeUrl, renderRich } from 'pac-editor';

const Callout = {
  label: 'Callout',                                // palette and outline name
  icon: '<path d="M4 6h16v10H8l-4 4z"/>',          // optional, see below
  fields: {
    title: { type: 'text', label: 'Title' },
    body:  { type: 'richtext', label: 'Body' },
    link:  { type: 'text', label: 'Link' }
  },
  defaultProps: { title: 'Did you know?', body: 'Add some detail.', link: '' },
  render: (props, { slot, edit }) => `
    <aside class="x-callout">
      <h3>${esc(props.title)}</h3>
      ${renderRich(props.body)}
      ${props.link ? `<a href="${esc(safeUrl(props.link))}">Read more</a>` : ''}
    </aside>`
};
```

### Rules for `render`

`render` returns a string of HTML. The editor shows that HTML on the canvas, and `render()` on your server outputs it to visitors. To keep it safe:

1. Wrap every value that came from the editor in `esc()`.
2. Pass every link and picture address through `safeUrl()` (`safeUrl(url, true)` for pictures), then `esc()`.
3. Output rich text fields with `renderRich()`, never by inserting the value directly.
4. Values used inside `style` or `class` should come from a fixed list. Check them against the allowed values instead of escaping them, because `esc()` does not stop CSS like `red; background:url(…)`.

`render` gets a second argument:

- `slot(name)` returns the rendered HTML for a slot field (see Slots below).
- `edit` is `true` on the editor canvas and `false` in published output. Use it for hints that only editors should see, such as "Upload a picture" placeholders.

### Palette icon

`icon` is the inside of an SVG with a 24×24 viewBox. It is drawn with `stroke="currentColor"`, a 1.8 stroke width and no fill, the same style as [Lucide](https://lucide.dev) icons, so you can usually copy the `<path>` elements from there. Blocks without an icon get a plain square.

### Styling your blocks

Give your markup class names, and scope the CSS under `.fp-site` so it applies both on the canvas and on public pages:

```css
.fp-site .x-callout { margin: 16px 32px; padding: 16px; border-radius: 8px; background: var(--fp-paper-tint); }
```

Use the `--fp-*` variables to stay in step with the theme (see [Rendering and styling](rendering.md)). Load this CSS on the editor page and on public pages.

## Fields

Every field has a `type` and an optional `label`. The value is stored in `props` under the field's key.

| Type | Value | Options |
|---|---|---|
| `text` | string | `placeholder` |
| `textarea` | string | `placeholder` |
| `number` | number, or `''` when empty | `min`, `max`, `placeholder` |
| `richtext` | Quill Delta `{ ops: [...] }` (or a plain string in older data) | — |
| `select` | string | `options: [{ label, value }]` |
| `radio` | string | `options: [{ label, value }]` |
| `image` | URL string | — (uses the editor's `upload`) |
| `array` | array of objects | `arrayFields`, `defaultItemProps`, `getItemSummary(item, i)`, `max` |
| `object` | object | `objectFields` |
| `slot` | array of blocks | — (no control; edited on the canvas) |
| `custom` | anything | `render({ id, field, value, onChange })` |

### Rich text

A `richtext` field stores a [Quill Delta](https://quilljs.com/docs/delta/), which is JSON, not HTML:

```json
{ "ops": [
  { "insert": "Replies within " },
  { "insert": "one day", "attributes": { "bold": true } },
  { "insert": "\nMember number" },
  { "insert": "\n", "attributes": { "list": "bullet" } }
] }
```

- Allowed formats: bold, italic, underline, strikethrough, link, bulleted and numbered lists, and quotes. Anything else, including colours, fonts, sizes and pictures pasted from Word or a web page, is removed.
- Font, colour and size are left out on purpose, so pages keep your site's design and stay readable in dark mode. Use a Heading block for headings, and the block's alignment setting for alignment.
- Render it with `renderRich(value)`. It escapes all text and checks every link with `safeUrl`.
- The field's toolbar has a full-screen button for long text. Esc or the same button returns to the panel. Nothing needs to be configured.
- The editor needs [Quill 2](https://quilljs.com) for this field. Without Quill, the field becomes a textarea and stores a plain string, which `renderRich` also understands.

### Arrays

```js
items: {
  type: 'array',
  label: 'Team members',
  arrayFields: { name: { type: 'text', label: 'Name' }, photo: { type: 'image', label: 'Photo' } },
  defaultItemProps: { name: 'New person', photo: '' },
  getItemSummary: item => item.name,   // title shown on each item
  max: 12
}
```

Fields inside an array can be any type except `slot`.

### Slots (nested blocks)

A `slot` field holds blocks. It has no control in the properties panel; people drag blocks into it on the canvas. Render it with `slot(name)`:

```js
const Section = {
  label: 'Section',
  fields: { tone: { type: 'radio', options: [{ label: 'Plain', value: 'plain' }, { label: 'Tinted', value: 'tint' }] }, body: { type: 'slot' } },
  defaultProps: { tone: 'plain', body: [] },
  render: (p, { slot }) => `<section class="x-section ${p.tone === 'tint' ? 'tint' : ''}">${slot('body')}</section>`
};
```

Always give slot fields an empty array in `defaultProps`.

### Custom fields

When the built-in controls are not enough, `custom` lets you build your own. `render` returns an element; call `onChange` with the new value.

```js
const colourField = {
  type: 'custom',
  label: 'Accent colour',
  render: ({ id, value, onChange }) => {
    const select = document.createElement('select');
    select.id = id;   // so the label points at it
    for (const [label, v] of [['Blue', 'blue'], ['Green', 'green']]) select.add(new Option(label, v, false, v === value));
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }
};
```

The control is rebuilt whenever the panel is redrawn (for example after undo), so read the starting state from `value` rather than keeping it elsewhere.

## The page root

`root` describes page-level settings and wraps the page. The default root has a page title and footer text and outputs `<div class="fp-site">…</div>`:

```js
root: {
  fields: { title: { type: 'text', label: 'Page title' }, footer: { type: 'text', label: 'Footer text' } },
  defaultProps: { title: 'Untitled page', footer: '' },
  render: (props, { children }) => `<div class="fp-site">${children}<footer class="fp-site-footer">${esc(props.footer)}</footer></div>`
}
```

If you replace it, keep the `fp-site` class on the outer element: the block styles and the editor rely on it. Page settings open when nothing is selected, or with **Page settings** in the properties panel.

## Categories

`categories` groups the palette. Keys are headings, values are component names in order:

```js
categories: { Text: ['Heading', 'Text'], Layout: ['Columns', 'Spacer'] }
```

Components not listed in any category appear at the end under **Other**. With no `categories` at all, every component appears under **Blocks**.
