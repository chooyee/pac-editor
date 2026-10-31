# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Before 1.0, minor versions may contain breaking changes; they are listed under **Changed**.

## [Unreleased]

## [0.2.0] - 2026-10-31

### Added
- `toolbar` option: hide Undo/Redo, viewport, Preview, Import or Publish buttons, and add your own buttons with `onClick(editor, event)`.
- Events: `editor.on(type, handler)` / `off`, and an `on` option, for `change`, `select`, `preview`, `viewport`, `publish` and `import`.
- Editor methods `setPreview(on)` and `setViewport(name)`; `publish()` and `openImport()` are now documented.
- Full-screen mode for rich text fields (toolbar button; Esc exits).
- Toolbar & events example, and an examples index that maps common tasks to examples and docs.

### Changed
- Text, lists and quotes in the Text block are no longer limited to 68 characters wide.

## [0.1.0] - 2026-10-30

First release as a library, built from the single-file prototype (kept in `prototype/`).

### Added
- `createEditor(target, options)` / `Editor` class. Several editors can share a page, and `destroy()` removes all listeners.
- Editor options: `config`, `data`, `onPublish`, `onChange`, `upload`, `quill`, `storageKey`, `rememberLayout`, `theme`, `title`, `publishLabel`, `showImport`, `exampleData`, `viewports`.
- Editor methods: `getData`, `setData`, `undo`, `redo`, `select`, `setTheme`, `setPanel`, `destroy`.
- `pac-editor/render` entry with no DOM dependency: `render`, `renderRich`, `validateData`, `defaultConfig`, `extendConfig`, `esc`, `safeUrl` and helpers. Ships as ESM and CommonJS.
- Built-in blocks: Heading, Text (rich text), Notice, Picture, Button, Hero, Columns, Card grid, Spacer.
- Field types: text, textarea, number, richtext, select, radio, image, array (with `getItemSummary` and `max`), object, slot, custom.
- Rich text with Quill 2, stored as a Delta and rendered safely by `renderRich`.
- Collapsible side panels that slide on wide screens and become drawers on narrow screens; collapsible outline with a block count; palette icons.
- Light and dark themes through `--fp-*` CSS variables. All CSS is scoped under `.fp-editor` and `.fp-site`.
- Phone layout for blocks uses a container query, so the Mobile preview is accurate.
- TypeScript declarations, unit tests, examples and documentation.

### Changed (compared with the prototype)
- CSS classes and variables now use the `fp-` prefix; the published root is `.fp-site` (was `.site`).
- Style values in built-in blocks (column ratio, picture size and shape) come from fixed lists instead of being escaped.

[Unreleased]: https://github.com/chooyee/pac-editor/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/chooyee/pac-editor/releases/tag/v0.2.0
[0.1.0]: https://github.com/chooyee/pac-editor/releases/tag/v0.1.0
