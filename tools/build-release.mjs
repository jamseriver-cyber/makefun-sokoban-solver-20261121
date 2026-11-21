import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minify } from 'terser';

const sourcePath = fileURLToPath(new URL('../main.ts', import.meta.url));
const [outputPath] = process.argv.slice(2);
if (!outputPath || resolve(outputPath) === sourcePath) {
  throw new Error('Pass an output path distinct from main.ts.');
}

const source = readFileSync(sourcePath, 'utf8');
const attribution = source.match(/^\/\/ Copyright[^\n]*/)?.[0];
if (!attribution) {
  throw new Error('Missing original attribution.');
}

const compiled = await minify(source.slice(attribution.length).trimStart(), {
  ecma: 2022,
  module: true,
  compress: {
    passes: 3,
    // Paths mounted by Make.fun for every scored execution.
    global_defs: {
      'process.env.MAKEFUN_INPUT_DIR': '/input',
      'process.env.MAKEFUN_OUTPUT_DIR': '/output',
    },
  },
  mangle: true,
});
if (!compiled.code) {
  throw new Error('Terser emitted no code.');
}

const releaseNotice = attribution.replace('Copyright (c)', '©');
writeFileSync(outputPath, releaseNotice + '\n' + compiled.code);
