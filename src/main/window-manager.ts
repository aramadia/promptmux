import { BaseWindow, WebContentsView } from 'electron';
import * as path from 'path';
import { getPartition, ServiceName } from './session-manager';

interface AIView {
  service: ServiceName;
  view: WebContentsView;
  url: string;
}

const AI_SERVICES: { service: ServiceName; url: string }[] = [
  { service: 'chatgpt', url: 'https://chatgpt.com' },
  { service: 'gemini', url: 'https://gemini.google.com/app' },
  { service: 'claude', url: 'https://claude.ai/new' },
];

const INPUT_BAR_HEIGHT = 120;

let mainWindow: BaseWindow | null = null;
let aiViews: AIView[] = [];
let inputBarView: WebContentsView | null = null;

export function createMainWindow(): BaseWindow {
  mainWindow = new BaseWindow({
    width: 1800,
    height: 1000,
    minWidth: 1200,
    minHeight: 600,
    title: 'PromptMux',
  });

  const bounds = mainWindow.getContentBounds();
  const viewWidth = Math.floor(bounds.width / 3);
  const viewHeight = bounds.height - INPUT_BAR_HEIGHT;

  // Create AI service views
  AI_SERVICES.forEach((config, index) => {
    const partition = getPartition(config.service);

    const view = new WebContentsView({
      webPreferences: {
        partition,
        preload: path.join(__dirname, `../preload/${config.service}-preload.js`),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false, // Need to disable for preload to work with executeJavaScript
      },
    });

    mainWindow!.contentView.addChildView(view);
    view.setBounds({
      x: index * viewWidth,
      y: 0,
      width: viewWidth,
      height: viewHeight,
    });

    view.webContents.loadURL(config.url);

    // Enable right-click context menu with Inspect Element
    view.webContents.on('context-menu', (_, params) => {
      const { Menu } = require('electron');
      Menu.buildFromTemplate([
        { label: 'Inspect Element', click: () => view.webContents.inspectElement(params.x, params.y) },
        { type: 'separator' },
        { label: 'Open DevTools', click: () => view.webContents.openDevTools({ mode: 'detach' }) },
      ]).popup();
    });

    aiViews.push({ service: config.service, view, url: config.url });
  });

  // Create input bar view
  inputBarView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, '../preload/main-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.contentView.addChildView(inputBarView);
  inputBarView.setBounds({
    x: 0,
    y: viewHeight,
    width: bounds.width,
    height: INPUT_BAR_HEIGHT,
  });

  inputBarView.webContents.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Enable right-click context menu for input bar
  inputBarView.webContents.on('context-menu', (_, params) => {
    const { Menu } = require('electron');
    Menu.buildFromTemplate([
      { label: 'Inspect Element', click: () => inputBarView!.webContents.inspectElement(params.x, params.y) },
      { type: 'separator' },
      { label: 'Open DevTools', click: () => inputBarView!.webContents.openDevTools({ mode: 'detach' }) },
    ]).popup();
  });

  // Handle window resize
  mainWindow.on('resize', () => {
    if (!mainWindow) return;

    const newBounds = mainWindow.getContentBounds();
    const newViewWidth = Math.floor(newBounds.width / 3);
    const newViewHeight = newBounds.height - INPUT_BAR_HEIGHT;

    aiViews.forEach((aiView, index) => {
      aiView.view.setBounds({
        x: index * newViewWidth,
        y: 0,
        width: newViewWidth,
        height: newViewHeight,
      });
    });

    inputBarView?.setBounds({
      x: 0,
      y: newViewHeight,
      width: newBounds.width,
      height: INPUT_BAR_HEIGHT,
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    aiViews = [];
    inputBarView = null;
  });

  return mainWindow;
}

export function getAIViews(): AIView[] {
  return aiViews;
}

export function getInputBarView(): WebContentsView | null {
  return inputBarView;
}

export function getMainWindow(): BaseWindow | null {
  return mainWindow;
}
