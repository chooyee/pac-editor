# Vanilla Page Builder — handoff notes

A framework-free drag-and-drop page builder (CMS editor). Its config and data model follow Puck (https://puckeditor.com/docs), but it uses no React. The prototype is one file: `page-builder.html`.

## Data model (Puck-compatible)

```json
{
  "root": { "props": { "title": "Home", "footer": "" } },
  "content": [
    { "type": "Hero", "props": { "id": "Hero-ab12cd", "title": "..." } },
    { "type": "Columns", "props": { "id": "Columns-x1", "ratio": "1fr 1fr",
        "left": [ { "type": "Text", "props": { "id": "Text-y2", "text": "..." } } ],
        "right": [] } }
  ]
}
```

Slot fields, such as `left` and `right` on Columns, store nested items directly in `props`. Every item has a unique `props.id`.

## Code map (inside the `<script>`)

| Part | What it does |
|---|---|
| `renderPage(config, data, ctx)` | Pure function that turns page data into an HTML string. With `ctx.edit=true` it adds editor wrappers. It is safe to run on a server (Node). |
| `renderZone`, `renderItem` | Recursive rendering. A slot is rendered by calling `slot(name)` inside a component's `render`. |
| `findById`, `getZone`, `reId` | Tree helpers. A zone key is `"root"` or `"<itemId>/<slotName>"`. |
| `config` | Component registry: `components`, `categories`, `root`, `upload`. |
| `Editor` | State, history (undo/redo, typing is merged into one step), actions, drag and drop, and panels. |
| `Editor` actions | `insert`, `move`, `moveBy`, `remove`, `duplicate`, `setProp`. Each one clones the data, changes the clone, then commits it. |
| `buildField` | Field controls for `text`, `textarea`, `richtext`, `number`, `select`, `radio`, `array`, `image`. A `slot` field has no control. |
| `renderRich` | Turns a `richtext` value into HTML. It is pure and safe to run on a server. It escapes all text, passes links through `safeUrl`, and drops formats outside `RICH_FORMATS`. A plain string (older pages) renders as paragraphs. |
| `buildRichText` | The `richtext` editor: Quill 2 (loaded from jsDelivr) with its own themed toolbar. If Quill fails to load, the field falls back to a plain textarea. |
| `uploadImage` | Picture upload hook. It currently embeds pictures as data URIs; replace it with a media API call. |
| `safeUrl` | Allows only http(s), mailto, relative paths and `data:image/*` in links and pictures. Quill's link format also uses it. |

## Adding a component

```js
config.components.Quote = {
  label: 'Quote',
  icon: '<path d="M5 6v12M10 8h9M10 12h9M10 16h6"/>', // optional palette icon: inner SVG markup, 24×24 viewBox, stroked
  fields: { text: { type: 'textarea', label: 'Quote' }, by: { type: 'text', label: 'Attribution' } },
  defaultProps: { text: '...', by: '' },
  render: (p, { slot, edit }) => `<blockquote class="b-quote">${esc(p.text)}<cite>${esc(p.by)}</cite></blockquote>`
};
config.categories.Text.push('Quote');
```

Rules for `render`: return an HTML string, wrap every user value in `esc()`, and pass every URL through `safeUrl()`. For a `richtext` field, output `renderRich(p.field)` instead of `esc()`.

## Rich text

A `richtext` field (used by the Text block) stores a Quill Delta, not HTML:

```json
{ "ops": [ { "insert": "Replies within " }, { "insert": "one day", "attributes": { "bold": true } }, { "insert": "\nMember number" }, { "insert": "\n", "attributes": { "list": "bullet" } } ] }
```

- Allowed formats (`RICH_FORMATS`): bold, italic, underline, strike, link, bulleted/numbered list, quote. Pasted colours, fonts, sizes and images are stripped.
- Font family, colour and size are left out on purpose, so pages keep the site theme and stay readable in dark mode. Headings come from the Heading block, and alignment from the block's Alignment setting.
- Because the stored value is JSON and `renderRich` escapes everything, imported or API-supplied data cannot inject markup.
- Older pages that store `text` as a plain string still render, and the editor converts them on the first edit.

## Known gaps before production

1. **Split into modules**: `core.js` (render and tree helpers, no DOM), `editor.js`, `fields.js`, `config.js`, `editor.css`, `site.css`.
2. **Persistence**: replace the localStorage draft with a CMS API (save draft, publish, version history).
3. **Media**: point `config.upload` at the media service so it returns URLs instead of data URIs.
4. **Server-side**: re-validate the data shape and URLs, and sanitize the rendered HTML (for example with DOMPurify) before serving it.
5. **Not built yet**: `resolveData`/`resolveFields`, permissions, data migrations, a canvas iframe for CSS isolation, keyboard drag-and-drop (accessibility), and touch dragging (phones currently use tap-to-add and the up/down buttons).
