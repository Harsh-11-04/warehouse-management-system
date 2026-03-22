const { app, BrowserWindow, dialog } = require('electron')
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

    // In production, backend serves static frontend files
    const loadURL = `http://127.0.0.1:${BACKEND_PORT}`
    log(`Loading main window: ${loadURL}`)
    mainWindow.loadURL(loadURL)

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

// ─── App Lifecycle ──────────────────────────────────────────
app.on('ready', async () => {
    ensureLogDir()
    log('=== Jattkart POS starting ===')
    log(`Packaged: ${isPackaged}`)
    log(`Root dir: ${rootDir}`)
    log(`Backend dir: ${backendDir}`)
    log(`Frontend dist: ${frontendDist}`)

    createSplashWindow()
    startBackend()

    try {
        await waitForBackend()
        log('Backend is healthy — launching main window')
        backendRestartCount = 0

        startSyncWorker()
        createMainWindow()
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
