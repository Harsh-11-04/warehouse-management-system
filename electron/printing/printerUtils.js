/**
 * Printer Detection Utilities
 * Identifies thermal (POS/receipt) vs standard (A4) printers.
 */

// Keywords that indicate a thermal/receipt printer
const THERMAL_KEYWORDS = [
    'pos', 'thermal', 'retsol', 'receipt', 'epson tm',
    'star tsp', 'bixolon', 'citizen', '80mm', '58mm',
    'xprinter', 'rongta', 'sewoo', 'custom kube',
    'cashino', 'goojprt', 'munbyn', 'hoin'
]

/**
 * Check if a printer name indicates a thermal printer.
 * @param {string} printerName
 * @returns {boolean}
 */
function isThermalPrinter(printerName) {
    if (!printerName) return false
    const lower = printerName.toLowerCase()
    return THERMAL_KEYWORDS.some(keyword => lower.includes(keyword))
}

/**
 * Detect printer type from name.
 * @param {string} printerName
 * @returns {'thermal' | 'a4'}
 */
function detectPrinterType(printerName) {
    return isThermalPrinter(printerName) ? 'thermal' : 'a4'
}

/**
 * Get the system default printer from a list.
 * @param {Array} printers — from webContents.getPrintersAsync()
 * @returns {object|null}
 */
function getDefaultPrinter(printers) {
    if (!printers || !printers.length) return null
    return printers.find(p => p.isDefault) || printers[0]
}

/**
 * Get all printers in a simplified format.
 * @param {Array} printers — from webContents.getPrintersAsync()
 * @returns {Array<{name: string, isDefault: boolean, isThermal: boolean}>}
 */
function simplifyPrinterList(printers) {
    if (!printers || !printers.length) return []
    return printers.map(p => ({
        name: p.name,
        displayName: p.displayName || p.name,
        isDefault: p.isDefault || false,
        isThermal: isThermalPrinter(p.name),
        status: p.status
    }))
}

module.exports = {
    isThermalPrinter,
    detectPrinterType,
    getDefaultPrinter,
    simplifyPrinterList,
    THERMAL_KEYWORDS
}
