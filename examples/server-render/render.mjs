// Render saved page data to a static HTML file on the server — no browser, no DOM.
//   npm run build && node examples/server-render/render.mjs
// In an app you would do the same inside a route handler (Express, Fastify, Next.js, a worker…).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { render, validateData, defaultConfig, esc } from '../../dist/render.esm.js';
// In your own project: import { render, validateData, defaultConfig, esc } from 'pac-editor/render';

const data = JSON.parse(readFileSync(new URL('../data/sample-page.json', import.meta.url), 'utf8'));

// Always validate data you did not create yourself before rendering or saving it.
const check = validateData(defaultConfig, data);
if (!check.ok) throw new Error(`Invalid page data:\n${check.errors.join('\n')}`);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(data.root.props.title)}</title>
  <link rel="stylesheet" href="../../dist/blocks.css">
</head>
<body style="margin:0">
${render(defaultConfig, data)}
</body>
</html>
`;

const out = new URL('./output.html', import.meta.url);
writeFileSync(out, html);
console.log(`Wrote ${fileURLToPath(out)}`);
