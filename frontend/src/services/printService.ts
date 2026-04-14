/**
 * Print Service — Renderer-side print interface
 * Wraps Electron IPC calls for the unified printing system.
 *
 * IMPORTANT: window.print() is NEVER used as fallback inside Electron.
 * It opens the native Chromium print dialog which shows the raw page HTML
 * instead of the custom thermal/A4 template — this is the main bug.
 */

interface PrinterInfo {
    name: string
    displayName: string
    isDefault: boolean
    isThermal: boolean
    status: number
}

interface PrintResult {
    success: boolean
    error?: string
}

interface PrintInvoiceOptions {
    printerName?: string
    silent?: boolean
    layout?: 'thermal' | 'a4' | 'auto'
}

const api = window.electronAPI

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback

/**
 * Check if running inside Electron.
 */
export function isElectron(): boolean {
    return !!api?.isElectron
}

/**
 * Get available printers with thermal/standard detection.
 */
export async function getPrinters(): Promise<PrinterInfo[]> {
    if (!api?.getPrinters) return []
    try {
        const result = await api.getPrinters()
        return result?.printers || []
    } catch {
        return []
    }
}

/**
 * Print an invoice. Auto-detects printer type and uses correct layout.
 * - Thermal → silent auto-print (no dialog)
 * - A4 → PDF preview in system viewer (has its own print button)
 *
 * NOTE: No window.print() fallback — it opens the native dialog which
 * shows the raw page instead of the custom thermal/A4 template.
 */
export async function printInvoice(
    invoice: unknown,
    settings: unknown,
    options: PrintInvoiceOptions = {}
): Promise<PrintResult> {
    if (!api?.printInvoice) {
        // Not running in Electron — cannot print
        return { success: false, error: 'Printing is only available in the desktop app' }
    }

    try {
        const result = await api.printInvoice({
            invoice,
            settings,
            printerName: options.printerName || '',
            silent: options.silent,
            layout: options.layout || 'auto',
        })
        return result
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Print failed') }
    }
}

/**
 * Open A4 print preview via system PDF viewer.
 * (Uses the existing PDF preview flow — ideal for A4 printers.)
 */
export async function printPreviewA4(): Promise<PrintResult> {
    if (!api?.printPreview) {
        return { success: false, error: 'Preview is only available in the desktop app' }
    }

    try {
        const result = await api.printPreview()
        if (result && !result.success && result.reason) {
            return { success: false, error: result.reason }
        }
        return { success: true }
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Preview failed') }
    }
}

/**
 * Save invoice as PDF file (A4 only).
 */
export async function saveAsPDF(): Promise<PrintResult> {
    if (!api?.savePDF) {
        return { success: false, error: 'Save as PDF is only available in the desktop app' }
    }

    try {
        const result = await api.savePDF()
        if (result?.success) return { success: true }
        if (result?.reason === 'cancelled') return { success: false, error: 'cancelled' }
        return { success: false, error: result?.reason || 'Save failed' }
    } catch (error: unknown) {
        return { success: false, error: getErrorMessage(error, 'Save failed') }
    }
}

/**
 * Register the Ctrl+P shortcut listener.
 * The main process blocks native Ctrl+P and sends 'print:shortcut-pressed'
 * via IPC. This function lets components register a callback for it.
 */
export function onPrintShortcut(callback: () => void): () => void {
    if (!api?.onPrintShortcut) return () => {}
    const listenerId = api.onPrintShortcut(callback)
    return () => {
        if (typeof listenerId === 'number') {
            api.removePrintShortcutListener?.(listenerId)
        }
    }
}
