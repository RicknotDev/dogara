// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { createModuleManager } from '../src/modules/core';
import type { ModuleState } from '../src/shared/modules';
import speedModule from '../src/modules/speed';
import { clampSpeed, formatSpeed, normalizePresets } from '../src/modules/speed/speed';

describe('clampSpeed', () => {
  it('limita la velocidad al rango permitido', () => {
    expect(clampSpeed(0.1)).toBe(0.25);
    expect(clampSpeed(9)).toBe(4);
    expect(clampSpeed(1.35)).toBe(1.35);
  });

  it('usa la velocidad normal si el valor no es válido', () => {
    expect(clampSpeed('rápido')).toBe(1);
    expect(clampSpeed(Number.NaN)).toBe(1);
    expect(clampSpeed(undefined)).toBe(1);
  });
});

describe('normalizePresets', () => {
  it('incluye la normal, ordena y quita repetidos', () => {
    expect(normalizePresets([1.75, 1.15, 1.75])).toEqual([1, 1.15, 1.75]);
  });

  it('descarta valores inválidos', () => {
    expect(normalizePresets('nada')).toEqual([1]);
    expect(normalizePresets([2, 'x', null])).toEqual([1, 2]);
  });
});

it('formatSpeed muestra la velocidad sin ceros de más', () => {
  expect(formatSpeed(1)).toBe('1x');
  expect(formatSpeed(1.5)).toBe('1.5x');
  expect(formatSpeed(1.35)).toBe('1.35x');
});

describe('módulo de velocidades', () => {
  let video: HTMLVideoElement;
  let save: Mock<(id: string, state: ModuleState) => void>;

  const start = (stored = {}) => {
    const manager = createModuleManager(
      [speedModule],
      { speed: { enabled: true, settings: stored } },
      save,
    );
    manager.start();
    return manager;
  };
  const button = () => document.querySelector<HTMLButtonElement>('.dg-speed-button');
  const popup = () => document.querySelector<HTMLElement>('.dg-speed-popup');

  beforeEach(() => {
    vi.useFakeTimers();
    document.head.innerHTML = '';
    document.body.innerHTML =
      '<div id="movie_player"><video></video><div class="ytp-right-controls"></div></div>';
    video = document.querySelector('video')!;
    save = vi.fn();
  });

  afterEach(() => vi.useRealTimers());

  it('aplica la velocidad guardada y agrega sus controles', () => {
    start({ speed: 1.35 });

    expect(video.playbackRate).toBe(1.35);
    expect(button()?.parentElement?.className).toBe('ytp-right-controls');
    expect(button()?.textContent).toBe('1.35x');
    expect(popup()?.parentElement?.id).toBe('movie_player');
  });

  it('corrige a YouTube cuando reinicia la velocidad al cargar un video', () => {
    start({ speed: 1.75 });

    video.dispatchEvent(new Event('loadstart'));
    video.playbackRate = 1;
    video.dispatchEvent(new Event('ratechange'));

    expect(video.playbackRate).toBe(1.75);
    expect(save).not.toHaveBeenCalled();
  });

  it('respeta un cambio hecho después con los controles de YouTube', () => {
    start({ speed: 1.75 });
    vi.advanceTimersByTime(2000);

    video.playbackRate = 2;
    video.dispatchEvent(new Event('ratechange'));

    expect(video.playbackRate).toBe(2);
    expect(button()?.textContent).toBe('2x');
    expect(save.mock.lastCall![1].settings.speed).toBe(2);
  });

  it('un preset cambia la velocidad y la guarda', () => {
    start();

    const preset = [...popup()!.querySelectorAll('button')].find((b) => b.textContent === '1.15x')!;
    preset.click();

    expect(video.playbackRate).toBe(1.15);
    expect(preset.getAttribute('aria-pressed')).toBe('true');
    expect(save.mock.lastCall![1].settings.speed).toBe(1.15);
  });

  it('el botón abre y cierra el panel sin avisarle a YouTube', () => {
    start();
    const playerClick = vi.fn();
    document.querySelector('#movie_player')!.addEventListener('click', playerClick);

    button()!.click();
    expect(popup()!.hidden).toBe(false);
    button()!.click();
    expect(popup()!.hidden).toBe(true);
    expect(playerClick).not.toHaveBeenCalled();
  });

  it('el video que aparece después también recibe la velocidad', async () => {
    document.body.innerHTML = '';
    start({ speed: 1.5 });
    expect(button()).toBeNull();

    document.body.innerHTML =
      '<div id="movie_player"><video></video><div class="ytp-right-controls"></div></div>';
    vi.useRealTimers();
    await vi.waitFor(() => expect(button()).not.toBeNull(), { timeout: 1000 });

    expect(document.querySelector('video')!.playbackRate).toBe(1.5);
  });

  it('al desactivar vuelve a la velocidad normal y no deja rastros', () => {
    const manager = start({ speed: 2 });

    manager.setEnabled('speed', false);

    expect(video.playbackRate).toBe(1);
    expect(button()).toBeNull();
    expect(popup()).toBeNull();
    expect(document.head.querySelectorAll('style')).toHaveLength(0);

    video.playbackRate = 3;
    video.dispatchEvent(new Event('ratechange'));
    expect(video.playbackRate).toBe(3);
  });

  it('al reactivar restaura la velocidad elegida', () => {
    const manager = start({ speed: 2 });

    manager.setEnabled('speed', false);
    manager.setEnabled('speed', true);

    expect(video.playbackRate).toBe(2);
    expect(document.querySelectorAll('.dg-speed-button')).toHaveLength(1);
  });
});
