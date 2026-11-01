import { join } from 'node:path';
import { app, BrowserWindow, dialog, Menu, shell } from 'electron';
import icon from '../../resources/icon.png?asset';
import {
  canOpenExternally,
  isAllowedInApp,
  isGoogleSignIn,
  isPassiveSignIn,
} from '../shared/navigation';
import { SIGN_IN_LINKS } from '../shared/youtubeSelectors';

const YOUTUBE_URL = 'https://www.youtube.com/';

let mainWindow: BrowserWindow | null = null;
let aboutWindow: BrowserWindow | null = null;

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

function buildMenu(): Menu {
  return Menu.buildFromTemplate([
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
    Menu.setApplicationMenu(buildMenu());
    createMainWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
