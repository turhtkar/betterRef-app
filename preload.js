const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
    contextMenu: () => ipcRenderer.send('context-menu')
})
