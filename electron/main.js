const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const { fork } = require('child_process')
const path = require('path')
const http = require('http')
const fs = require('fs')

// ─── Configuration ──────────────────────────────────────────
const BACKEND_PORT = 4000
const HEALTH_URL = `http://127.0.0.1:${BACKEND_PORT}/api/v1/health`
const HEALTH_POLL_INTERVAL = 500   // ms
const HEALTH_TIMEOUT = 30000       // ms before giving up
const MAX_RESTART_ATTEMPTS = 3
const SHUTDOWN_GRACE_MS = 5000

// ─── State ──────────────────────────────────────────────────
let mainWindow = null
let splashWindow = null
let backendProcess = null
let syncWorkerProcess = null
let backendRestartCount = 0
let isQuitting = false

// ─── Paths ──────────────────────────────────────────────────
const isPackaged = app.isPackaged
const rootDir = isPackaged
    ? process.resourcesPath
    : path.join(__dirname, '..')

const backendDir = path.join(rootDir, 'backend')
const backendEntry = path.join(backendDir, 'server.js')
const syncWorkerEntry = path.join(backendDir, 'src', 'workers', 'sync.worker.js')
const frontendDist = path.join(rootDir, 'frontend', 'dist')
const splashPath = path.join(__dirname, 'splash.html')
const envPath = path.join(backendDir, '.env')

// ─── Logging ────────────────────────────────────────────────
const logDir = path.join(app.getPath('userData'), 'logs')

function ensureLogDir() {
    try { fs.mkdirSync(logDir, { recursive: true }) } catch (_) { /* ignore */ }
}

function getLogStream(name) {
    ensureLogDir()
    const logFile = path.join(logDir, `${name}.log`)
    return fs.createWriteStream(logFile, { flags: 'a' })
}

