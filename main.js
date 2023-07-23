const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { enable } = require('@electron/remote/main');
const { MenuItem } = require('electron/main');
const electronReload = require('electron-reload');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'self'; style-src 'self';",
    },
  });

  // Enable electron-reload in development
  if (process.env.NODE_ENV === 'development') {
    electronReload(__dirname, {
      electron: require.resolve('electron'),
    });
  }

  // Enable remote module for the window
  enable(win.webContents);

  win.loadFile('index.html');

  // Build the context menu
  const template = [
    { role: 'toggleDevTools' },
    { role: 'reload' },
    { role: 'undo' },
    { role: 'zoomIn' },
    { role: 'zoomOut' },
    {
      label: 'Create Note',
      click: () => {
        win.webContents.send('create-new-note');
      },
    },
  ];

  const contextMenu = Menu.buildFromTemplate(template);

  // Show the context menu on right-click
  win.webContents.on('context-menu', (e) => {
    e.preventDefault();
    contextMenu.popup();
  });
}

app.whenReady().then(createWindow);

// macOS specific: Quit the app when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
