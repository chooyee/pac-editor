# PacEditor

A drag-and-drop page builder you can drop into any web page with one `<script>` tag. No React, no framework, no build step required.

PacEditor stores pages in the same JSON shape as [Puck](https://puckeditor.com), so the ideas (config, components, fields, slots) carry over. The difference is that PacEditor is plain JavaScript: it works on a static HTML page, a server-rendered app, or inside any framework.

- **Editor**: block palette, drag and drop, nested layouts (slots), properties panel, undo/redo, outline, preview at desktop/tablet/mobile widths, light and dark themes, collapsible panels that turn into drawers on phones.
- **Rich text** via [Quill](https://quilljs.com), stored as JSON (not HTML), so saved pages cannot inject markup.
- **Renderer** that turns page data into HTML. It has no DOM dependency, so you can render on the server (Node, Deno, Bun, workers) or in the browser.
- **Your own blocks** in a few lines: a block is a label, some fields and a `render` function that returns HTML.
- **Small**: about 43 KB minified for the editor and renderer together (Quill is optional and loaded separately).

**[Try the live demo](https://chooyee.github.io/pac-editor/examples/demo/)** · [all examples](https://chooyee.github.io/pac-editor/examples/)

> Status: early (0.x). The data format follows Puck and is expected to stay stable; the JavaScript API may still change before 1.0. See the [changelog](CHANGELOG.md).

## Quick start (script tag)

Build the files once (`npm install && npm run build`), or use a CDN once the package is published to npm.

```html
<!doctype html>
<html>
<head>
  <link rel="stylesheet" href="dist/pac-editor.css">
  <style>html, body { margin: 0; height: 100%; } #editor { height: 100%; }</style>
</head>
<body>
  <div id="editor"></div>

  <!-- Optional: Quill enables rich text. Without it, the Text block uses a plain textarea. -->
  <script src="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js"></script>
  <script src="dist/pac-editor.js"></script>
  <script>
    PacEditor.createEditor('#editor', {
      data: { root: { props: { title: 'Home' } }, content: [] },
      onPublish: async data => {
        await fetch('/api/pages/home', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      }
    });
  </script>
</body>
</html>
```

From a CDN (after the package is published):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pac-editor@0.1/dist/pac-editor.min.css">
<script src="https://cdn.jsdelivr.net/npm/pac-editor@0.1/dist/pac-editor.min.js"></script>
```

## Quick start (npm)

```sh
npm install pac-editor quill
```

```js
import Quill from 'quill';
import { createEditor } from 'pac-editor';
import 'pac-editor/editor.css';

createEditor(document.getElementById('editor'), { quill: Quill, data, onPublish: save });
```

## Showing a published page

Publishing gives you JSON. Turn it into HTML with `render`, and include `blocks.css` on the public page:

```js
// Server (Node, Deno, Bun, workers) — no DOM needed
import { render, validateData, defaultConfig } from 'pac-editor/render';

const check = validateData(defaultConfig, data);
if (!check.ok) throw new Error(check.errors.join('\n'));
const html = render(defaultConfig, data);   // <div class="fp-site">…</div>
```

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pac-editor@0.1/dist/blocks.min.css">
```

## Your own blocks

```js
import { createEditor, extendConfig, esc } from 'pac-editor';

const Quote = {
  label: 'Quote',
  fields: { text: { type: 'textarea', label: 'Quote' }, by: { type: 'text', label: 'Who said it' } },
  defaultProps: { text: 'Something memorable.', by: '' },
  render: p => `<blockquote class="x-quote">${esc(p.text)}<cite>${esc(p.by)}</cite></blockquote>`
};

const config = extendConfig({ components: { Quote }, categories: { Text: ['Heading', 'Text', 'Quote'] } });
createEditor('#editor', { config });
```

Use the same `config` when you call `render` on the server.

## Documentation

| Guide | What it covers |
|---|---|
| [Getting started](docs/getting-started.md) | Installing, mounting the editor, saving and loading pages |
| [Configuration](docs/configuration.md) | Components, fields (including rich text, arrays, slots and custom fields), categories, the page root |
| [Editor API](docs/editor-api.md) | Every `createEditor` option and editor method |
| [Rendering and styling](docs/rendering.md) | Server and browser rendering, CSS, theming with CSS variables |
| [Security](docs/security.md) | How output is kept safe, and what your server must still do |
| [Architecture](docs/architecture.md) | How the code is organised, for contributors |

Examples live in [`examples/`](examples/). Try them [online](https://chooyee.github.io/pac-editor/examples/), or run `npm run dev` and open <http://localhost:8000/examples/>. The online copy is rebuilt from `main` by the [Pages workflow](.github/workflows/pages.yml). Most example pages load PacEditor from jsDelivr (`pac-editor@0.1`), so they show the published npm version. Toolbar & events loads your local `dist/`, because it uses features not yet released.

## Browser support

Current versions of Chrome, Edge, Firefox and Safari (2023 or later). The editor uses CSS container queries, `:has()` and `<details>`.

## Contributing

Bug reports, ideas and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md). Report security problems privately as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
