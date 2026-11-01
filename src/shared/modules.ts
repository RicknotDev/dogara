// Lo que la app guarda de cada módulo.
export interface ModuleState {
  enabled: boolean;
  settings: Record<string, unknown>;
}

export type StoredModules = Record<string, ModuleState>;

// Lo que el proceso principal necesita saber de un módulo para mostrarlo en el menú.
export interface ModuleInfo {
  id: string;
  name: string;
  defaultEnabled: boolean;
}

export const IPC = {
  init: 'modules:init',
  save: 'modules:save',
  setEnabled: 'modules:set-enabled',
} as const;

export function isModuleState(value: unknown): value is ModuleState {
  if (typeof value !== 'object' || value === null) return false;
  const { enabled, settings } = value as Partial<ModuleState>;
  return typeof enabled === 'boolean' && typeof settings === 'object' && settings !== null;
}
