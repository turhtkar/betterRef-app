/* currently there is no use of the preload.js file
   that is because I figured out later that it isn't needed
   in this project, but might be needed in the future
   the use of a preload file is used for 2 main reasons
   security and performance.
   -Performance wise, with the preload file any out of render method
    such as calling a method from an installed package,
    needs to have a specific handeling via the preLoad file
    since electron disabled the use of require in render files
    together with the use of a contextBrigde via a preload file
   -Security wise, with the preload file we need to handle every
    out of file calling that way, we are required to give attention
    to every function handling enabled in our project,
    that way we're able to have a better view and control over
    our project, leaving less room for vurneblities.
    but my project is currently offline and only uses
    interact.js librarry, and so one way or another, 
    I already use most of it's functionality, but, I was also
    not sure on how could I call each function, I'm fairly new
    to javascript, but I'm sure that in the future
    if I'll implement this software to a web app, then I will
    figure it out, with some extra hours */
    
const { app, BrowserWindow, Menu, ipcMain, dialog  } = require('electron');
const fs = require('fs');
const { MenuItem } = require('electron/main');
const electronReload = require('electron-reload');
// const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false,
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

  // // Enable remote module for the window
  // enable(win.webContents);

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
    {
        label: 'Toggle Snapping',
        click: () => {
          win.webContents.send('toggle-snap-elements');
        },
      },
      {
        label: 'Undo',
        click: () => {
          win.webContents.send('undo-element');
        },
      },
      {
        label: 'Save',
        click: () => {
          win.webContents.send('save-project');
        },
      },
      {
        label: 'Load',
        click: () => {
          win.webContents.send('load-project');
        },
      },
  ];

  const contextMenu = Menu.buildFromTemplate(template);

  // Show the context menu on right-click
  win.webContents.on('context-menu', (e) => {
    e.preventDefault();
    contextMenu.popup();
  });


  ipcMain.on('save-project-data', async (event, saveDataJSON) => {
  
    // Open Save Dialog
    const result = await dialog.showSaveDialog({
        title: 'Save Project',
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });
  
    if (!result.canceled && result.filePath) {
        fs.promises.writeFile(result.filePath, saveDataJSON)
            .then(() => {
                event.sender.send('save-status', 'The file has been successfully saved');
            })
            .catch((err) => {
                event.sender.send('save-status', `An error occurred creating the file ${err.message}`);
            });
    }
  });

ipcMain.on('load-project-data', async (event) => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (result.canceled) {
      event.reply('file-dialog-canceled');
      return;
    }

    const filePath = result.filePaths[0];
    const data = await fs.promises.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(data);
    
    event.reply('project-file-data', jsonData);
  } catch (error) {
    console.error('Error:', error);
    event.reply('project-file-error', error.message);
  }
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