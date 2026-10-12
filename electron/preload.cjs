// electron/preload.cjs
// Secure IPC Bridge for Smart Life Manager Desktop Application
// contextIsolation: true, nodeIntegration: false

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0',
  openExternal: (url) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      ipcRenderer.send('desktop:open-external', url);
    }
  },
  focusWindow: () => {
    ipcRenderer.send('desktop:focus-window');
  },
  persistSession: (token) => ipcRenderer.invoke('desktop:save-session', token),
  getPersistedSession: () => ipcRenderer.invoke('desktop:get-session'),
  clearPersistedSession: () => ipcRenderer.invoke('desktop:clear-session'),
  send: (channel, data) => {
    const validChannels = ['toMain', 'desktop:open-external', 'desktop:focus-window'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    const validChannels = ['fromMain', 'desktop:google-auth-success'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => func(...args));
    }
  },
});
