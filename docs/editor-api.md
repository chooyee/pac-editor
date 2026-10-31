# Editor API

```js
const editor = PacEditor.createEditor(target, options);
// or: import { createEditor } from 'pac-editor';
```

`target` is an element or a CSS selector. The editor fills it, so give it a height. You can have more than one editor on a page.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `config` | `Config` | `defaultConfig` | Blocks, fields, categories and root. See [Configuration](configuration.md). |
| `data` | `Data` | empty page | The page to start with. |
| `onPublish` | `(data) => void \| Promise` | — | Runs when Publish is pressed. While a returned promise is pending, the button is disabled. If it throws, the editor shows the error. Without `onPublish`, Publish opens a dialog with the JSON and the rendered HTML. |
| `onChange` | `(data) => void` | — | Runs after every change, including undo and redo, with a copy of the data. |
| `upload` | `(file) => Promise<string>` | `config.upload`, else data URI | Uploads a picture and returns its URL. Used by picture fields, and when files are dropped on the canvas. |
| `quill` | Quill class or `null` | `window.Quill` | Quill 2, for rich text. Pass `null` to use plain textareas even when Quill is loaded. |
| `storageKey` | `string` | — | Autosaves a draft to localStorage under this key. On start, a valid saved draft is loaded instead of `data`. |
| `rememberLayout` | `boolean \| string` | `true` | Remembers which panels are open and whether the outline is folded (key `pac-editor:ui`). A string uses that key; `false` turns it off. |
| `theme` | `'auto' \| 'light' \| 'dark'` | `'auto'` | `auto` follows the operating system and updates when it changes. |
| `title` | `string` | `'Page Builder'` | Text at the top left. |
| `publishLabel` | `string` | `'Publish'` | Label of the publish button. |
| `showImport` | `boolean` | `true` | Shows the Import button (paste JSON to load a page). |
| `exampleData` | `Data` | — | Adds **Load example** to the Import dialog. |
| `viewports` | `boolean` | `true` | Shows the Desktop / Tablet / Mobile preview buttons. |
| `toolbar` | `object` | — | Hide built-in toolbar buttons and add your own. See [Toolbar](#toolbar). |
| `on` | `object` | — | Event handlers, for example `{ select: id => … }`. The same as calling `editor.on()` for each. See [Events](#events). |

## Toolbar

Working example: [Toolbar & events](https://chooyee.github.io/pac-editor/examples/toolbar-events/) ([source](../examples/toolbar-events/index.html)).

```js
createEditor('#editor', {
  publishLabel: 'Save draft',
  toolbar: {
    preview: false,   // hide Preview
    import: false,    // hide Import
    publish: false,   // hide Publish (the button labelled by publishLabel)
    buttons: [
      {
        id: 'save',
        label: 'Save',
        primary: true,
        onClick: async editor => { await fetch('/api/page', { method: 'PUT', body: JSON.stringify(editor.getData()) }); }
      }
    ]
  }
});
```

| Key | Default | Description |
|---|---|---|
| `undo` | `true` | Undo and Redo buttons. Ctrl/⌘ + Z still works when hidden. |
| `viewports` | `viewports` option, else `true` | Desktop / Tablet / Mobile buttons. |
| `preview` | `true` | Preview button. |
| `import` | `showImport` option, else `true` | Import button. |
| `publish` | `true` | Publish button. |
| `buttons` | `[]` | Your own buttons, placed before Publish. |

Each button takes `id` (required), `label`, `title`, `icon` (SVG markup, inserted as-is, so only pass trusted markup), `primary` and `onClick(editor, event)`. Give a `label`, an `icon`, or both; with both, the label hides on narrow screens. If `onClick` returns a promise, the button is disabled until it settles, and a rejection is shown as a message.

A common setup is a draft save and a publish as two buttons:

```js
createEditor('#editor', {
  data: page,
  publishLabel: 'Publish',
  onPublish: data => api.publish(data),          // the built-in primary button
  toolbar: {
    import: false,
    buttons: [
      { id: 'draft', label: 'Save draft', onClick: editor => api.saveDraft(editor.getData()) }
    ]
  }
});
```

Good to know:

- The toolbar is built once, when the editor is created. To change it, `destroy()` the editor and create a new one.
- `publishLabel` only renames the Publish button; `toolbar.publish: false` hides it. Hiding it does not remove `onPublish`, so `editor.publish()` still uses it.
- Button `id`s must be unique within one editor. They are also the `data-fp-btn` attribute, which you can use in CSS.
- `onClick` does not show a success message, because the editor cannot know what your button did. Show your own message if you need one.
- Without `undo`, Ctrl/⌘ + Z still works. Without `viewports`, the canvas stays at Desktop width unless you call `setViewport()`.

Hidden buttons can still be driven from your own UI outside the editor: `editor.publish()`, `editor.openImport()`, `editor.setPreview(on)`, `editor.setViewport(name)`, `editor.undo()`, `editor.redo()`.

## Events

```js
const off = editor.on('select', id => console.log('selected', id));
off(); // stop listening
```

| Event | Arguments | When |
|---|---|---|
| `change` | `data` | After every change, including undo and redo. |
| `select` | `id` or `null` | The selected block changes; `null` means the page settings. |
| `preview` | `on` | Preview mode turns on or off. |
| `viewport` | `'desktop' \| 'tablet' \| 'mobile'` | The canvas width changes. |
| `publish` | `data` | Publish is pressed or `publish()` is called, before `onPublish` runs. |
| `import` | `data` | A page is loaded from the Import dialog. |

An error thrown by a handler is logged to the console and does not stop the editor or the other handlers.

- `publish` fires when publishing starts, not when it succeeds. To act on success, do it at the end of `onPublish`.
- The `onChange` option and the `change` event receive the same data; use whichever suits you. The data is a copy, so changing it does not change the page; use `setData()` for that.
- `select` fires only when the selection changes through the editor (a click, the outline, a new block or `select()`). It does not fire when `setData()` or undo clears the selection.
- Handlers added with `on()` are removed by `destroy()`.

## Methods

| Method | Description |
|---|---|
| `getData()` | Returns a copy of the current page data. |
| `setData(data, { keepHistory })` | Replaces the page. The data is checked with `validateData` first, and an `Error` is thrown if it is invalid. Clears undo history unless `keepHistory: true`. |
| `undo()`, `redo()` | Same as the toolbar buttons. |
| `select(id, scroll)` | Selects a block by id and opens its settings; `null` selects the page settings. With `scroll: true`, scrolls the block into view. |
| `setTheme(theme)` | Changes the theme at runtime. |
| `setPanel(side, open)` | Opens or closes `'left'` (blocks) or `'right'` (properties). On narrow screens this opens or closes the drawer. |
| `on(event, handler)`, `off(event, handler)` | Adds or removes an event handler. `on` returns a function that removes it. See [Events](#events). |
| `publish()` | Same as the Publish button. |
| `openImport()` | Same as the Import button. |
| `setPreview(on)` | Turns preview mode on or off. |
| `setViewport(name)` | Sets the canvas width: `'desktop'`, `'tablet'` or `'mobile'`. |
| `destroy()` | Removes the editor's markup and every listener it added. Call it before removing the element, for example when a single-page app changes route. |

Properties: `editor.root` (the mount element) and `editor.config`.

## Keyboard

| Keys | Action |
|---|---|
| Ctrl/⌘ + Z | Undo |
| Ctrl/⌘ + Shift + Z, Ctrl/⌘ + Y | Redo |
| Delete / Backspace | Delete the selected block |
| Escape | Leave full-screen text editing, close a dialog, or close an open drawer |
| Ctrl/⌘ + B / I / U | Bold / italic / underline in rich text |

Shortcuts only apply while focus is inside that editor (or on the page body), and never while typing in a field.

## Using it inside a framework

PacEditor renders into a DOM element you own, so it works inside any framework. Create it when the element mounts and destroy it when it unmounts.

React:

```jsx
function PageEditor({ page, onSave }) {
  const ref = useRef(null);
  useEffect(() => {
    const editor = createEditor(ref.current, { data: page, onPublish: onSave });
    return () => editor.destroy();
  }, []);
  return <div ref={ref} style={{ height: '100vh' }} />;
}
```

Vue:

```vue
<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { createEditor } from 'pac-editor';
const props = defineProps({ page: Object });
const el = ref(null); let editor;
onMounted(() => { editor = createEditor(el.value, { data: props.page }); });
onBeforeUnmount(() => editor.destroy());
</script>
<template><div ref="el" style="height: 100vh" /></template>
```

## Other exports

Everything in `pac-editor/render` is also exported from the main entry:

| Export | Description |
|---|---|
| `render(config, data)` | Page data → HTML string. |
| `renderRich(value)` | Rich text value → HTML string. |
| `validateData(config, data)` | Returns `{ ok, errors }`. |
| `emptyData(config)` | An empty page using the root's default props. |
| `defaultConfig`, `blocks`, `root`, `alignField` | The built-in config and its parts. |
| `extendConfig(extra, base?)` | Builds a config from a base. |
| `esc(value)`, `safeUrl(url, img?)` | Escaping and URL checks for `render` functions. |
| `toDelta(value)`, `richText(value)` | Convert between rich text and plain text. |
| `findById`, `slotNames`, `countItems` | Helpers for walking page data. |
| `dataUrlUpload(file)` | The default picture upload (main entry only). |
| `version` | The library version (main entry only). |
