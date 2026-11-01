import { describe, expect, it } from 'vitest';
import { parseListValue, toNumberList } from '../src/renderer/numberList';
import {
  applySettingsPatch,
  toModuleView,
  type ModuleInfo,
  type NumberListField,
} from '../src/shared/modules';

const field: NumberListField = {
  type: 'numberList',
  key: 'presets',
  label: 'Velocidades',
  min: 0.25,
  max: 4,
  suffix: 'x',
  maxItems: 3,
  fixedValues: [1],
};

describe('parseListValue', () => {
  it('acepta números con punto o con coma', () => {
    expect(parseListValue('1.5', field, [])).toEqual({ value: 1.5 });
    expect(parseListValue(' 1,25 ', field, [])).toEqual({ value: 1.25 });
  });

  it('redondea a dos decimales', () => {
    expect(parseListValue('1.333', field, [])).toEqual({ value: 1.33 });
  });

  it.each(['', 'rápido', '0.1', '5'])('rechaza %j', (raw) => {
    expect(parseListValue(raw, field, [])).toHaveProperty('error');
  });

  it('rechaza repetidos, valores fijos y listas llenas', () => {
    expect(parseListValue('1.5', field, [1.5])).toHaveProperty('error');
    expect(parseListValue('1', field, [])).toHaveProperty('error');
    expect(parseListValue('2', field, [1.1, 1.2, 1.3])).toHaveProperty('error');
  });
});

it('toNumberList ordena y descarta lo que no es un número', () => {
  expect(toNumberList([2, 'x', 1.5])).toEqual([1.5, 2]);
  expect(toNumberList('nada')).toEqual([]);
});

describe('estado de los módulos', () => {
  const info: ModuleInfo = {
    id: 'speed',
    name: 'Velocidades',
    description: '',
    defaultEnabled: true,
    settings: { speed: 1, presets: [1.5] },
  };

  it('toModuleView usa los valores por defecto si no hay nada guardado', () => {
    expect(toModuleView(info)).toMatchObject({ enabled: true, settings: info.settings });
  });

  it('toModuleView combina lo guardado con los valores por defecto', () => {
    const view = toModuleView(info, { enabled: false, settings: { speed: 2 } });

    expect(view.enabled).toBe(false);
    expect(view.settings).toEqual({ speed: 2, presets: [1.5] });
  });

  it('applySettingsPatch ignora opciones que el módulo no declara', () => {
    const state = applySettingsPatch(toModuleView(info), { presets: [2], rara: true });

    expect(state).toEqual({ enabled: true, settings: { speed: 1, presets: [2] } });
  });

  it('applySettingsPatch ignora cambios inválidos', () => {
    expect(applySettingsPatch(toModuleView(info), 'nada').settings).toEqual(info.settings);
    expect(applySettingsPatch(toModuleView(info), null).settings).toEqual(info.settings);
  });
});
