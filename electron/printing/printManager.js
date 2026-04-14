/**
 * Print Manager — Core Orchestrator
 * Creates a hidden BrowserWindow, loads the correct HTML template,
 * and sends the print job using webContents.print().
 *
 * FIX: encodeURIComponent corrupts ₹ and multi-byte Unicode characters.
 *      Using base64 data URI instead for reliable Unicode rendering.
 * FIX: Window width must exactly match 80mm @ 96dpi = 302px for thermal.
 * FIX: Page height set to 1200mm (tall enough for any receipt) — printer
 *      auto-cuts; a small value like 297mm compresses content into a box.
 * FIX: Render delay increased to 800ms to ensure monospace fonts are fully
 *      laid out before the print pipeline fires.
 */

const { BrowserWindow } = require('electron')
const { detectPrinterType } = require('./printerUtils')
const { buildThermalReceiptHTML } = require('./thermalTemplate')
const { buildA4InvoiceHTML } = require('./a4Template')

// 80mm at 96 DPI = 302px exactly. Chromium renders at 96dpi.
const THERMAL_WINDOW_WIDTH = 302

/**
 * Encode HTML as a base64 data URI so Unicode chars (₹, etc.) are never corrupted.
 * @param {string} html
 * @returns {string} data URI
 */
function htmlToDataUri(html) {
    const base64 = Buffer.from(html, 'utf8').toString('base64')
    return `data:text/html;base64,${base64}`
}

/**
 * Print an invoice.
 *
 * @param {object} options
 * @param {object} options.invoice   — Invoice document from MongoDB
 * @param {object} options.settings  — BillingSettings document
 * @param {string} [options.printerName] — Target printer name (empty = default)
 * @param {boolean} [options.silent] — If true, skip print dialog
 * @param {'thermal'|'a4'|'auto'} [options.layout] — Force layout or auto-detect
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function printInvoice({ invoice, settings, printerName, silent, layout }) {
    return new Promise((resolve) => {
        try {
            // Determine layout type
            let printerType = layout || 'auto'
            if (printerType === 'auto') {
                printerType = printerName ? detectPrinterType(printerName) : 'thermal'
            }

            // Generate HTML
            const html = printerType === 'thermal'
                ? buildThermalReceiptHTML(invoice, settings)
                : buildA4InvoiceHTML(invoice, settings)

            // Determine silence — thermal is silent by default
            const isSilent = silent !== undefined ? silent : (printerType === 'thermal')

            // Create hidden window
            // Thermal: width = exactly 80mm @ 96dpi (302px)
            // A4:      standard 800px
            const printWindow = new BrowserWindow({
                show: false,
                width: printerType === 'thermal' ? THERMAL_WINDOW_WIDTH : 800,
                height: printerType === 'thermal' ? 1200 : 1100,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                    // NOTE: javascript must be enabled (default) so layout engine
                    // completes — disabling it can freeze the rendering pipeline.
                }
            })

            // Timeout safety — destroy window after 20 seconds no matter what
            const safetyTimeout = setTimeout(() => {
                try { if (!printWindow.isDestroyed()) printWindow.destroy() } catch (_) {}
                resolve({ success: false, error: 'Print timed out after 20 seconds' })
            }, 20000)

            // ── KEY FIX: use base64 data URI instead of encodeURIComponent ──
            // encodeURIComponent breaks ₹ and other multi-byte chars.
            const dataUri = htmlToDataUri(html)
            printWindow.loadURL(dataUri)

            printWindow.webContents.on('did-finish-load', () => {
                // ── KEY FIX: 800ms delay ──
                // 300ms is not enough for monospace font shaping + float layout.
                setTimeout(() => {
                    // Build print options
                    const printOptions = {
                        silent: isSilent,
                        printBackground: printerType === 'a4',
                        color: printerType === 'a4',
                        margins: {
                            marginType: 'none'   // always none — CSS padding handles spacing
                        },
                        scaleFactor: 100,   // No scaling — 1:1 pixel mapping
                    }

                    // Set page size
                    if (printerType === 'thermal') {
                        // ── KEY FIX: page height ──
                        // 297mm compressed a multi-item receipt into a tiny block.
                        // 1200mm is tall enough for any receipt; printer auto-cuts.
                        // Width = 80mm in microns (80000)
                        printOptions.pageSize = {
                            width: 80000,
                            height: 1200000  // 1200mm — thermal printer will auto-cut
                        }
                    } else {
                        printOptions.pageSize = 'A4'
                    }

                    // Set target printer
                    if (printerName) {
                        printOptions.deviceName = printerName
                    }

                    // Send print job
                    printWindow.webContents.print(printOptions, (success, failureReason) => {
                        clearTimeout(safetyTimeout)

                        try {
                            if (!printWindow.isDestroyed()) printWindow.destroy()
                        } catch (_) {}

                        if (success) {
                            resolve({ success: true })
                        } else {
                            resolve({
                                success: false,
                                error: failureReason || 'Print job failed'
                            })
                        }
                    })
                }, 800)  // 800ms — enough for full monospace font layout
            })

            printWindow.webContents.on('did-fail-load', (_event, errorCode, errorDesc) => {
                clearTimeout(safetyTimeout)
                try { if (!printWindow.isDestroyed()) printWindow.destroy() } catch (_) {}
                resolve({ success: false, error: `Failed to load print content: ${errorDesc} (${errorCode})` })
            })

        } catch (err) {
            resolve({ success: false, error: err.message || 'Unknown print error' })
        }
    })
}

module.exports = { printInvoice }
