/**
 * Thermal Receipt Template (80mm / 58mm)
 * Generates a clean, monospace HTML receipt optimized for thermal printers.
 * No colors, no gradients, no images — pure black on white.
 */

/**
 * Format a number as Indian currency.
 * @param {number} num
 * @param {string} symbol
 * @returns {string}
 */
function formatCurrency(num, symbol = '₹') {
    return `${symbol}${(num || 0).toFixed(2)}`
}

/**
 * Format a date for receipt display.
 * @param {string|Date} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
    const d = new Date(dateStr)
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    })
}

/**
 * Build thermal receipt HTML string.
 * @param {object} invoice — full invoice object from MongoDB
 * @param {object} settings — BillingSettings (storeName, storeAddress, etc.)
 * @returns {string} Complete HTML document string
 */
function buildThermalReceiptHTML(invoice, settings = {}) {
    const storeName = settings.storeName || 'Jattkart'
    const storeAddress = settings.storeAddress || ''
    const storePhone = settings.storePhone || ''
    const gstNumber = settings.gstNumber || ''
    const currencySymbol = settings.currencySymbol || '₹'
    const invoiceFooter = settings.invoiceFooter || 'Thank you for your business!'

    // Build items rows
    // NOTE: float:right inside <td> causes text overlap on thermal printers.
    // Using a two-cell <tr> with text-align:right instead.
    const itemsHTML = (invoice.items || []).map((item, idx) => {
        const qty = item.quantity || 1
        const price = item.price || 0
        const lineTotal = item.lineTotal || (price * qty)
        const name = (item.name || 'Item').substring(0, 22) // keep short for 80mm roll
        const returnedQty = item.returnedQuantity || 0
        const returnNote = returnedQty > 0 ? ` <span style="font-size:10px;">(Rtn:${returnedQty})</span>` : ''

        return `
        <tr>
            <td colspan="2" style="padding:2px 0;vertical-align:top;font-size:12px;">
                ${idx + 1}. ${name}${returnNote}
            </td>
        </tr>
        <tr>
            <td style="padding:0 0 6px 12px;font-size:12px;">${qty} x ${formatCurrency(price, currencySymbol)}</td>
            <td style="padding:0 0 6px;font-size:12px;font-weight:bold;text-align:right;">${formatCurrency(lineTotal, currencySymbol)}</td>
        </tr>`
    }).join('')

    // Discount info — use two cells, no float
    let discountHTML = ''
    if (invoice.discount && invoice.discount > 0) {
        const discLabel = invoice.discountType === 'percent' ? 'Discount(%)' : 'Discount'
        discountHTML = `
        <tr>
            <td style="padding:2px 0;font-size:12px;">${discLabel}</td>
            <td style="padding:2px 0;font-size:12px;text-align:right;">-${formatCurrency(invoice.discount, currencySymbol)}</td>
        </tr>`
    }

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt - ${invoice.invoiceNumber || ''}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        @page {
            /* 80mm wide, auto height — thermal printer feeds until end of content */
            size: 80mm auto;
            margin: 0;
        }
        body {
            /* 76mm = 80mm roll minus 2mm each side for safe print zone */
            width: 76mm;
            max-width: 76mm;
            margin: 0 auto;
            padding: 3mm 0;
            font-family: 'Courier New', 'Lucida Console', monospace;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed; /* prevent columns from overflowing */
        }
        td {
            word-break: break-word;
            overflow-wrap: break-word;
        }
        .divider {
            border-top: 1px dashed #000;
            margin: 5px 0;
        }
        .center {
            text-align: center;
        }
        .bold {
            font-weight: bold;
        }
        .grand-total {
            font-size: 15px;
            font-weight: bold;
            padding: 3px 0;
        }
    </style>
</head>
<body>
    <!-- Store Header -->
    <div class="center" style="margin-bottom:4px;">
        <div style="font-size:18px;font-weight:bold;letter-spacing:1px;">${storeName.toUpperCase()}</div>
        ${storeAddress ? `<div style="font-size:10px;margin-top:2px;">${storeAddress}</div>` : ''}
        ${storePhone ? `<div style="font-size:10px;">Ph: ${storePhone}</div>` : ''}
        ${gstNumber ? `<div style="font-size:10px;">GST: ${gstNumber}</div>` : ''}
    </div>

    <div class="divider"></div>

    <!-- Invoice Info -->
    <table>
        <tr>
            <td style="font-size:12px;padding:1px 0;">
                <span class="bold">Invoice:</span> ${invoice.invoiceNumber || 'N/A'}
            </td>
        </tr>
        <tr>
            <td style="font-size:11px;padding:1px 0;">
                <span class="bold">Date:</span> ${formatDate(invoice.createdAt)}
            </td>
        </tr>
        <tr>
            <td style="font-size:11px;padding:1px 0;">
                <span class="bold">Customer:</span> ${invoice.customerName || 'Walk-in'}${invoice.customerPhone ? ` (${invoice.customerPhone})` : ''}
            </td>
        </tr>
        ${invoice.billedBy ? `
        <tr>
            <td style="font-size:11px;padding:1px 0;">
                <span class="bold">Billed By:</span> ${invoice.billedBy}
            </td>
        </tr>` : ''}
    </table>

    <div class="divider"></div>

    <!-- Items -->
    <table>
        ${itemsHTML}
    </table>

    <div class="divider"></div>

    <!-- Totals — two-column table, no floats -->
    <table>
        <tr>
            <td style="padding:2px 0;font-size:12px;">Subtotal</td>
            <td style="padding:2px 0;font-size:12px;text-align:right;">${formatCurrency(invoice.subtotal, currencySymbol)}</td>
        </tr>
        ${(invoice.totalGst && invoice.totalGst > 0) ? `
        <tr>
            <td style="padding:2px 0;font-size:12px;">GST</td>
            <td style="padding:2px 0;font-size:12px;text-align:right;">${formatCurrency(invoice.totalGst, currencySymbol)}</td>
        </tr>` : ''}
        ${discountHTML}
    </table>

    <div style="border-top:2px solid #000;margin:4px 0;"></div>

    <!-- Grand Total — two cells, no float -->
    <table>
        <tr>
            <td class="grand-total">TOTAL</td>
            <td class="grand-total" style="text-align:right;">${formatCurrency(invoice.grandTotal, currencySymbol)}</td>
        </tr>
    </table>

    <div class="divider"></div>

    <!-- Payment Info -->
    <div class="center" style="font-size:11px;padding:4px 0;">
        Payment: ${invoice.paymentMode || 'Cash'} | ${invoice.paymentStatus || 'Paid'}
    </div>

    <div class="divider"></div>

    <!-- Footer -->
    <div class="center" style="font-size:11px;padding:6px 0 2px;">
        ${invoiceFooter}
    </div>

    <div style="height:10mm;"></div>
</body>
</html>`
}

module.exports = { buildThermalReceiptHTML }
