import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants } from 'node:zlib';
import { minify } from 'terser';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourcePath = join(root, 'main.ts');
const [outputPath, option] = process.argv.slice(2);
const packed = option === '--packed';
const entryPath = outputPath && resolve(outputPath, ...(packed ? ['main.ts'] : []));
if (!entryPath || entryPath === sourcePath || (option && !packed)) {
  throw new Error('Pass a distinct output file, or an output directory followed by --packed.');
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
    // Path mounts are fixed when Make.fun grades the submitted entry.
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

const notice = attribution.replace('Copyright (c)', '©') + '\n';
if (packed) {
  const destination = resolve(outputPath);
  const payload = brotliCompressSync(compiled.code, { params: {
    [constants.BROTLI_PARAM_QUALITY]: 11,
    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_GENERIC,
    [constants.BROTLI_PARAM_LGWIN]: 10,
    [constants.BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(compiled.code),
  } });
  // The launcher only evaluates the solver embedded in this same committed package.
  const launcher = 'eval(require("zlib").brotliDecompressSync(require("fs").readFileSync(__dirname+"/s"))+"");';
  mkdirSync(join(destination, '.makefun'), { recursive: true });
  copyFileSync(join(root, 'LICENSE'), join(destination, 'LICENSE'));
  copyFileSync(join(root, '.makefun', 'owner.json'), join(destination, '.makefun', 'owner.json'));
  writeFileSync(join(destination, 's'), payload);
  writeFileSync(entryPath, notice + launcher);
} else {
  writeFileSync(entryPath, notice + compiled.code);
}
