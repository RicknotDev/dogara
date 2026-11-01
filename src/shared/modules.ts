// Lo que la app guarda de cada módulo.
export interface ModuleState {
  enabled: boolean;
  settings: Record<string, unknown>;
}

export type StoredModules = Record<string, ModuleState>;

// Una opción que la pantalla de Ajustes sabe mostrar. Los módulos solo la describen.
export interface NumberListField {
  type: 'numberList';
  key: string;
  label: string;
  help?: string;
  min: number;
  max: number;
  suffix?: string;
  maxItems?: number;
  // Valores que siempre están y no se pueden quitar.
  fixedValues?: number[];
}

export type SettingField = NumberListField;

// Lo que el proceso principal y la pantalla de Ajustes necesitan saber de un módulo.
export interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  settings: Record<string, unknown>;
  fields?: SettingField[];
}

// Un módulo con su estado actual, listo para mostrar.
export interface ModuleView extends ModuleInfo {
  enabled: boolean;
}

export const IPC = {
  init: 'modules:init',
  save: 'modules:save',
  setEnabled: 'modules:set-enabled',
  updateSettings: 'modules:update-settings',
  settingsGetModules: 'settings:get-modules',
  settingsSetEnabled: 'settings:set-enabled',
  settingsUpdate: 'settings:update',
  settingsChanged: 'settings:changed',
} as const;

// Lo que la pantalla de Ajustes puede pedirle a la app.
export interface SettingsBridge {
  getModules(): Promise<ModuleView[]>;
  setEnabled(id: string, enabled: boolean): Promise<void>;
  updateSettings(id: string, patch: Record<string, unknown>): Promise<void>;
  onChanged(callback: (modules: ModuleView[]) => void): void;
}

export function isModuleState(value: unknown): value is ModuleState {
  if (typeof value !== 'object' || value === null) return false;
  const { enabled, settings } = value as Partial<ModuleState>;
  return typeof enabled === 'boolean' && typeof settings === 'object' && settings !== null;
}

export function toModuleView(info: ModuleInfo, stored?: ModuleState): ModuleView {
  return {
    ...info,
    enabled: stored?.enabled ?? info.defaultEnabled,
    settings: { ...info.settings, ...stored?.settings },
  };
}

// Solo se aceptan opciones que el módulo declara.
export function applySettingsPatch(view: ModuleView, patch: unknown): ModuleState {
  const known = Object.entries(typeof patch === 'object' && patch !== null ? patch : {}).filter(
    ([key]) => key in view.settings,
  );
  return { enabled: view.enabled, settings: { ...view.settings, ...Object.fromEntries(known) } };
}
