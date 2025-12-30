import { BaseWindow, WebContentsView, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
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
const SAVED_URLS_FILE = path.join(app.getPath('userData'), 'last-urls.json');

let mainWindow: BaseWindow | null = null;
let aiViews: AIView[] = [];
let inputBarView: WebContentsView | null = null;

interface SavedUrls {
  [service: string]: string;
}

function loadSavedUrls(): SavedUrls {
  try {
    if (fs.existsSync(SAVED_URLS_FILE)) {
      const data = fs.readFileSync(SAVED_URLS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[WindowManager] Failed to load saved URLs:', error);
  }
  return {};
}

function saveCurrentUrls(): void {
  try {
    const urls: SavedUrls = {};
    aiViews.forEach((aiView) => {
      urls[aiView.service] = aiView.view.webContents.getURL();
    });
    fs.writeFileSync(SAVED_URLS_FILE, JSON.stringify(urls, null, 2));
    console.log('[WindowManager] Saved URLs:', urls);
  } catch (error) {
    console.error('[WindowManager] Failed to save URLs:', error);
  }
}

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

  // Load saved URLs from previous session
  const savedUrls = loadSavedUrls();
  console.log('[WindowManager] Loaded saved URLs:', savedUrls);

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

    // Load saved URL if available, otherwise use default
    const urlToLoad = savedUrls[config.service] || config.url;
    console.log(`[WindowManager] Loading ${config.service} with URL:`, urlToLoad);
    view.webContents.loadURL(urlToLoad);

    // Save URLs when navigation completes
    view.webContents.on('did-navigate', () => {
      saveCurrentUrls();
    });

    view.webContents.on('did-navigate-in-page', () => {
      saveCurrentUrls();
    });

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

  mainWindow.on('close', () => {
    // Save URLs before closing
    saveCurrentUrls();
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
