import { join } from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, Menu, shell, type IpcMainInvokeEvent } from 'electron';
import icon from '../../resources/icon.png?asset';
import {
  applySettingsPatch,
  IPC,
  isModuleState,
  toModuleView,
  type ModuleInfo,
  type ModuleView,
} from '../shared/modules';
import {
  canOpenExternally,
  isAllowedInApp,
  isGoogleSignIn,
  isPassiveSignIn,
} from '../shared/navigation';
import { SIGN_IN_LINKS } from '../shared/youtubeSelectors';
import { createSettingsStore } from './settingsStore';

const YOUTUBE_URL = 'https://www.youtube.com/';

let mainWindow: BrowserWindow | null = null;
let aboutWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let moduleInfos: ModuleInfo[] = [];
let settings: ReturnType<typeof createSettingsStore>;

function handleBlockedUrl(url: string): void {
  if (isPassiveSignIn(url)) return;

  if (isGoogleSignIn(url)) {
    void dialog.showMessageBox({
      type: 'info',
      title: 'Dōgara funciona sin cuenta',
      message: 'Dōgara funciona sin cuenta',
      detail: 'Google no permite iniciar sesión dentro de esta app.',
    });
  } else if (canOpenExternally(url)) {
    void shell.openExternal(url);
  }
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 480,
    minHeight: 360,
    icon,
    show: false,
    backgroundColor: '#0f0f0f',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Se muestra recién cuando está lista, para evitar el parpadeo inicial.
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const { webContents } = mainWindow;

  webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedInApp(url)) {
      void webContents.loadURL(url);
    } else {
      handleBlockedUrl(url);
    }
    return { action: 'deny' };
  });

  const keepInsideAllowedSites = (event: { preventDefault(): void }, url: string): void => {
    if (isAllowedInApp(url)) return;
    event.preventDefault();
    handleBlockedUrl(url);
  };
  webContents.on('will-navigate', keepInsideAllowedSites);
  webContents.on('will-redirect', keepInsideAllowedSites);

  webContents.on('dom-ready', () => {
    void webContents.insertCSS(`${SIGN_IN_LINKS} { display: none !important; }`);
  });

  void mainWindow.loadURL(YOUTUBE_URL);
}

function openAboutWindow(): void {
  if (aboutWindow) {
    aboutWindow.focus();
    return;
  }

  aboutWindow = new BrowserWindow({
    width: 480,
    height: 400,
    resizable: false,
    parent: mainWindow ?? undefined,
    icon,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f0f0f',
    title: 'Acerca de Dōgara',
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  aboutWindow.once('ready-to-show', () => aboutWindow?.show());
  aboutWindow.on('closed', () => {
    aboutWindow = null;
  });

  loadPage(aboutWindow, { page: 'about', version: app.getVersion() });
}

function loadPage(window: BrowserWindow, query: Record<string, string>): void {
  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  if (devServerUrl) {
    void window.loadURL(`${devServerUrl}?${new URLSearchParams(query).toString()}`);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'), { query });
  }
}

function openSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 640,
    height: 600,
    minWidth: 420,
    minHeight: 320,
    parent: mainWindow ?? undefined,
    icon,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: join(__dirname, '../preload/settings.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWindow.once('ready-to-show', () => settingsWindow?.show());
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  // Esta ventana tiene acceso a los ajustes, así que nunca debe salir de la página propia.
  const { webContents } = settingsWindow;
  webContents.on('will-navigate', (event) => event.preventDefault());
  webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  loadPage(settingsWindow, { page: 'settings' });
}

// Los pedidos de los módulos solo se aceptan desde la ventana principal, y en un sitio permitido.
function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  const frame = event.senderFrame;
  return (
    event.sender === mainWindow?.webContents &&
    frame === event.sender.mainFrame &&
    isAllowedInApp(frame.url)
  );
}

function isSettingsSender(event: IpcMainInvokeEvent): boolean {
  return event.sender === settingsWindow?.webContents;
}

function moduleViews(): ModuleView[] {
  return moduleInfos.map((info) => toModuleView(info, settings.getModules()[info.id]));
}

function notifySettingsWindow(): void {
  settingsWindow?.webContents.send(IPC.settingsChanged, moduleViews());
}

function registerModuleHandlers(): void {
  ipcMain.handle(IPC.init, (event, infos: ModuleInfo[]) => {
    if (!isTrustedSender(event)) return {};
    moduleInfos = infos;
    notifySettingsWindow();
    return settings.getModules();
  });

  ipcMain.handle(IPC.save, (event, id: unknown, state: unknown) => {
    if (!isTrustedSender(event) || !isModuleState(state)) return;
    if (!moduleInfos.some((info) => info.id === id)) return;
    settings.setModule(id as string, state);
    notifySettingsWindow();
  });

  ipcMain.handle(IPC.settingsGetModules, (event) => (isSettingsSender(event) ? moduleViews() : []));

  // Se guarda acá y no solo en la ventana de YouTube, que podría estar recargando la página.
  ipcMain.handle(IPC.settingsSetEnabled, (event, id: unknown, enabled: unknown) => {
    const view = moduleViews().find((candidate) => candidate.id === id);
    if (!isSettingsSender(event) || !view || typeof enabled !== 'boolean') return;
    settings.setModule(view.id, { enabled, settings: view.settings });
    mainWindow?.webContents.send(IPC.setEnabled, view.id, enabled);
    notifySettingsWindow();
  });

  ipcMain.handle(IPC.settingsUpdate, (event, id: unknown, patch: unknown) => {
    const view = moduleViews().find((candidate) => candidate.id === id);
    if (!isSettingsSender(event) || !view) return;
    const state = applySettingsPatch(view, patch);
    settings.setModule(view.id, state);
    mainWindow?.webContents.send(IPC.updateSettings, view.id, state.settings);
    notifySettingsWindow();
  });
}

function buildMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Archivo',
      submenu: [
        { label: 'Ajustes', accelerator: 'CmdOrCtrl+,', click: openSettingsWindow },
        { type: 'separator' },
        { label: 'Salir', role: 'quit' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Recargar', role: 'reload' },
        { type: 'separator' },
        { label: 'Acercar', role: 'zoomIn' },
        { label: 'Alejar', role: 'zoomOut' },
        { label: 'Tamaño original', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Pantalla completa', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [{ label: 'Acerca de Dōgara', click: openAboutWindow }],
    },
  ]);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
  });

  void app.whenReady().then(() => {
    settings = createSettingsStore(join(app.getPath('userData'), 'settings.json'));
    registerModuleHandlers();
    Menu.setApplicationMenu(buildMenu());
    createMainWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
