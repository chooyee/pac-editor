// npm run build → dist/
import { build } from 'esbuild';
import { rmSync, mkdirSync } from 'node:fs';
import { targets } from './targets.mjs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
await Promise.all(targets().map(t => build(t)));
