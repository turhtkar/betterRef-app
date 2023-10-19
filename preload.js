const { contextBridge, ipcRenderer } = require('electron');



contextBridge.exposeInMainWorld('electronAPI', {
    contextMenu: () => ipcRenderer.send('context-menu'),
    saveProjectData: (data) => ipcRenderer.send('save-project-data', data),
    ipcOn: (channel, callback) => {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
    },
    getInteract: () => ipcRenderer.invoke("get-interact"),
});


// contextBridge.exposeInMainWorld('electronAPI', {
//     contextMenu: () => ipcRenderer.send('context-menu'),
//     saveProjectData: (data) => ipcRenderer.send('save-project-data', data),
//     ipcOn: (channel, callback) => {
//         ipcRenderer.on(channel, (event, ...args) => callback(...args));
//     },
//     interact: (element) => {
//         interact(element)},
// });
