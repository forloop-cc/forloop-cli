import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/forloop.mjs',
  banner: { js: '#!/usr/bin/env node' },
  external: [
    '@opencode-ai/plugin',
  ],
  sourcemap: false,
  minify: false,
  treeShaking: true,
  logLevel: 'info',
});

console.log(`\n  Built forloop-cli v${pkg.version} → dist/forloop.mjs`);
