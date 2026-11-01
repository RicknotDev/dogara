import type { NumberListField } from '../shared/modules';

export type AddResult = { value: number } | { error: string };

// Comprueba lo que escribió el usuario antes de sumarlo a la lista.
export function parseListValue(raw: string, field: NumberListField, current: number[]): AddResult {
  const text = raw.trim().replace(',', '.');
  const parsed = Number(text);
  const suffix = field.suffix ?? '';

  if (text === '' || !Number.isFinite(parsed)) return { error: 'Escribí un número.' };

  const value = Math.round(parsed * 100) / 100;
  if (value < field.min || value > field.max) {
    return { error: `Tiene que estar entre ${field.min}${suffix} y ${field.max}${suffix}.` };
  }
  if (current.includes(value) || field.fixedValues?.includes(value)) {
    return { error: `${value}${suffix} ya está en la lista.` };
  }
  if (field.maxItems !== undefined && current.length >= field.maxItems) {
    return { error: `Se pueden agregar hasta ${field.maxItems}.` };
  }
  return { value };
}

export function toNumberList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === 'number').sort((a, b) => a - b);
}
