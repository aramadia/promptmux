# PromptMux

A desktop application that loads ChatGPT, Gemini, and Claude side-by-side, allowing you to send the same prompt to all three AI assistants simultaneously.

## Quick Start

```bash
npm install
npm start
```

## Features

- **Side-by-side AI comparison**: View responses from ChatGPT, Gemini, and Claude at the same time
- **Single input, multiple outputs**: Type once, send to all three AIs
- **Persistent sessions**: Log in once per service; sessions are saved between app restarts
- **Developer tools**: Right-click any panel for Inspect Element or Open DevTools

---

## Security & Privacy

**What this app does:**

- Loads AI websites (ChatGPT, Gemini, Claude) in embedded browser views
- Injects your prompt text into each AI's input field and clicks send
- Opens external links in your default browser (not inside the app)

**What this app does NOT do:**

- No telemetry, analytics, or tracking
- No data sent anywhere except the AI services you're looking at
- No background processes after you close the app
- No access to your filesystem (only Electron's session storage for login cookies)

**Audit the code yourself:**

- ~750 lines of TypeScript total
- All source code in `src/` - nothing hidden or obfuscated
- Build from source: `git clone && npm install && npm start`

**Electron security settings:**

- `contextIsolation: true` - AI websites cannot access Node.js APIs
- `nodeIntegration: false` - AI websites cannot run arbitrary code
- `sandbox: false` - Required for prompt injection, but websites still can't access Node.js

---

## Architecture

PromptMux is built with [Electron](https://www.electronjs.org/), which combines Chromium (for rendering web content) and Node.js (for backend functionality) into a single desktop application.

### Process Model

Electron apps have three types of processes:

```
┌─────────────────────────────────────────────────────────────────────┐
│                           MAIN PROCESS                               │
│                          (Node.js runtime)                           │
│                                                                      │
│   • Creates and manages windows                                      │
│   • Handles system events (quit, activate)                          │
│   • Coordinates IPC between views                                   │
│   • Has full access to Node.js APIs and filesystem                  │
└─────────────────────────────────────────────────────────────────────┘
        │                    │                    │
        │ IPC                │ IPC                │ IPC
        ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  PRELOAD    │      │  PRELOAD    │      │  PRELOAD    │
│  (Bridge)   │      │  (Bridge)   │      │  (Bridge)   │
│             │      │             │      │             │
│ Exposes     │      │ Exposes     │      │ Exposes     │
│ window.api  │      │ promptMux   │      │ promptMux   │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │ contextBridge      │ contextBridge      │ contextBridge
       ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  RENDERER   │      │  RENDERER   │      │  RENDERER   │
│  (Browser)  │      │  (Browser)  │      │  (Browser)  │
│             │      │             │      │             │
│ Input Bar   │      │ ChatGPT     │      │ Gemini/     │
│ UI          │      │ webpage     │      │ Claude      │
└─────────────┘      └─────────────┘      └─────────────┘
```

### What is IPC?

**IPC (Inter-Process Communication)** is how the different processes talk to each other. Since Electron runs the main process and renderers in separate contexts (for security), they can't directly call each other's functions.

Instead, they send messages:

```typescript
// Renderer sends a message to Main
ipcRenderer.invoke("send-prompt", "Hello AI");

// Main process receives and handles it
ipcMain.handle("send-prompt", async (event, prompt) => {
  // Do something with the prompt
  return { success: true };
});
```

In PromptMux:

1. **Input bar renderer** calls `window.api.sendPrompt(text)`
2. **Preload script** forwards this via `ipcRenderer.invoke('send-prompt', text)`
3. **Main process** receives it and calls `executeJavaScript()` on each AI view
4. **AI preload scripts** inject the text into the webpage's input field

### Directory Structure

```
promptmux/
├── src/
│   ├── main/                    # Main process (Node.js)
│   │   ├── index.ts             # App entry point, lifecycle events
│   │   ├── window-manager.ts    # Creates BaseWindow and WebContentsViews
│   │   ├── session-manager.ts   # Manages persistent sessions per AI service
│   │   └── ipc-handlers.ts      # Handles IPC messages from renderers
│   │
│   ├── preload/                 # Preload scripts (bridge between main & renderer)
│   │   ├── main-preload.ts      # Exposes window.api for input bar
│   │   ├── chatgpt-preload.ts   # Exposes window.promptMux for ChatGPT
│   │   ├── gemini-preload.ts    # Exposes window.promptMux for Gemini
│   │   ├── claude-preload.ts    # Exposes window.promptMux for Claude
│   │   └── dom-utils.ts         # Shared DOM manipulation utilities
│   │
│   ├── renderer/                # Input bar UI (browser context)
│   │   ├── index.html           # HTML structure
│   │   ├── index.ts             # Event handlers, IPC calls
│   │   └── styles.css           # Styling
│   │
│   └── shared/                  # Shared types and constants
│       ├── types.ts             # TypeScript interfaces
│       └── selectors.ts         # DOM selectors for each AI service
│
├── dist/                        # Compiled JavaScript (generated)
├── package.json
└── tsconfig.json
```

### Key Components

#### BaseWindow + WebContentsView

Unlike traditional Electron apps that use `BrowserWindow`, PromptMux uses `BaseWindow` with multiple `WebContentsView` children. This allows embedding multiple independent web pages in a single window:

```
┌─────────────────────────────────────────────────────────┐
│                      BaseWindow                          │
│  ┌─────────────┬─────────────┬─────────────┐           │
│  │ WebContents │ WebContents │ WebContents │           │
│  │    View     │    View     │    View     │           │
│  │  (ChatGPT)  │  (Gemini)   │  (Claude)   │           │
│  │             │             │             │           │
│  └─────────────┴─────────────┴─────────────┘           │
│  ┌─────────────────────────────────────────────────────┐│
│  │         WebContentsView (Input Bar)                 ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

#### Session Partitions

Each AI service has its own persistent session partition:

- `persist:chatgpt`
- `persist:gemini`
- `persist:claude`

This means:

- Cookies and login state are isolated per service
- Sessions persist between app restarts (stored in `~/Library/Application Support/promptmux/`)
- Services can't see each other's authentication data

#### DOM Injection

The preload scripts inject prompts into each AI's input field by:

1. Finding the input element using CSS selectors
2. Setting the text content (handling ProseMirror editors that wrap text in `<p>` tags)
3. Dispatching input events to notify the framework
4. Clicking the submit button

---

## Design Decisions

### Technical Decisions

| Decision                   | Choice                                         | Rationale                                                                                                                           |
| -------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**              | Electron                                       | Need to embed external websites (ChatGPT, Gemini, Claude) which isn't possible in a regular web app due to CORS/iframe restrictions |
| **Window type**            | BaseWindow + WebContentsView                   | Allows multiple independent web views in one window, vs BrowserWindow which is limited to one page                                  |
| **Session storage**        | Persistent partitions                          | Users shouldn't have to log in every time they open the app                                                                         |
| **Module system**          | CommonJS                                       | Electron's main process and preload scripts run in Node.js which uses CommonJS. Added `var exports = {}` shim for the renderer      |
| **TypeScript**             | Yes                                            | Type safety helps catch errors, especially with Electron's complex API                                                              |
| **Bundler**                | None (tsc only)                                | Kept it simple since the renderer code is minimal. A bundler (webpack/esbuild) would be needed for larger renderer codebases        |
| **DOM injection approach** | CSS selectors + events                         | More reliable than simulating keystrokes; handles React/ProseMirror controlled inputs                                               |
| **Preload per service**    | Separate files                                 | Each AI has different DOM structure, so separate preloads allow customized selectors                                                |
| **Security settings**      | contextIsolation: true, nodeIntegration: false | Follows Electron security best practices; external websites shouldn't have Node.js access                                           |
| **sandbox: false**         | Disabled for AI views                          | Required for preload scripts to work with `executeJavaScript()`                                                                     |

### Product Decisions

| Decision                 | Choice                            | Rationale                                                                                                |
| ------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Layout**               | Fixed equal thirds                | Simplicity over flexibility; resizable panels add complexity without much benefit                        |
| **Input method**         | Single textarea + button          | Clean, obvious UX; no need for keyboard shortcuts to send                                                |
| **Which AIs**            | ChatGPT, Gemini, Claude           | The three most popular/capable consumer AI assistants                                                    |
| **Authentication**       | User logs in via embedded webview | Avoids dealing with OAuth/API keys; uses the same login flow as the real websites                        |
| **No API integration**   | Webview only                      | Using APIs would require users to set up API keys and pay for usage; webviews use existing subscriptions |
| **DevTools access**      | Right-click context menu          | Essential for debugging selector issues when AI sites update their DOM                                   |
| **No response scraping** | Injection only                    | Scraping responses would be complex and fragile; users can read them directly                            |

### Trade-offs & Limitations

1. **Fragile selectors**: AI services frequently update their UI, which may break the DOM injection. The selector system is designed with fallbacks, but will need maintenance.

2. **No offline support**: Requires internet connection and active sessions with each AI service.

3. **Resource usage**: Running three webviews is memory-intensive (~500MB+ RAM).

4. **Rate limiting**: AI services may rate-limit or block automated interactions if overused.

5. **Terms of Service**: Automated interaction with these services may violate their ToS. Use responsibly.

---

## Development

```bash
# Install dependencies
npm install

# Build and run
npm start

# Build only
npm run build

# Watch mode (rebuilds on file changes)
npm run watch
```

### Debugging

1. **Main process logs**: Appear in the terminal where you ran `npm start`
2. **Renderer logs**: Right-click → Open DevTools → Console tab
3. **AI view logs**: Same as above, right-click on the panel you want to debug

### Updating Selectors

When an AI service updates their UI:

1. Open DevTools for that panel (right-click → Inspect Element)
2. Find the new input field selector (look for `contenteditable="true"` or `textarea`)
3. Update `src/shared/selectors.ts`
4. Rebuild with `npm run build`

---

## Releases

This project uses automated releases based on [Conventional Commits](https://www.conventionalcommits.org/). When commits are pushed to the main branch:

- **Semantic versioning** is applied automatically based on commit types
- **GitHub releases** are created with distribution builds for Windows, macOS, and Linux
- **Changelog** is generated automatically

### Download

Pre-built distributions are available on the [Releases page](https://github.com/aramadia/promptmux/releases).

### For Contributors

See [RELEASE.md](./RELEASE.md) for detailed information about:

- Conventional commit format
- How versioning works
- Release workflow details
- Building distributions locally

---

## License

MIT
