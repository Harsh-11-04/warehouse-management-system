/**
 * Print Manager — Core Orchestrator
 * Creates a hidden BrowserWindow, loads the correct HTML template,
 * and sends the print job using webContents.print().
 */

const { BrowserWindow } = require('electron')
const { detectPrinterType } = require('./printerUtils')
const { buildThermalReceiptHTML } = require('./thermalTemplate')
const { buildA4InvoiceHTML } = require('./a4Template')

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
            const printWindow = new BrowserWindow({
                show: false,
                width: printerType === 'thermal' ? 310 : 800,
                height: printerType === 'thermal' ? 900 : 1100,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    javascript: false    // no JS needed, pure HTML
                }
            })

            // Timeout safety — destroy window after 15 seconds no matter what
            const safetyTimeout = setTimeout(() => {
                try { if (!printWindow.isDestroyed()) printWindow.destroy() } catch (_) {}
                resolve({ success: false, error: 'Print timed out after 15 seconds' })
            }, 15000)

            // Load HTML content
            const encodedHtml = encodeURIComponent(html)
            printWindow.loadURL(`data:text/html;charset=utf-8,${encodedHtml}`)

            printWindow.webContents.on('did-finish-load', () => {
                // Small delay to let the renderer paint
                setTimeout(() => {
                    // Build print options
                    const printOptions = {
                        silent: isSilent,
                        printBackground: printerType === 'a4',
                        color: printerType === 'a4',
                        margins: {
                            marginType: printerType === 'thermal' ? 'none' : 'printableArea'
                        },
                        scaleFactor: 100,   // No scaling!
                    }

                    // Set page size
                    if (printerType === 'thermal') {
                        // 80mm width in microns = 80000, height large enough for auto-cut
                        printOptions.pageSize = {
                            width: 80000,
                            height: 297000  // ~297mm, printer will auto-cut
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
                }, 300)
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
