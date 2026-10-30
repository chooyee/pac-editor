# Architecture

Notes for contributors: how the code is organised and why.

## Layout

```
src/
  core/            no DOM; runs on servers
    utils.js       esc, safeUrl, clone, uid, paras
    tree.js        page-data helpers: findById, getZone, reId, validateData, emptyData, countItems
    render.js      render(config, data, ctx): data → HTML (ctx.edit adds the editor's wrappers)
    richtext.js    renderRich: Quill Delta → safe HTML
  blocks/index.js  built-in blocks, defaultConfig, extendConfig
  editor/          browser only
    editor.js      Editor class: state, history, actions, panels, drag and drop, dialogs
    fields.js      buildField: the properties-panel controls, including the Quill rich text control
    upload.js      default picture upload (data URI)
  styles/
    blocks.css     published content, scoped under .fp-site
    editor.css     editor interface, scoped under .fp-editor (imports blocks.css)
  render.js        entry: pac-editor/render (core + blocks)
  index.js         entry: pac-editor (everything)
types/             hand-written TypeScript declarations
scripts/           esbuild build and dev server
test/              node:test unit tests for the core
examples/          runnable examples
prototype/         the original single-file prototype, kept for reference
```

## Data model

The page data follows Puck:

```
{ root: { props }, content: [ { type, props: { id, ...fields } } ] }
```

Slot fields store nested items directly in `props`. A **zone key** names a list of items: `"root"` or `"<itemId>/<slotName>"`. Drop zones on the canvas carry their zone key in `data-zone`.

## How the editor works

- **State**: `editor.data` is the page. Every change goes through `mutate(fn)`. `mutate` clones the data, lets `fn` change the clone, then calls `commit`. `commit` pushes to the history (100 steps), saves the draft, calls `onChange` and re-renders. Typing in one field within 1.2 s is merged into a single undo step (`coalesce`).
- **Rendering**: the canvas is `render(config, data, { edit: true, selected })` set as `innerHTML`, so what editors see is exactly what visitors get, plus wrappers (`.fp-item`, `.fp-dz`). The properties panel is rebuilt when the selection changes or on undo/redo. It is not rebuilt while typing (`keepPanel`), so focus stays in the field.
- **Events**: one delegated listener per area (canvas, palette, outline, properties). Listeners on `document` are registered through `listen()`, so `destroy()` can remove them. Keyboard shortcuts only act when focus is inside that editor.
- **Panels**: on wide screens the grid columns animate to 0 (`is-left-closed` / `is-right-closed`). At 960px and below the panels are fixed drawers (`is-left-open` / `is-right-open`) with a backdrop.
- **Rich text**: Quill is used as an input only. Its formats are limited to `RICH_FORMATS`, it has no toolbar module (PacEditor draws its own), and its link check is replaced with `safeUrl`. The stored value is the Delta; HTML is only made by `renderRich`.

## Principles

- **Core stays DOM-free.** Anything under `src/core` and `src/blocks` must import and run in Node. Unit tests import these files directly.
- **Output is safe by construction.** Escape, check URLs and use allow-lists in `render`, and never trust stored data. New built-in blocks need tests for hostile input.
- **Scope everything.** CSS lives under `.fp-editor` or `.fp-site` and uses `--fp-*` variables. Element lookups go through `this.$()`, never `document.querySelector`, so several editors can share a page.
- **No runtime dependencies.** Quill is optional and passed in. Development uses esbuild only.

## Known gaps

- Keyboard-only drag and drop (blocks can be moved with the ↑/↓ buttons, but not dragged with the keyboard).
- Touch dragging on phones (tap-to-add and ↑/↓ work).
- The canvas shares the page's CSS. An iframe canvas would isolate it fully.
- Puck features not yet covered: `resolveData`, `resolveFields`, permissions, field-level `visible`, data migrations.
- No browser end-to-end tests in CI yet.
