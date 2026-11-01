import { join } from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, Menu, shell, type IpcMainInvokeEvent } from 'electron';
import icon from '../../resources/icon.png?asset';
import { IPC, isModuleState, type ModuleInfo } from '../shared/modules';
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

  const version = app.getVersion();
  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  if (devServerUrl) {
    void aboutWindow.loadURL(`${devServerUrl}?version=${version}`);
  } else {
    void aboutWindow.loadFile(join(__dirname, '../renderer/index.html'), { query: { version } });
  }
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

function registerModuleHandlers(): void {
  ipcMain.handle(IPC.init, (event, infos: ModuleInfo[]) => {
    if (!isTrustedSender(event)) return {};
    moduleInfos = infos;
    Menu.setApplicationMenu(buildMenu());
    return settings.getModules();
  });

  ipcMain.handle(IPC.save, (event, id: unknown, state: unknown) => {
    if (!isTrustedSender(event) || !isModuleState(state)) return;
    if (!moduleInfos.some((info) => info.id === id)) return;
    settings.setModule(id as string, state);
  });
}

function buildMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Módulos',
      submenu: moduleInfos.map(({ id, name, defaultEnabled }) => ({
        label: name,
        type: 'checkbox' as const,
        checked: settings.getModules()[id]?.enabled ?? defaultEnabled,
        click: (item: Electron.MenuItem) => {
          mainWindow?.webContents.send(IPC.setEnabled, id, item.checked);
        },
      })),
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
