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

  it('corrige un reinicio tardío de YouTube y no lo guarda', () => {
    start({ speed: 1.75 });
    vi.advanceTimersByTime(60_000);

    video.playbackRate = 1;
    video.dispatchEvent(new Event('ratechange'));

    expect(video.playbackRate).toBe(1.75);
    expect(save).not.toHaveBeenCalled();
  });

  describe('cambios hechos con los controles de YouTube', () => {
    const userEvent = <E extends Event>(event: E): E =>
      Object.defineProperty(event, 'isTrusted', { value: true });
    const changeRate = (rate: number) => {
      video.playbackRate = rate;
      video.dispatchEvent(new Event('ratechange'));
    };

    it('respeta el atajo de teclado', () => {
      start({ speed: 1.75 });

      document.dispatchEvent(userEvent(new KeyboardEvent('keydown', { key: '>', bubbles: true })));
      changeRate(2);

      expect(video.playbackRate).toBe(2);
      expect(button()?.textContent).toBe('2x');
      expect(save.mock.lastCall![1].settings.speed).toBe(2);
    });

    it('respeta el menú de YouTube', () => {
      document.querySelector('#movie_player')!.insertAdjacentHTML(
        'beforeend',
        '<div class="ytp-settings-menu"><div class="item"></div></div>',
      );
      start({ speed: 1.75 });

      document.querySelector('.item')!.dispatchEvent(userEvent(new MouseEvent('click', { bubbles: true })));
      changeRate(1.5);

      expect(save.mock.lastCall![1].settings.speed).toBe(1.5);
    });

    it('no cuenta clics en otras partes, como el enlace a otro video', () => {
      start({ speed: 1.75 });

      document.body.dispatchEvent(userEvent(new MouseEvent('click', { bubbles: true })));
      changeRate(1);

      expect(video.playbackRate).toBe(1.75);
      expect(save).not.toHaveBeenCalled();
    });

    it('no cuenta eventos simulados por la página', () => {
      start({ speed: 1.75 });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: '>', bubbles: true }));
      changeRate(2);

      expect(video.playbackRate).toBe(1.75);
    });

    it('deja de contar pasado un momento', () => {
      start({ speed: 1.75 });

      document.dispatchEvent(userEvent(new KeyboardEvent('keydown', { key: '>', bubbles: true })));
      vi.advanceTimersByTime(2000);
      changeRate(1);

      expect(video.playbackRate).toBe(1.75);
    });
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

  it('los presets nuevos aparecen sin perder la velocidad elegida', () => {
    const manager = start({ speed: 1.75 });

    manager.updateSettings('speed', { presets: [1.75, 2.5] });

    const labels = [...popup()!.querySelectorAll('button')].map((b) => b.textContent);
    expect(labels).toEqual(['1x', '1.75x', '2.5x']);
    expect(video.playbackRate).toBe(1.75);
    expect(document.querySelectorAll('.dg-speed-button')).toHaveLength(1);
  });

  it('al reactivar restaura la velocidad elegida', () => {
    const manager = start({ speed: 2 });

    manager.setEnabled('speed', false);
    manager.setEnabled('speed', true);

    expect(video.playbackRate).toBe(2);
    expect(document.querySelectorAll('.dg-speed-button')).toHaveLength(1);
  });
});
