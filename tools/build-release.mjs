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
  compress: { passes: 3 },
  mangle: true,
  format: { max_line_len: 112 },
});
if (!compiled.code) {
  throw new Error('Terser emitted no code.');
}

writeFileSync(outputPath, attribution + '\n' + compiled.code.trimEnd() + '\n');
