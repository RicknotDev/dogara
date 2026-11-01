import type { ModuleInfo, ModuleState, StoredModules } from '../shared/modules';
import { createChangeObserver, type Unsubscribe } from './changeObserver';

export interface ModuleContext<S extends object> {
  readonly settings: Readonly<S>;
  // Guarda los cambios en las opciones del módulo.
  updateSettings(patch: Partial<S>): void;
  // Agrega CSS a la página; se quita solo al desactivar el módulo.
  addStyle(css: string): void;
  // Avisa cuando cambia la página; se cancela solo al desactivar el módulo.
  observe(callback: () => void): void;
  // Registra algo a deshacer al desactivar el módulo.
  onCleanup(callback: () => void): void;
  // Para pasar a addEventListener: quita el listener al desactivar el módulo.
  readonly signal: AbortSignal;
}

export interface ModuleDefinition<S extends object> extends Omit<ModuleInfo, 'settings'> {
  settings: S;
  onEnable(ctx: ModuleContext<S>): void;
  onDisable?(ctx: ModuleContext<S>): void;
}

export function defineModule<S extends object>(definition: ModuleDefinition<S>): ModuleDefinition<S> {
  return definition;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModule = ModuleDefinition<any>;

interface ActiveModule {
  ctx: ModuleContext<object>;
  cleanups: Array<() => void>;
}

function runCleanups(cleanups: Array<() => void>): void {
  // Al revés de como se registraron, para deshacer en orden.
  for (const cleanup of cleanups.toReversed()) {
    try {
      cleanup();
    } catch (error) {
      console.error('[Dōgara] Error al desactivar un módulo', error);
    }
  }
}

export function createModuleManager(
  modules: AnyModule[],
  stored: StoredModules,
  save: (id: string, state: ModuleState) => void,
) {
  const states = new Map<string, ModuleState>();
  const active = new Map<string, ActiveModule>();
  const changes = createChangeObserver(document);

  for (const { id, defaultEnabled, settings } of modules) {
    states.set(id, {
      enabled: stored[id]?.enabled ?? defaultEnabled,
      settings: { ...settings, ...stored[id]?.settings },
    });
  }

  const enable = (module: AnyModule): void => {
    const state = states.get(module.id)!;
    const abort = new AbortController();
    const cleanups: Array<() => void> = [() => abort.abort()];

    const ctx: ModuleContext<object> = {
      get settings() {
        return state.settings;
      },
      updateSettings(patch) {
        state.settings = { ...state.settings, ...patch };
        save(module.id, state);
      },
      addStyle(css) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.append(style);
        cleanups.push(() => style.remove());
      },
      observe(callback) {
        const unsubscribe: Unsubscribe = changes.subscribe(callback);
        cleanups.push(unsubscribe);
      },
      onCleanup(callback) {
        cleanups.push(callback);
      },
      signal: abort.signal,
    };

    // Un módulo que falla no debe impedir que funcionen los demás.
    try {
      module.onEnable(ctx);
      active.set(module.id, { ctx, cleanups });
    } catch (error) {
      console.error(`[Dōgara] No se pudo activar el módulo "${module.id}"`, error);
      runCleanups(cleanups);
    }
  };

  const disable = (module: AnyModule): void => {
    const current = active.get(module.id);
    if (!current) return;
    active.delete(module.id);

    try {
      module.onDisable?.(current.ctx);
    } catch (error) {
      console.error(`[Dōgara] Error al desactivar el módulo "${module.id}"`, error);
    }
    runCleanups(current.cleanups);
  };

  return {
    start(): void {
      for (const module of modules) {
        if (states.get(module.id)!.enabled) enable(module);
      }
    },
    setEnabled(id: string, enabled: boolean): void {
      const module = modules.find((candidate) => candidate.id === id);
      const state = states.get(id);
      if (!module || !state || state.enabled === enabled) return;

      state.enabled = enabled;
      save(id, state);
      if (enabled) enable(module);
      else disable(module);
    },
    // Si el módulo está activo se reinicia, para que tome las opciones nuevas sin recargar.
    updateSettings(id: string, patch: Record<string, unknown>): void {
      const module = modules.find((candidate) => candidate.id === id);
      const state = states.get(id);
      if (!module || !state) return;

      state.settings = { ...state.settings, ...patch };
      save(id, state);
      if (active.has(id)) {
        disable(module);
        enable(module);
      }
    },
  };
}