function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`
    console.log(line)
    try {
        fs.appendFileSync(path.join(logDir, 'electron.log'), line + '\n')
    } catch (_) { /* ignore */ }
}

// ─── Single Instance Lock ───────────────────────────────────
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
    app.quit()
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
        }
    })
}

// ─── Backend Process Management ─────────────────────────────
function buildBackendEnv() {
    return {
        ...process.env,
        PORT: String(BACKEND_PORT),
        NODE_ENV: isPackaged ? 'production' : 'development',
        ELECTRON_MODE: 'true',
        FRONTEND_DIST_PATH: frontendDist
    }
}

function startBackend() {
    if (backendProcess) return

    log(`Starting backend from: ${backendEntry}`)

    backendProcess = fork(backendEntry, [], {
        cwd: backendDir,
        env: buildBackendEnv(),
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        silent: true
    })

    // Pipe stdout/stderr to log files
    const outStream = getLogStream('backend-stdout')
    const errStream = getLogStream('backend-stderr')
    if (backendProcess.stdout) backendProcess.stdout.pipe(outStream)
    if (backendProcess.stderr) backendProcess.stderr.pipe(errStream)

    backendProcess.on('message', (msg) => {
        log(`Backend IPC: ${JSON.stringify(msg)}`)
        if (msg?.type === 'backend-ready') {
            log(`Backend ready on port ${msg.port}`)
        }
    })

    backendProcess.on('exit', (code, signal) => {
        log(`Backend exited: code=${code} signal=${signal}`)
        backendProcess = null

        if (!isQuitting && backendRestartCount < MAX_RESTART_ATTEMPTS) {
            backendRestartCount++
            log(`Restarting backend (attempt ${backendRestartCount}/${MAX_RESTART_ATTEMPTS})...`)
            setTimeout(() => startBackend(), 1000)
        } else if (!isQuitting) {
            log('Backend exceeded max restart attempts')
            showErrorAndQuit('The POS backend failed to start after multiple attempts.\nPlease check the logs and try again.')
        }
    })

    backendProcess.on('error', (err) => {
        log(`Backend error: ${err.message}`)
    })
}

// ─── Sync Worker Management ─────────────────────────────────
function startSyncWorker() {
    if (syncWorkerProcess) return

    log(`Starting sync worker from: ${syncWorkerEntry}`)

    syncWorkerProcess = fork(syncWorkerEntry, [], {
        cwd: backendDir,
        env: buildBackendEnv(),
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        silent: true
    })

    const outStream = getLogStream('sync-worker-stdout')
    const errStream = getLogStream('sync-worker-stderr')
    if (syncWorkerProcess.stdout) syncWorkerProcess.stdout.pipe(outStream)
    if (syncWorkerProcess.stderr) syncWorkerProcess.stderr.pipe(errStream)

    syncWorkerProcess.on('exit', (code, signal) => {
        log(`Sync worker exited: code=${code} signal=${signal}`)
        syncWorkerProcess = null

        if (!isQuitting) {
            log('Restarting sync worker in 5s...')
            setTimeout(() => startSyncWorker(), 5000)
        }
    })

    syncWorkerProcess.on('error', (err) => {
        log(`Sync worker error: ${err.message}`)
    })
}

// ─── Health Polling ─────────────────────────────────────────
function waitForBackend() {
    return new Promise((resolve, reject) => {
        const startTime = Date.now()

        const poll = () => {
            if (Date.now() - startTime > HEALTH_TIMEOUT) {
                return reject(new Error('Backend health check timed out'))
            }

            const req = http.get(HEALTH_URL, { timeout: 2000 }, (res) => {
                if (res.statusCode === 200) {
                    resolve()
                } else {
                    setTimeout(poll, HEALTH_POLL_INTERVAL)
                }
            })

            req.on('error', () => {
                setTimeout(poll, HEALTH_POLL_INTERVAL)
            })

            req.on('timeout', () => {
                req.destroy()
                setTimeout(poll, HEALTH_POLL_INTERVAL)
            })
        }

        poll()
    })
}

// ─── Window Management ──────────────────────────────────────
function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 420,
        height: 320,
        frame: false,
        transparent: false,
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    })

    splashWindow.loadFile(splashPath)
    splashWindow.center()
}

function createMainWindow() {
    const loadURL = `http://127.0.0.1:${BACKEND_PORT}`

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 600,
        show: true,
        title: 'Jattkart POS',
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true
        }
    })

    // Allow window.open() popups (used for print preview)
    mainWindow.webContents.setWindowOpenHandler(({ url, features }) => {
        log(`window.open requested: url="${url}" features="${features}"`)

        if (url && url !== 'about:blank' && !url.startsWith(loadURL)) {
            if (/^https?:\/\//i.test(url)) {
                shell.openExternal(url)
            }
            return { action: 'deny' }
        }

        return {
            action: 'allow',
            overrideBrowserWindowOptions: {
                width: 900,
                height: 700,
                title: 'Print Preview — Jattkart POS',
                autoHideMenuBar: true,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            }
        }
    })

    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url === loadURL || url.startsWith(`${loadURL}/`)) {
            return
        }

        event.preventDefault()
        if (/^https?:\/\//i.test(url)) {
            shell.openExternal(url)
        }
    })

    // In production, backend serves static frontend files
    log(`Loading main window: ${loadURL}`)
    mainWindow.loadURL(loadURL)

    // ── Block native Ctrl+P / Cmd+P ────────────────────────────────
    // The native print dialog shows the raw page HTML instead of the
    // custom thermal/A4 template.  Intercept the shortcut and send an
    // IPC event so the renderer can route through printService instead.
    mainWindow.webContents.on('before-input-event', (_event, input) => {
        if ((input.control || input.meta) && input.key.toLowerCase() === 'p') {
            _event.preventDefault()
            mainWindow.webContents.send('print:shortcut-pressed')
        }
    })

    mainWindow.webContents.once('did-finish-load', () => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.destroy()
            splashWindow = null
        }
        mainWindow.maximize()

        if (!isPackaged) {
            mainWindow.webContents.openDevTools({ mode: 'detach' })
        }
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

// ─── Error Handling ─────────────────────────────────────────
function showErrorAndQuit(message) {
    dialog.showErrorBox('Jattkart POS — Startup Error', message)
    app.quit()
}

