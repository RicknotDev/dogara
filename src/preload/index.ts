// Puente entre la ventana de YouTube y la app. Los módulos corren acá, en un espacio aislado:
// comparten la página con YouTube, pero YouTube no puede ver ni usar este código.
// Nunca exponer ipcRenderer a la página con contextBridge.
import { ipcRenderer } from 'electron';
import { createModuleManager } from '../modules/core';
import { modules } from '../modules';
import { IPC, type ModuleInfo, type ModuleState, type StoredModules } from '../shared/modules';

async function start(): Promise<void> {
  const infos: ModuleInfo[] = modules.map(
    ({ id, name, description, defaultEnabled, settings, fields }) => ({
      id,
      name,
      description,
      defaultEnabled,
      settings,
      fields,
    }),
  );
  const stored = (await ipcRenderer.invoke(IPC.init, infos)) as StoredModules;

  const manager = createModuleManager(modules, stored, (id: string, state: ModuleState) => {
    void ipcRenderer.invoke(IPC.save, id, state);
  });

  ipcRenderer.on(IPC.setEnabled, (_event, id: string, enabled: boolean) => {
    manager.setEnabled(id, enabled);
  });
  ipcRenderer.on(IPC.updateSettings, (_event, id: string, patch: Record<string, unknown>) => {
    manager.updateSettings(id, patch);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => manager.start(), { once: true });
  } else {
    manager.start();
  }
}

void start();
