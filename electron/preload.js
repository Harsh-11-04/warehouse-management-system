const { contextBridge, ipcRenderer } = require('electron')
let printShortcutListenerId = 0
const printShortcutListeners = new Map()

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform,
    versions: {
        node: process.versions.node,
        electron: process.versions.electron,
        chrome: process.versions.chrome
    },
    // ── New unified printing system ──────────────────────────────
    // Prints invoice using correct layout (thermal 80mm or A4)
    printInvoice: (data) => ipcRenderer.invoke('print:invoice', data),
    // Returns list of available printers with thermal detection
    getPrinters: () => ipcRenderer.invoke('print:get-printers'),
    // ── Ctrl+P shortcut interceptor ──────────────────────────────
    // Fired when Ctrl+P is pressed — renderer should route through printService
    onPrintShortcut: (callback) => {
        const listenerId = ++printShortcutListenerId
        const listener = () => callback()
        printShortcutListeners.set(listenerId, listener)
        ipcRenderer.on('print:shortcut-pressed', listener)
        return listenerId
    },
    removePrintShortcutListener: (listenerId) => {
        const listener = printShortcutListeners.get(listenerId)
        if (!listener) return
        ipcRenderer.removeListener('print:shortcut-pressed', listener)
        printShortcutListeners.delete(listenerId)
    },
    // ── Legacy print handlers (kept for backward compat) ────────
    // Renders page to PDF → opens in system PDF viewer (full preview + print)
    printPreview: (options) => ipcRenderer.invoke('print:preview', options),
    // Renders page to PDF → prompts user to Save As → opens in PDF viewer
    savePDF: (options) => ipcRenderer.invoke('print:save-pdf', options),
    updater: {
        check: () => ipcRenderer.invoke('updater:check'),
        install: () => ipcRenderer.invoke('updater:install'),
        onCheckingForUpdate: (callback) => ipcRenderer.on('updater:checking-for-update', () => callback()),
        onUpdateAvailable: (callback) => ipcRenderer.on('updater:update-available', (_event, info) => callback(info)),
        onUpdateNotAvailable: (callback) => ipcRenderer.on('updater:update-not-available', (_event, info) => callback(info)),
        onError: (callback) => ipcRenderer.on('updater:error', (_event, err) => callback(err)),
        onDownloadProgress: (callback) => ipcRenderer.on('updater:download-progress', (_event, progressObj) => callback(progressObj)),
        onUpdateDownloaded: (callback) => ipcRenderer.on('updater:update-downloaded', (_event, info) => callback(info)),
        removeListeners: () => {
            ipcRenderer.removeAllListeners('updater:checking-for-update');
            ipcRenderer.removeAllListeners('updater:update-available');
            ipcRenderer.removeAllListeners('updater:update-not-available');
            ipcRenderer.removeAllListeners('updater:error');
            ipcRenderer.removeAllListeners('updater:download-progress');
            ipcRenderer.removeAllListeners('updater:update-downloaded');
        }
    }
})
