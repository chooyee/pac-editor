# Security

PacEditor is built so that page data, even data from someone you don't trust, cannot add scripts to a rendered page. That only holds if your own blocks follow the same rules, and if your server checks what it receives.

## What PacEditor does

- **Text is escaped.** Built-in blocks pass every value through `esc()`.
- **Links and pictures are checked.** `safeUrl()` allows `http:`, `https:`, `mailto:` and relative links. For pictures it allows `http:`, `https:`, relative paths and `data:image/*`. Anything else, such as `javascript:` or `data:text/html`, becomes `#` (links) or is removed (pictures).
- **Rich text is stored as JSON, not HTML.** `renderRich()` builds the HTML itself: it escapes all text, checks links with `safeUrl`, and only outputs a short list of tags (`p`, `strong`, `em`, `u`, `s`, `a`, `ul`, `ol`, `li`, `blockquote`). Pasted HTML is cleaned by Quill, and anything left over is dropped when the page is rendered.
- **Style values come from fixed lists.** Built-in blocks only output known values (for example column ratios and picture sizes) inside `style` and `class` attributes. Anything else falls back to the default.
- **Imported data is validated.** The Import dialog and `setData()` reject unknown block types, missing or repeated ids, and malformed slots.

## What you must do

1. **Follow the rules in your own blocks.** Use `esc()` for values, `safeUrl()` for addresses and `renderRich()` for rich text, and check style values against a fixed list. See [Configuration → Rules for render](configuration.md#rules-for-render).
2. **Validate on the server.** Treat page JSON from the browser as untrusted. Call `validateData(config, data)` before saving it, and check that the user is allowed to edit that page.
3. **Render with the same config on the server.** Don't trust HTML sent from the browser. Store the JSON and render it yourself.
4. **Control picture uploads.** If you pass `upload`, check file type and size on the server, and serve uploads from a separate domain or with `Content-Disposition` and `X-Content-Type-Options: nosniff`. SVG files can contain scripts: either reject them or serve them as attachments.
5. **Set a Content Security Policy** on public pages. Rendered content needs no inline scripts, so `script-src 'self'` works. The built-in blocks use inline `style` attributes for layout, so `style-src` needs `'unsafe-inline'`.

## Reporting a problem

Please report security problems privately. See [SECURITY.md](../SECURITY.md).
