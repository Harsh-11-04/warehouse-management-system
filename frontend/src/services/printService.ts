/**
 * Print Service — Renderer-side print interface
 * Wraps Electron IPC calls for the unified printing system.
 * Falls back to window.print() in non-Electron environments.
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

const api = (window as any).electronAPI

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
 */
export async function printInvoice(
    invoice: any,
    settings: any,
    options: PrintInvoiceOptions = {}
): Promise<PrintResult> {
    if (!api?.printInvoice) {
        // Browser fallback
        window.print()
        return { success: true }
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
    } catch (err: any) {
        return { success: false, error: err.message || 'Print failed' }
    }
}

/**
 * Open A4 print preview via system PDF viewer.
 * (Uses the existing PDF preview flow — ideal for A4 printers.)
 */
export async function printPreviewA4(): Promise<PrintResult> {
    if (!api?.printPreview) {
        window.print()
        return { success: true }
    }

    try {
        const result = await api.printPreview()
        if (result && !result.success && result.reason) {
            return { success: false, error: result.reason }
        }
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message || 'Preview failed' }
    }
}

/**
 * Save invoice as PDF file (A4 only).
 */
export async function saveAsPDF(): Promise<PrintResult> {
    if (!api?.savePDF) {
        window.print()
        return { success: true }
    }

    try {
        const result = await api.savePDF()
        if (result?.success) return { success: true }
        if (result?.reason === 'cancelled') return { success: false, error: 'cancelled' }
        return { success: false, error: result?.reason || 'Save failed' }
    } catch (err: any) {
        return { success: false, error: err.message || 'Save failed' }
    }
}