// ─── Graceful Shutdown ──────────────────────────────────────
function killProcess(proc, name) {
    return new Promise((resolve) => {
        if (!proc || proc.killed) return resolve()

        log(`Sending SIGTERM to ${name} (pid=${proc.pid})`)

        const forceTimer = setTimeout(() => {
            try { proc.kill('SIGKILL') } catch (_) { /* ignore */ }
            resolve()
        }, SHUTDOWN_GRACE_MS)

        proc.once('exit', () => {
            clearTimeout(forceTimer)
            resolve()
        })

        try { proc.kill('SIGTERM') } catch (_) { resolve() }
    })
}

async function gracefulShutdown() {
    isQuitting = true
    log('Graceful shutdown initiated...')

    await Promise.all([
        killProcess(syncWorkerProcess, 'sync-worker'),
        killProcess(backendProcess, 'backend')
    ])

    log('All child processes terminated')
}

// ─── Auto Updater ───────────────────────────────────────────
const electronLog = require('electron-log');
const { autoUpdater } = require('electron-updater');
autoUpdater.logger = electronLog;
autoUpdater.logger.transports.file.level = 'info';

function setupAutoUpdater() {
    autoUpdater.on('checking-for-update', () => {
        electronLog.info('Checking for update...');
        if (mainWindow) mainWindow.webContents.send('updater:checking-for-update');
    });

    autoUpdater.on('update-available', (info) => {
        electronLog.info('Update available.');
        if (mainWindow) mainWindow.webContents.send('updater:update-available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
        electronLog.info('Update not available.');
        if (mainWindow) mainWindow.webContents.send('updater:update-not-available', info);
    });

    autoUpdater.on('error', (err) => {
        electronLog.info('Error in auto-updater. ' + err);
        if (mainWindow) mainWindow.webContents.send('updater:error', err?.message || String(err));
    });

    autoUpdater.on('download-progress', (progressObj) => {
        let log_message = "Download speed: " + progressObj.bytesPerSecond;
        log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
        log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
        electronLog.info(log_message);
        if (mainWindow) mainWindow.webContents.send('updater:download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
        electronLog.info('Update downloaded');
        if (mainWindow) mainWindow.webContents.send('updater:update-downloaded', info);
        
        // 🔥 Automatically install and restart the app for zero-intervention update
        isQuitting = true;
        autoUpdater.quitAndInstall();
    });

    ipcMain.handle('updater:check', () => {
        if (app.isPackaged) {
            autoUpdater.checkForUpdatesAndNotify();
        }
    });

    ipcMain.handle('updater:install', () => {
        isQuitting = true;
        autoUpdater.quitAndInstall();
    });
}

// ─── Print Handlers ─────────────────────────────────────────
const { printInvoice } = require('./printing/printManager')
const { simplifyPrinterList, getDefaultPrinter, detectPrinterType } = require('./printing/printerUtils')

function setupPrintHandlers() {
    // ── print:invoice ──────────────────────────────────────────
    // Unified print handler: auto-detects thermal vs A4, builds
    // the correct HTML, prints via hidden BrowserWindow.
    ipcMain.handle('print:invoice', async (_event, { invoice, settings, printerName, silent, layout }) => {
        try {
            log(`print:invoice — printer="${printerName || 'default'}" layout="${layout || 'auto'}" silent=${silent}`)
            let resolvedPrinterName = printerName || ''
            let resolvedLayout = layout || 'auto'

            if (mainWindow && resolvedLayout === 'auto' && !resolvedPrinterName) {
                const printers = await mainWindow.webContents.getPrintersAsync()
                const defaultPrinter = getDefaultPrinter(printers)

                if (defaultPrinter?.name) {
                    resolvedPrinterName = defaultPrinter.name
                    resolvedLayout = detectPrinterType(defaultPrinter.name)
                } else {
                    resolvedLayout = 'a4'
                }
            }

            log(`print:invoice â€” printer="${resolvedPrinterName || 'default'}" layout="${resolvedLayout}" silent=${silent}`)
            const result = await printInvoice({
                invoice,
                settings,
                printerName: resolvedPrinterName,
                silent,
                layout: resolvedLayout
            })
            if (!result.success) {
                log(`print:invoice failed: ${result.error}`)
            } else {
                log(`print:invoice success for ${invoice?.invoiceNumber || 'unknown'}`)
            }
            return result
        } catch (err) {
            log(`print:invoice error: ${err.message}`)
            return { success: false, error: err.message }
        }
    })

    // ── print:get-printers ─────────────────────────────────────
    // Returns available printers with thermal/standard detection.
    ipcMain.handle('print:get-printers', async () => {
        try {
            if (!mainWindow) return { success: true, printers: [] }
            const printers = await mainWindow.webContents.getPrintersAsync()
            return { success: true, printers: simplifyPrinterList(printers) }
        } catch (err) {
            log(`print:get-printers error: ${err.message}`)
            return { success: false, printers: [], error: err.message }
        }
    })

    // ── print:preview ──────────────────────────────────────────
    // Electron's Windows print dialog cannot show a page preview
    // ("This app doesn't support print preview" is a hard OS limit).
    // The solution: render to PDF silently → save to OS temp → open
    // in the default PDF viewer (Edge / Adobe Reader) which has its
    // own full preview panel and a Print button the user can use.
    ipcMain.handle('print:preview', async (_event, pdfOptions = {}) => {
        try {
            if (!mainWindow) throw new Error('No main window')

            const pdfData = await mainWindow.webContents.printToPDF({
                printBackground: true,
                margins: { marginType: 'printableArea' },
                pageSize: 'A4',
                ...pdfOptions
            })

            const os = require('os')
            const tmpFile = path.join(os.tmpdir(), `jattkart-invoice-${Date.now()}.pdf`)
            fs.writeFileSync(tmpFile, pdfData)

            // Open in default PDF viewer — gives full preview + print
            const errMsg = await shell.openPath(tmpFile)
            if (errMsg) throw new Error(errMsg)

            return { success: true, tmpFile }
        } catch (err) {
            log(`print:preview error: ${err.message}`)
            return { success: false, reason: err.message }
        }
    })

    // ── print:save-pdf ─────────────────────────────────────────
    // Lets the user choose a save location and keeps the PDF.
    ipcMain.handle('print:save-pdf', async (_event, pdfOptions = {}) => {
        try {
            if (!mainWindow) throw new Error('No main window')

            const pdfData = await mainWindow.webContents.printToPDF({
                printBackground: true,
                margins: { marginType: 'printableArea' },
                pageSize: 'A4',
                ...pdfOptions
            })

            const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
                title: 'Save Invoice as PDF',
                defaultPath: `invoice-${Date.now()}.pdf`,
                filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
            })
            if (canceled || !filePath) return { success: false, reason: 'cancelled' }

            fs.writeFileSync(filePath, pdfData)
            shell.openPath(filePath)
            return { success: true, filePath }
        } catch (err) {
            log(`print:save-pdf error: ${err.message}`)
            return { success: false, reason: err.message }
        }
    })
}

