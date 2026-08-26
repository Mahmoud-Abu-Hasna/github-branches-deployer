import { app, shell, BrowserWindow } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { registerRepoHandlers } from '@main/ipc/repos'
import { registerGitHandlers } from '@main/ipc/git'

function createWindow(): void {
  const preloadPath = join(__dirname, '../preload/index.cjs')
  console.log('[main] preload path:', preloadPath, '- exists:', existsSync(preloadPath))

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.webContents.on('preload-error', (_event, preloadFilePath, error) => {
    console.error('[main] preload script threw an error:', preloadFilePath, error)
  })

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2) {
      console.log('[renderer console]', message)
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.mahmoudhasna.branchdeployer')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerRepoHandlers()
  registerGitHandlers()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
