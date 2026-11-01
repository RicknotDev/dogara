import { PLAYER, PLAYER_RIGHT_CONTROLS, PLAYER_VIDEO } from '../../shared/youtubeSelectors';
import { defineModule } from '../core';
import { clampSpeed, formatSpeed, MAX_SPEED, MIN_SPEED, NORMAL_SPEED, normalizePresets } from './speed';
import css from './styles.css?inline';

// YouTube vuelve a su velocidad al cargar cada video. Un cambio en este plazo se corrige;
// uno posterior es el usuario usando el menú o los atajos de YouTube, y se respeta.
const LOAD_GRACE_MS = 1500;
const LOAD_EVENTS = ['loadstart', 'loadedmetadata'];

export default defineModule({
  id: 'speed',
  name: 'Velocidades personalizadas',
  defaultEnabled: true,
  settings: { speed: NORMAL_SPEED, presets: [1.15, 1.35, 1.75] },

  onEnable(ctx) {
    ctx.addStyle(css);

    let speed = clampSpeed(ctx.settings.speed);
    let video: HTMLVideoElement | null = null;
    let videoListeners: AbortController | null = null;
    let lastLoadAt = 0;

    const button = document.createElement('button');
    button.className = 'dg-speed-button';
    button.type = 'button';

    const popup = document.createElement('div');
    popup.className = 'dg-speed-popup';
    popup.hidden = true;

    const presets = document.createElement('div');
    presets.className = 'dg-speed-presets';

    const presetButtons = normalizePresets(ctx.settings.presets).map((preset) => {
      const presetButton = document.createElement('button');
      presetButton.type = 'button';
      presetButton.textContent = formatSpeed(preset);
      presetButton.addEventListener('click', () => choose(preset), { signal: ctx.signal });
      presets.append(presetButton);
      return { preset, element: presetButton };
    });

    const slider = document.createElement('input');
    slider.className = 'dg-speed-slider';
    slider.type = 'range';
    slider.min = String(MIN_SPEED);
    slider.max = String(MAX_SPEED);
    slider.step = '0.05';
    slider.setAttribute('aria-label', 'Velocidad de reproducción');
    popup.append(presets, slider);

    const render = (): void => {
      button.textContent = formatSpeed(speed);
      button.setAttribute('aria-label', `Velocidad de reproducción: ${formatSpeed(speed)}`);
      slider.value = String(speed);
      for (const { preset, element } of presetButtons) {
        element.setAttribute('aria-pressed', String(preset === speed));
      }
    };

    const apply = (): void => {
      if (video && video.playbackRate !== speed) video.playbackRate = speed;
      render();
    };

    const choose = (value: number): void => {
      speed = clampSpeed(value);
      apply();
      ctx.updateSettings({ speed });
    };

    const setPopupOpen = (open: boolean): void => {
      popup.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      if (open) slider.focus();
    };

    const attachVideo = (next: HTMLVideoElement | null): void => {
      if (next === video) return;
      videoListeners?.abort();
      video = next;
      lastLoadAt = Date.now();
      if (!video) return;

      videoListeners = new AbortController();
      const { signal } = videoListeners;
      for (const type of LOAD_EVENTS) {
        video.addEventListener(
          type,
          () => {
            lastLoadAt = Date.now();
            apply();
          },
          { signal },
        );
      }
      video.addEventListener(
        'ratechange',
        () => {
          if (!video || video.playbackRate === speed) return;
          if (Date.now() - lastLoadAt < LOAD_GRACE_MS) apply();
          else choose(video.playbackRate);
        },
        { signal },
      );
      apply();
    };

    // YouTube redibuja el reproductor, así que los elementos propios se vuelven a poner si faltan.
    const sync = (): void => {
      attachVideo(document.querySelector<HTMLVideoElement>(PLAYER_VIDEO));

      const controls = document.querySelector(PLAYER_RIGHT_CONTROLS);
      if (controls && button.parentElement !== controls) controls.prepend(button);

      const player = document.querySelector(PLAYER);
      if (player && popup.parentElement !== player) player.append(popup);
    };

    button.addEventListener('click', () => setPopupOpen(popup.hidden === true), {
      signal: ctx.signal,
    });
    slider.addEventListener('input', () => {
      speed = clampSpeed(Number(slider.value));
      apply();
    }, { signal: ctx.signal });
    slider.addEventListener('change', () => ctx.updateSettings({ speed }), { signal: ctx.signal });

    // Que YouTube no interprete estos clics y teclas como órdenes para su reproductor.
    for (const element of [button, popup]) {
      for (const type of ['click', 'dblclick', 'keydown', 'keyup']) {
        element.addEventListener(type, (event) => event.stopPropagation(), { signal: ctx.signal });
      }
    }
    popup.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      setPopupOpen(false);
      button.focus();
    }, { signal: ctx.signal });
    document.addEventListener('click', () => setPopupOpen(false), { signal: ctx.signal });

    ctx.onCleanup(() => {
      videoListeners?.abort();
      button.remove();
      popup.remove();
      if (video) video.playbackRate = NORMAL_SPEED;
    });

    render();
    ctx.observe(sync);
    sync();
  },
});
