const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const { enable } = require('@electron/remote/main')
const { MenuItem } = require('electron/main')
let template = [{role: 'toggleDevTools'}, {role: 'reload' }, {role: 'undo'}, {role: 'zoomIn'}, {role: 'zoomOut'}]
let contextMenu=Menu.buildFromTemplate(template)

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,  // to enable use of remote module in renderer process
      webSecurity: true, // Set webSecurity to true to enforce security policies
      contentSecurityPolicy: "default-src 'self'; script-src 'self'; style-src 'self';" // Set strict CSP
    }
  })

  // Enable remote module for the window
  enable(win.webContents)

  win.loadFile('index.html')
  let noteItem = new MenuItem({label: 'create Note', click: ()=>{win.webContents.send('create-new-note')}})
  contextMenu.append(noteItem);
  
  win.webContents.on('context-menu', ()=> {
    contextMenu.popup();
  })
}

app.whenReady().then(createWindow)
