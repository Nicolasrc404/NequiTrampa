#!/usr/bin/env node
// Runner de pruebas unitarias sin dependencias nuevas.
// 1. Compila src/config, src/services, src/utils y tests/unit a CommonJS (.test-build).
// 2. Ejecuta `node --test` sobre el resultado.
// Funciona en Windows, macOS y Linux (no usa comandos de shell).

import { rmSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(projectRoot, '.test-build');
const tscBin = path.join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc');

rmSync(outDir, { recursive: true, force: true });

function run(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) {
    console.error(`[test:unit] no se pudo ejecutar ${label}:`, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[test:unit] ${label} falló con código ${result.status}.`);
    process.exit(result.status ?? 1);
  }
}

run(
  process.execPath,
  [tscBin, '-p', 'tsconfig.test.json'],
  'la compilación de pruebas (tsc)',
);

const testsRoot = path.join(outDir, 'tests', 'unit');
const testFiles = readdirSync(testsRoot)
  .filter((name) => name.endsWith('.test.js'))
  .map((name) => path.join(testsRoot, name));

if (testFiles.length === 0) {
  console.error('[test:unit] no se encontraron pruebas compiladas.');
  process.exit(1);
}

run(
  process.execPath,
  ['--test', ...testFiles],
  'las pruebas unitarias (node --test)',
);
