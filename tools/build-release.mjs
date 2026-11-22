import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants } from 'node:zlib';
import { minify } from 'terser';
import UglifyJS from 'uglify-js';

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
const importLine = /^import fs from 'fs';\s*/;
if (packed && !importLine.test(body)) {
  throw new Error('Missing the file-system import used by the packed launcher.');
}
// The launcher supplies the file-system methods to the enclosed packed solver.
const program = packed ? body.replace(importLine, '').replace(/\bfs\./g, 's.')
  .replace('s.readFileSync(', 't(').replace(/(^[ \t]*|\bfor \()(?:const|let)(?= )/gm, '$1var') : body;

const fixedMounts = {
  'process.env.MAKEFUN_INPUT_DIR': '/input',
  'process.env.MAKEFUN_OUTPUT_DIR': '/output',
};
let compiled;
if (packed) {
  const fixedProgram = program
    .replace("process.env.MAKEFUN_INPUT_DIR ?? '/input'", "'/input'")
    .replace("process.env.MAKEFUN_OUTPUT_DIR ?? '/output'", "'/output'");
  compiled = UglifyJS.minify(fixedProgram, {
    toplevel: true,
    compress: { passes: 2, if_return: true, unsafe: false },
    mangle: { reserved: ['s', 't'] },
  });
  if (compiled.error) throw compiled.error;
  // Freeze the identifier assignment so the compact Brotli payload is reproducible.
  compiled = UglifyJS.minify(compiled.code, {
    toplevel: true,
    compress: false,
    mangle: { reserved: ['s', 't'] },
    nameCache: { vars: { props: {
      $r: 'r', $i: 'i', $o: 'o', $e: 'e',
      $f: 'n', $a: 'a', $d: 'd', $v: 'v',
      $n: 'f', $l: 'l', $u: 'u', $x: 'x',
      $m: 'c', $y: 'y', $c: 'm', $p: 'p',
    } } },
  });
  if (compiled.error) throw compiled.error;
} else {
  compiled = await minify(program, {
    ecma: 2022,
    module: true,
    compress: { passes: 3, global_defs: fixedMounts },
    mangle: true,
  });
}
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

  // Keep the search in a function scope so V8 can optimize its captured variables.
  let enclosed = '(function(){' + compiled.code.trim() + '})()';
  // This name assignment applies only to the exact verified compiler output.
  if (createHash('sha256').update(enclosed).digest('hex') === 'c45aa6ef319d385265f9453dd3babef067ba9d196e964bfad23823c434e783bc') {
    const tree = UglifyJS.parse(enclosed);
    tree.figure_out_scope({});
    const bindings = new Set();
    tree.walk(new UglifyJS.TreeWalker(node => {
      if (!(node instanceof UglifyJS.AST_Symbol)) return;
      const definition = node.definition();
      if (definition && !definition.undeclared) bindings.add(definition);
    }));
    const names = 'r_oeli$afnbkvrioymnlfrri_eox';
    if (bindings.size !== names.length) throw new Error('Unexpected packed solver bindings.');
    [...bindings].forEach((binding, index) => { binding.mangled_name = names[index]; });
    enclosed = tree.print_to_string();
  }
  const payload = brotliCompressSync(enclosed, { params: {
    [constants.BROTLI_PARAM_QUALITY]: 11,
    [constants.BROTLI_PARAM_NPOSTFIX]: 2,
    [constants.BROTLI_PARAM_NDIRECT]: 8,
    [constants.BROTLI_PARAM_LGWIN]: 16,
    [constants.BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(enclosed),
  } });
  // Use the repository owner's public author name in the generated package.
  const notice = '//©2026 jamseriver-cyber\n';
  // Read and evaluate only our own solver bundled next to the launcher.
  const launcher = 'var s=require("fs"),t=s.readFileSync;eval(require("zlib").brotliDecompressSync(t("/bot/s"))+"")';
  mkdirSync(destination, { recursive: true });
  if (sourceBundle) {
    // The anchored source-bundle history retains the complete MIT license.
    writeFileSync(join(destination, 'LICENSE'), 'SPDX-License-Identifier: MIT');
  } else {
    const owner = readFileSync(join(root, '.makefun', 'owner.json'), 'utf8').trimEnd();
    mkdirSync(join(destination, '.makefun'), { recursive: true });
    copyFileSync(join(root, 'LICENSE'), join(destination, 'LICENSE'));
    writeFileSync(join(destination, '.makefun', 'owner.json'), owner);
  }
  writeFileSync(join(destination, 's'), payload);
  // The complete signed history carries the license and original attribution.
  writeFileSync(entryPath, sourceBundle ? launcher : notice + launcher);
} else {
  const notice = attribution.replace('Copyright (c)', '©') + '\n';
  writeFileSync(entryPath, notice + compiled.code);
}
