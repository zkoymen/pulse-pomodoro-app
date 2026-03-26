const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  addSession: (session) => ipcRenderer.invoke('history:addSession', session),
  getSessions: () => ipcRenderer.invoke('history:getSessions'),
  deleteSession: (id) => ipcRenderer.invoke('history:deleteSession', id),
  toggleMiniMode: () => ipcRenderer.invoke('window:toggleMiniMode'),
  getMiniMode: () => ipcRenderer.invoke('window:getMiniMode'),
  onMiniModeChanged: (callback) => {
    ipcRenderer.on('window:mini-mode-changed', (_, value) => callback(value));
  },
});
