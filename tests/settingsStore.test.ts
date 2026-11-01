import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createSettingsStore } from '../src/main/settingsStore';

let dir: string;
let file: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'dogara-'));
  file = join(dir, 'settings.json');
});

afterEach(() => rmSync(dir, { recursive: true, force: true }));

it('arranca vacío si no hay archivo', () => {
  expect(createSettingsStore(file).getModules()).toEqual({});
});

it('conserva lo guardado al volver a abrir', () => {
  const state = { enabled: false, settings: { speed: 1.5 } };
  createSettingsStore(file).setModule('speed', state);

  expect(createSettingsStore(file).getModules()).toEqual({ speed: state });
});

it('crea la carpeta si todavía no existe', () => {
  const nested = join(dir, 'carpeta', 'settings.json');
  createSettingsStore(nested).setModule('speed', { enabled: true, settings: {} });

  expect(createSettingsStore(nested).getModules().speed?.enabled).toBe(true);
});

it('ignora un archivo dañado', () => {
  writeFileSync(file, '{ esto no es JSON');

  expect(createSettingsStore(file).getModules()).toEqual({});
});

it('descarta solo las entradas inválidas', () => {
  const valid = { enabled: true, settings: {} };
  writeFileSync(file, JSON.stringify({ modules: { valid, invalid: { enabled: 'si' } } }));

  expect(createSettingsStore(file).getModules()).toEqual({ valid });
});
