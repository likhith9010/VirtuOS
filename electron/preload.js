const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Window controls
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  
  // VM embedding
  embedVM: (vmName) => ipcRenderer.invoke('embed-vm', vmName),
  resizeEmbeddedVM: (width, height) => ipcRenderer.invoke('resize-embedded-vm', width, height),
  
  // Platform info
  platform: process.platform,
  
  // Check if running in Electron
  isElectron: true
});
