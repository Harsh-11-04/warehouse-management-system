export interface ElectronPrinterInfo {
    name: string
    displayName: string
    isDefault: boolean
    isThermal: boolean
    status: number
}

export interface ElectronPrintResult {
    success: boolean
    error?: string
    reason?: string
    tmpFile?: string
    filePath?: string
}

export interface ElectronUpdaterProgress {
    bytesPerSecond: number
    percent: number
    transferred: number
    total: number
}

export interface ElectronUpdaterInfo {
    version?: string
    releaseDate?: string
    releaseName?: string
    releaseNotes?: string | string[]
}

export interface ElectronAPI {
    isElectron: boolean
    platform: string
    versions: {
        node: string
        electron: string
        chrome: string
    }
    printInvoice: (data: {
        invoice: unknown
        settings: unknown
        printerName?: string
        silent?: boolean
        layout?: 'thermal' | 'a4' | 'auto'
    }) => Promise<ElectronPrintResult>
    getPrinters: () => Promise<{ success: boolean; printers: ElectronPrinterInfo[]; error?: string }>
    onPrintShortcut: (callback: () => void) => number
    removePrintShortcutListener: (listenerId: number) => void
    printPreview: (options?: Record<string, unknown>) => Promise<ElectronPrintResult>
    savePDF: (options?: Record<string, unknown>) => Promise<ElectronPrintResult>
    updater: {
        check: () => void
        install: () => void
        onCheckingForUpdate: (callback: () => void) => void
        onUpdateAvailable: (callback: (info: ElectronUpdaterInfo) => void) => void
        onUpdateNotAvailable: (callback: (info: ElectronUpdaterInfo) => void) => void
        onError: (callback: (err: string) => void) => void
        onDownloadProgress: (callback: (progressObj: ElectronUpdaterProgress) => void) => void
        onUpdateDownloaded: (callback: (info: ElectronUpdaterInfo) => void) => void
        removeListeners: () => void
    }
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI
    }
}
