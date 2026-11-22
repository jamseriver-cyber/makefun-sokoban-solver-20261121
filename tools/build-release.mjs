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
  if (createHash('sha256').update(enclosed).digest('hex') === '38fb439b49b64d495fe82838804078397c8c4e7fb324a4cd93f228ae54c015e0') {
    const tree = UglifyJS.parse(enclosed);
    tree.figure_out_scope({});
    const bindings = new Set();
    tree.walk(new UglifyJS.TreeWalker(node => {
      if (!(node instanceof UglifyJS.AST_Symbol)) return;
      const definition = node.definition();
      if (definition && !definition.undeclared) bindings.add(definition);
    }));
    const names = ["r","co","o","e","l","_","i","a","c","n","b","k","u","r","i","e","v","m","n","l","c","r","r","i","e","o","x"];
    if (bindings.size !== names.length) throw new Error('Unexpected packed solver bindings.');
    [...bindings].forEach((binding, index) => { binding.mangled_name = names[index]; });
    enclosed = tree.print_to_string();
  }
  // Two line breaks reduce the packed size of this exact solver.
  if (createHash('sha256').update(enclosed).digest('hex') === 'ef1b7bc40af9d7dbdaa06566933f9f361514de8cd7635cd171891b0caa8e57d4') {
    const prefix = '(function(){for(var r=6;--r;){';
    if (!enclosed.startsWith(prefix)) throw new Error('Unexpected solver prefix.');
    enclosed = '(function(){\nfor(var r=6;--r;){\n' + enclosed.slice(prefix.length);
  }
  // The pinned code has two for-loop initializers. Preserve each
  // dependency and use the declaration order that compresses best.
  if (createHash('sha256').update(enclosed).digest('hex') === 'd8373fcd6fc8a390851ee2da52ef5ab9dc040e2be68b666d71c41a10a1dd609d') {
    const orders = [
      ["co","o","e","c","_","l","a","i"],
      ["x","k","b","n","u","v","m"],
    ];
    const tree = UglifyJS.parse(enclosed);
    const initializers = [];
    tree.walk(new UglifyJS.TreeWalker(node => {
      if (node instanceof UglifyJS.AST_For && node.init instanceof UglifyJS.AST_Var && node.init.definitions.length > 1) {
        initializers.push(node.init);
      }
    }));
    if (initializers.length !== orders.length) throw new Error('Unexpected solver initializers.');
    initializers.forEach((initializer, index) => {
      const byName = new Map(initializer.definitions.map(definition => [definition.name.name, definition]));
      const order = orders[index];
      if (order.length !== byName.size || order.some(name => !byName.has(name))) {
        throw new Error('Unexpected solver declarations.');
      }
      initializer.definitions = order.map(name => byName.get(name));
    });
    enclosed = tree.print_to_string().replace(/^(\(function\(\)\{)(for\([^{}]+\)\{)/, '$1\n$2\n');
  }
  // Both operands are integers. Swapping them leaves the XOR
  // result unchanged and saves a byte in the packed solver.
  if (createHash('sha256').update(enclosed).digest('hex') === '598df8f9d64cca7d28681efee059152845ca90afcc4c38eae199031c292878bf') {
    enclosed = enclosed.replace('l^(o&&o|u[e+r])', '(o&&o|u[e+r])^l');
  }
  // Share the "/i00" path prefix in the compressed literals. Post-increment
  // from one visits the same push budgets as pre-increment from zero.
  if (createHash('sha256').update(enclosed).digest('hex') === 'be1373946c059dee2a44bdecce494a31b971dbf82ced54cff589267e8778116c') {
    enclosed = enclosed
      .replace('co="/i00"+r,o="/output"+co,e=t("/input"+co+"/level.txt")',
        'o="/output/i00"+r,e=t("/input/i00"+r+"/level.txt")')
      .replace('var x=0,k=1', 'var x=1,k=1')
      .replace('!m(_,b,++x)', '!m(_,b,x++)')
      .replace('k|=2&r&&n', 'k|=r&2&&n');
  }
  const payload = brotliCompressSync(enclosed, { params: {
    [constants.BROTLI_PARAM_QUALITY]: 11,
    [constants.BROTLI_PARAM_NPOSTFIX]: 3,
    [constants.BROTLI_PARAM_NDIRECT]: 16,
    [constants.BROTLI_PARAM_LGWIN]: 16,
    [constants.BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(enclosed),
  } });
  // Use the repository owner's public author name in the generated package.
  const notice = '//©2026 jamseriver-cyber\n';
  // Read and evaluate only our own solver bundled next to the launcher.
  // The exact release runs as a standalone CommonJS process. Bind the two
  // file-system helpers and the module loader once in that fresh process.
  const confirmedPayload = createHash('sha256').update(enclosed).digest('hex') ===
    'e8324e5dca8b19dacc1ccc53b0dd501c8340cef1211b8df707cbed08dbce7543';
  const launcher = confirmedPayload
    ? 'q=require,s=q("fs"),t=s.readFileSync;eval(q("zlib").brotliDecompressSync(t("/bot/s"))+"")'
    : 'var s=require("fs"),t=s.readFileSync;eval(require("zlib").brotliDecompressSync(t("/bot/s"))+"")';
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
