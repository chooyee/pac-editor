# Getting started

This guide takes you from an empty page to an editor that saves to your server and a public page that shows the result.

## 1. Get the files

Choose one:

- **npm** (bundlers such as Vite, webpack, esbuild):
  ```sh
  npm install pac-editor quill
  ```
- **CDN** (plain HTML, after the package is published):
  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pac-editor@0.1/dist/pac-editor.min.css">
  <script src="https://cdn.jsdelivr.net/npm/pac-editor@0.1/dist/pac-editor.min.js"></script>
  ```
- **From source**:
  ```sh
  git clone https://github.com/chooyee/pac-editor.git
  cd pac-editor && npm install && npm run build   # writes dist/
  ```

### What is in `dist/`

| File | Use it for |
|---|---|
| `pac-editor.js` / `pac-editor.min.js` | `<script>` tag. Adds `window.PacEditor`. |
| `pac-editor.esm.js` | `import` in the browser or a bundler (the package's main entry). |
| `render.esm.js` / `render.cjs` | Rendering on a server. No DOM. Import as `pac-editor/render`. |
| `pac-editor.css` / `pac-editor.min.css` | The editor. Already includes the block styles. |
| `blocks.css` / `blocks.min.css` | Public pages that show rendered content. |

Quill is optional. Load it before PacEditor (or pass it as the `quill` option) to get rich text in the Text block. Without Quill, rich text fields fall back to a plain textarea.

## 2. Mount the editor

The editor fills the element you mount it into, so give that element a height.

```html
<link rel="stylesheet" href="/dist/pac-editor.css">
<style>html, body { margin: 0; height: 100%; } #editor { height: 100%; }</style>

<div id="editor"></div>

<script src="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js"></script>
<script src="/dist/pac-editor.js"></script>
<script>
  const editor = PacEditor.createEditor('#editor');
</script>
```

On screens 960px wide or narrower, the side panels become slide-in drawers and the page scrolls normally.

With a bundler:

```js
import Quill from 'quill';
import { createEditor } from 'pac-editor';
import 'pac-editor/editor.css';

const editor = createEditor('#editor', { quill: Quill });
```

## 3. Load and save pages

Page data is plain JSON in the same shape as Puck:

```json
{
  "root": { "props": { "title": "Home", "footer": "" } },
  "content": [
    { "type": "Heading", "props": { "id": "Heading-1", "text": "Welcome", "level": "h1", "align": "left" } },
    { "type": "Columns", "props": { "id": "Columns-1", "ratio": "1fr 1fr",
        "left":  [ { "type": "Text", "props": { "id": "Text-1", "text": "Left column" } } ],
        "right": [] } }
  ]
}
```

Each block has a `type` (a component name in your config) and `props`, including a unique `id`. Slot fields, such as `left` and `right` on Columns, hold nested blocks.

Load a page with `data`, and save it in `onPublish`:

```js
const page = await fetch('/api/pages/home').then(r => r.json());

PacEditor.createEditor('#editor', {
  data: page,
  onPublish: async data => {
    const res = await fetch('/api/pages/home', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Save failed'); // the editor shows "Could not publish: Save failed"
  }
});
```

While `onPublish` is running, the Publish button stays disabled. If it throws, the editor shows the error and the page stays as it is.

Other ways to get the data out:

- `onChange: data => …` runs after every edit (useful for "unsaved changes" warnings or your own autosave).
- `editor.getData()` returns the current page at any time.
- `storageKey: 'my-draft'` autosaves a draft to the browser's localStorage and restores it on reload.

To rename the Publish button (for example to "Save draft"), use `publishLabel`. To hide Preview, Import or Publish, or add your own buttons such as a separate "Save draft" and "Publish", use the `toolbar` option. See [Editor API → Toolbar](editor-api.md#toolbar).

## 4. Show the page to visitors

Render the saved JSON to HTML. Rendering on the server is best: visitors get HTML straight away and search engines can read it.

```js
import { render, validateData, defaultConfig, esc } from 'pac-editor/render';

app.get('/', async (req, res) => {
  const data = await db.pages.get('home');
  const check = validateData(defaultConfig, data);
  if (!check.ok) return res.status(500).send('Invalid page');
  res.send(`<!doctype html>
    <link rel="stylesheet" href="/dist/blocks.css">
    <title>${esc(data.root.props.title)}</title>
    ${render(defaultConfig, data)}`);
});
```

Or in the browser:

```html
<link rel="stylesheet" href="/dist/blocks.css">
<main id="page"></main>
<script src="/dist/pac-editor.js"></script>
<script>
  fetch('/api/pages/home').then(r => r.json()).then(data => {
    document.getElementById('page').innerHTML = PacEditor.render(PacEditor.defaultConfig, data);
  });
</script>
```

If you use custom blocks, pass the same config to `render` that you gave the editor, and include your blocks' CSS.

## 5. Store pictures properly

By default, uploaded pictures are shrunk and embedded in the page JSON as data URIs. That is fine for trying things out, but it makes pages large. In production, upload to your own storage and return a URL:

```js
PacEditor.createEditor('#editor', {
  upload: async file => {
    const body = new FormData();
    body.append('file', file);
    const res = await fetch('/api/media', { method: 'POST', body });
    if (!res.ok) throw new Error('Upload failed');
    return (await res.json()).url;   // e.g. "https://cdn.example.com/media/abc.jpg"
  }
});
```

## Next steps

- Add your own blocks: [Configuration](configuration.md)
- All options and methods: [Editor API](editor-api.md)
- Match your brand's colours and fonts: [Rendering and styling](rendering.md)
- Before going live: [Security](security.md)
