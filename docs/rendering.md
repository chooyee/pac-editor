# Rendering and styling

## Rendering

`render(config, data)` turns page data into an HTML string. It does not use the DOM, so it runs anywhere JavaScript runs.

```js
import { render, defaultConfig } from 'pac-editor/render';       // ES modules
const { render, defaultConfig } = require('pac-editor/render');  // CommonJS

const html = render(defaultConfig, data);
// <div class="fp-site"><section class="b-hero">…</section>…</div>
```

- Use the **same config** as the editor. Unknown block types are skipped, not rendered.
- The output contains no scripts and no editor markup.
- Run `validateData(config, data)` on data from outside (an API request, an import) before you save or render it.

A complete server example is in [`examples/server-render/render.mjs`](../examples/server-render/render.mjs).

### Rendering in the browser

```js
document.querySelector('#page').innerHTML = PacEditor.render(PacEditor.defaultConfig, data);
```

Server rendering is usually better for public pages: the content arrives with the page, and search engines can read it.

## Stylesheets

| File | Contains | Load it on |
|---|---|---|
| `pac-editor.css` | Editor interface + block styles | The editor page |
| `blocks.css` | Block styles only | Public pages |

Both have `.min.css` versions. Every rule is scoped: editor styles under `.fp-editor`, block styles under `.fp-site`. Neither file styles `html`, `body` or bare elements, so they can share a page with your own CSS.

Fonts are not loaded for you. The styles use Instrument Sans and JetBrains Mono if the page has them, and fall back to the system font otherwise. The examples load them from Google Fonts.

## Theming

Change the look by setting CSS variables. You do not need to edit PacEditor's CSS.

### Published content (`.fp-site`)

```css
.fp-site {
  --fp-accent: #0a7d5a;        /* buttons and links */
  --fp-on-accent: #ffffff;     /* text on accent */
  --fp-paper: #ffffff;         /* page background */
  --fp-paper-fg: #1b2422;      /* text */
  --fp-paper-muted: #56625f;   /* secondary text */
  --fp-paper-tint: #f2f5f4;    /* hero and image placeholder background */
  --fp-line: #d5dcda;          /* borders */
  --fp-info-bg: #e7efff;  --fp-info-fg: #1f3f99;   /* Notice: info */
  --fp-warn-bg: #fff4e0;  --fp-warn-fg: #7a4b00;   /* Notice: warning */
  --fp-font-ui: "Your Font", system-ui, sans-serif;
}
```

Dark mode: add `data-theme="dark"` to `.fp-site` or any ancestor (for example `<html data-theme="dark">`). Override the dark values with `[data-theme="dark"] .fp-site { … }`.

Content is light unless you ask for dark. If your site follows the operating system, set the attribute from your own code, or copy the dark variables into a `@media (prefers-color-scheme: dark)` rule.

### The editor (`.fp-editor`)

```css
.fp-editor {
  --fp-accent: #0a7d5a;
  --fp-accent-soft: #dff3ec;   /* selected states */
  --fp-bg: #eef1f0;            /* behind the canvas */
  --fp-panel: #f8faf9;         /* side panels and top bar */
  --fp-fg: #17201e;
  --fp-muted: #5d6b68;
  --fp-line: #d5dcda;
  --fp-danger: #b4322a;
  --fp-left-width: 240px;      /* blocks panel */
  --fp-right-width: 300px;     /* properties panel */
}
.fp-editor[data-theme="dark"] { --fp-accent: #5fd0a8; /* … */ }
```

The editor sets `data-theme` on its own element from the `theme` option. The canvas follows the editor's theme, so you can check your content in both.

### Phone layout

Blocks switch to their phone layout (stacked columns, smaller padding) when the **content area** is 600px wide or less. This uses a container query, not the window width. So the editor's Mobile preview is accurate, and content placed in a narrow column of your site also gets the phone layout.
