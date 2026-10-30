// Build targets shared by build.mjs and dev.mjs.
import { readFileSync } from 'node:fs';

export const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const banner = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License */`;

// src/index.js exports `version = '__VERSION__'`; fill it in from package.json
const version = {
  name: 'version',
  setup(b) {
    b.onLoad({ filter: /src[\\/]index\.js$/ }, a => ({
      contents: readFileSync(a.path, 'utf8').replace("'__VERSION__'", JSON.stringify(pkg.version)),
      loader: 'js'
    }));
  }
};

const common = { bundle: true, target: ['es2020', 'chrome105', 'firefox110', 'safari16'], banner: { js: banner, css: banner }, logLevel: 'info' };

/** dev: only the unminified files the examples use */
export function targets({ minified = true } = {}) {
  const list = [
    // <script src="pac-editor.js"> → window.PacEditor
    { entryPoints: ['src/index.js'], outfile: 'dist/pac-editor.js', format: 'iife', globalName: 'PacEditor', plugins: [version] },
    // import { createEditor } from 'pac-editor'
    { entryPoints: ['src/index.js'], outfile: 'dist/pac-editor.esm.js', format: 'esm', plugins: [version] },
    // import { render } from 'pac-editor/render' (or require) — no DOM
    { entryPoints: ['src/render.js'], outfile: 'dist/render.esm.js', format: 'esm', platform: 'neutral' },
    { entryPoints: ['src/render.js'], outfile: 'dist/render.cjs', format: 'cjs', platform: 'node' },
    // editor styles (include block styles), and block styles alone for published pages
    { entryPoints: ['src/styles/editor.css'], outfile: 'dist/pac-editor.css' },
    { entryPoints: ['src/styles/blocks.css'], outfile: 'dist/blocks.css' }
  ];
  if (minified) list.push(
    { entryPoints: ['src/index.js'], outfile: 'dist/pac-editor.min.js', format: 'iife', globalName: 'PacEditor', minify: true, sourcemap: true, plugins: [version] },
    { entryPoints: ['src/styles/editor.css'], outfile: 'dist/pac-editor.min.css', minify: true },
    { entryPoints: ['src/styles/blocks.css'], outfile: 'dist/blocks.min.css', minify: true }
  );
  return list.map(t => ({ ...common, ...t }));
}
