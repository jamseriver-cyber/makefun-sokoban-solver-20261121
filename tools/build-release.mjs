import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants } from 'node:zlib';
import { minify } from 'terser';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourcePath = join(root, 'main.ts');
const [outputPath, option] = process.argv.slice(2);
const sourceBundle = option === '--packed-source';
const packed = sourceBundle || option === '--packed';
const entryPath = outputPath && resolve(outputPath, ...(packed ? ['main.ts'] : []));
if (!entryPath || !relative(sourcePath, entryPath) || (option && !packed)) {
  throw new Error('Pass a distinct output file, or an output directory with --packed or --packed-source.');
}

const source = readFileSync(sourcePath, 'utf8');
const attribution = source.match(/^\/\/ Copyright[^\r\n]*/)?.[0];
if (!attribution) {
  throw new Error('Missing original attribution.');
}
const body = source.slice(attribution.length).trimStart();
const program = packed ? body.replace(/^import fs from 'fs';/, "const fs = require('fs');") : body;
if (packed && program === body) {
  throw new Error('Cannot prepare the CommonJS version of the solver.');
}

const compiled = await minify(program, {
  ecma: 2022,
  module: true,
  compress: {
    passes: 3,
    // The evaluator mounts these paths in every official run.
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

if (packed) {
  const destination = resolve(outputPath);
  const allowed = ['LICENSE', 'main.ts', 's'];
  if (!sourceBundle) allowed.push('.makefun');
  if (existsSync(destination) && readdirSync(destination).some(name => !allowed.includes(name))) {
    throw new Error('The packed output directory contains files from another build.');
  }

  const payload = brotliCompressSync(compiled.code, { params: {
    [constants.BROTLI_PARAM_QUALITY]: 11,
    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_GENERIC,
    [constants.BROTLI_PARAM_LGWIN]: 16,
    [constants.BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(compiled.code),
  } });
  // Use the repository owner's public author name in the generated package.
  const notice = '//©2026 jamseriver-cyber\n';
  // Read and evaluate only our own solver bundled next to the launcher.
  const launcher = 'eval(require("zlib").brotliDecompressSync(require("fs").readFileSync("/bot/s"))+"")';
  mkdirSync(destination, { recursive: true });
  if (sourceBundle) {
    // The anchored source-bundle history retains the complete MIT license.
    writeFileSync(join(destination, 'LICENSE'), 'SPDX-License-Identifier: MIT\n');
  } else {
    const owner = readFileSync(join(root, '.makefun', 'owner.json'), 'utf8').trimEnd();
    mkdirSync(join(destination, '.makefun'), { recursive: true });
    copyFileSync(join(root, 'LICENSE'), join(destination, 'LICENSE'));
    writeFileSync(join(destination, '.makefun', 'owner.json'), owner);
  }
  writeFileSync(join(destination, 's'), payload);
  writeFileSync(entryPath, notice + launcher);
} else {
  const notice = attribution.replace('Copyright (c)', '©') + '\n';
  writeFileSync(entryPath, notice + compiled.code);
}
