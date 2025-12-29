import { app, globalShortcut } from 'electron';
import { createMainWindow, getAIViews, getInputBarView } from './window-manager';
import { setupIpcHandlers } from './ipc-handlers';

app.whenReady().then(() => {
  setupIpcHandlers();
  createMainWindow();

  // Register Cmd+Option+I to open DevTools for all AI views
  globalShortcut.register('CommandOrControl+Option+I', () => {
    const views = getAIViews();
    views.forEach((v) => {
      v.view.webContents.openDevTools({ mode: 'detach' });
    });
  });

  // Register Cmd+Option+D to open DevTools for input bar
  globalShortcut.register('CommandOrControl+Option+D', () => {
    const inputBar = getInputBarView();
    if (inputBar) {
      inputBar.webContents.openDevTools({ mode: 'detach' });
    }
  });

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked and no windows exist
    if (require('electron').BrowserWindow.getAllWindows().length === 0) {
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
