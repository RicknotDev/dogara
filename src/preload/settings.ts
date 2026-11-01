// Puente de la pantalla de Ajustes, que es una página propia de la app.
// Con sandbox, un preload no puede cargar otros archivos. Por eso este no importa código
// compartido con el otro preload: los canales se repiten y TypeScript comprueba que coincidan.
import { contextBridge, ipcRenderer } from 'electron';
import type { IPC, ModuleView, SettingsBridge } from '../shared/modules';

const GET_MODULES: typeof IPC.settingsGetModules = 'settings:get-modules';
const SET_ENABLED: typeof IPC.settingsSetEnabled = 'settings:set-enabled';
const UPDATE: typeof IPC.settingsUpdate = 'settings:update';
const CHANGED: typeof IPC.settingsChanged = 'settings:changed';

const bridge: SettingsBridge = {
  getModules: () => ipcRenderer.invoke(GET_MODULES),
  setEnabled: (id, enabled) => ipcRenderer.invoke(SET_ENABLED, id, enabled),
  updateSettings: (id, patch) => ipcRenderer.invoke(UPDATE, id, patch),
  onChanged: (callback) => {
    ipcRenderer.on(CHANGED, (_event, modules: ModuleView[]) => callback(modules));
  },
};

contextBridge.exposeInMainWorld('dogara', bridge);
