import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc-handlers'
import { destroyAll } from './terminal-manager'
import { setMainWindow } from './window-ref'

const MIN_WIDTH = 900
const MIN_HEIGHT = 600

function createWindow(): void {
  const isMac = process.platform === 'darwin'

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    titleBarStyle: 'hidden',
    ...(isMac && { trafficLightPosition: { x: 12, y: 12 } }),
    backgroundColor: '#111125',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  setMainWindow(win)
  win.on('closed', () => setMainWindow(null))

  // Open external links in browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Dev server or production build
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Isolate the dev userData dir from the installed app. Without this, a dev
// build (`electron .`) and the production Canopy resolve to the same Chromium
// userData and deadlock fighting over the shared LevelDB, freezing both.
// Must run before the app is ready / any path is read.
if (!app.isPackaged) {
  app.setPath('userData', `${app.getPath('userData')}-dev`)
}

// Enforce a single instance per userData dir. A second launch focuses the
// existing window instead of attaching to the same userData and deadlocking.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  // Register IPC handlers before window creation
  app.whenReady().then(() => {
    registerIpcHandlers()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  destroyAll()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  destroyAll()
})
