const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  addSession: (session) => ipcRenderer.invoke('history:addSession', session),
  getSessions: () => ipcRenderer.invoke('history:getSessions'),
  deleteSession: (id) => ipcRenderer.invoke('history:deleteSession', id),
});