// ─── App Lifecycle ──────────────────────────────────────────
app.on('ready', async () => {
    ensureLogDir()
    log('=== Jattkart POS starting ===')
    log(`Packaged: ${isPackaged}`)
    log(`Root dir: ${rootDir}`)
    log(`Backend dir: ${backendDir}`)
    log(`Frontend dist: ${frontendDist}`)

    setupPrintHandlers()
    createSplashWindow()
    startBackend()

    try {
        await waitForBackend()
        log('Backend is healthy — launching main window')
        backendRestartCount = 0

        startSyncWorker()
        createMainWindow()
        setupAutoUpdater()

        if (app.isPackaged) {
            autoUpdater.checkForUpdatesAndNotify()
        }
    } catch (err) {
        log(`Startup failed: ${err.message}`)
        showErrorAndQuit(
            'Could not start the POS backend server.\n\n'
            + 'Possible causes:\n'
            + '• MongoDB is not running on this machine\n'
            + '• Port 4000 is already in use\n'
            + '• Configuration error in .env\n\n'
            + `Logs: ${logDir}`
        )
    }
})

app.on('before-quit', async (e) => {
    if (!isQuitting) {
        e.preventDefault()
        await gracefulShutdown()
        app.quit()
    }
})

app.on('window-all-closed', () => {
    app.quit()
})

app.on('activate', () => {
    if (!mainWindow) {
        createMainWindow()
    }
})
