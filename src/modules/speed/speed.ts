export const MIN_SPEED = 0.25;
export const MAX_SPEED = 4;
export const NORMAL_SPEED = 1;

export function clampSpeed(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return NORMAL_SPEED;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, Math.round(value * 100) / 100));
}

// Normal siempre está primero; el resto queda ordenado y sin repetidos.
export function normalizePresets(value: unknown): number[] {
  const presets = Array.isArray(value) ? value.filter((item) => typeof item === 'number') : [];
  return [...new Set([NORMAL_SPEED, ...presets.map(clampSpeed)])].sort((a, b) => a - b);
}

export function formatSpeed(speed: number): string {
  return `${Number(speed.toFixed(2))}x`;
}
