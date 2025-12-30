import { app, BaseWindow } from 'electron';
import { createMainWindow, getMainWindow } from './window-manager';
import { setupIpcHandlers } from './ipc-handlers';

// Set app name for macOS menu bar and dock
app.setName('PromptMux');

app.whenReady().then(() => {
  setupIpcHandlers();
  createMainWindow();

  // Set dock title on macOS
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setBadge('');
  }

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked and no windows exist
    const existingWindow = getMainWindow();
    if (existingWindow) {
      existingWindow.focus();
    } else if (BaseWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, apps typically stay active until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
