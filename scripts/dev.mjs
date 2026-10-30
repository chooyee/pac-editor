// npm run dev → rebuild dist/ on change and serve the project at http://localhost:8000
// Open http://localhost:8000/examples/ to try the examples.
import { context } from 'esbuild';
import { targets } from './targets.mjs';

const ctxs = await Promise.all(targets({ minified: false }).map(t => context(t)));
await Promise.all(ctxs.map(c => c.watch()));
const { port } = await ctxs[0].serve({ servedir: '.', port: Number(process.env.PORT) || 8000 });
console.log(`\n  PacEditor dev server: http://localhost:${port}/examples/\n`);
