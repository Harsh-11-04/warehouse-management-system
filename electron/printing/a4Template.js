/**
 * A4 Invoice Template
 * Generates a professional full-page HTML invoice for standard printers.
 */

/**
 * Format a number as currency.
 * @param {number} num
 * @param {string} symbol
 * @returns {string}
 */
function formatCurrency(num, symbol = '₹') {
    return `${symbol}${(num || 0).toFixed(2)}`
}

/**
 * Format a date for display.
 * @param {string|Date} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
    const d = new Date(dateStr)
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    })
}

/**
 * Build A4 invoice HTML string.
 * @param {object} invoice — full invoice object from MongoDB
 * @param {object} settings — BillingSettings (storeName, storeAddress, etc.)
 * @returns {string} Complete HTML document string
 */
function buildA4InvoiceHTML(invoice, settings = {}) {
    const storeName = settings.storeName || 'Jattkart'
    const storeAddress = settings.storeAddress || ''
    const storePhone = settings.storePhone || ''
    const storeEmail = settings.storeEmail || ''
    const gstNumber = settings.gstNumber || ''
    const currencySymbol = settings.currencySymbol || '₹'
    const invoiceFooter = settings.invoiceFooter || 'Thank you for your business!'
    const logoUrl = settings.logoUrl || ''

    // Build item rows
    const itemsHTML = (invoice.items || []).map((item, idx) => {
        const qty = item.quantity || 1
        const price = item.price || 0
        const mrp = item.mrp || 0
        const gstPct = item.gstPercent || 0
        const gstAmt = item.gstAmount || 0
        const lineTotal = item.lineTotal || (price * qty)
        const returnedQty = item.returnedQuantity || 0
        const returnBadge = returnedQty > 0
            ? `<span style="display:inline-block;margin-left:6px;padding:1px 6px;background:#FEE2E2;color:#B91C1C;font-size:9px;border-radius:3px;">Rtn: ${returnedQty}</span>`
            : ''

        return `
        <tr>
            <td style="padding:10px 8px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px;">${idx + 1}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #E5E7EB;font-weight:500;font-size:13px;">
                ${item.name || 'Item'}${returnBadge}
            </td>
            <td style="padding:10px 8px;border-bottom:1px solid #E5E7EB;text-align:right;font-size:13px;">${formatCurrency(mrp, currencySymbol)}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #E5E7EB;text-align:right;font-size:13px;">${formatCurrency(price, currencySymbol)}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #E5E7EB;text-align:right;font-size:13px;">${gstPct.toFixed(1)}%</td>
            <td style="padding:10px 8px;border-bottom:1px solid #E5E7EB;text-align:center;font-size:13px;">
                ${qty}${returnedQty > 0 ? `<br><span style="color:#EF4444;font-size:11px;">-${returnedQty} Rtn</span>` : ''}
            </td>
            <td style="padding:10px 8px;border-bottom:1px solid #E5E7EB;text-align:right;font-size:13px;">${formatCurrency(gstAmt, currencySymbol)}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #E5E7EB;text-align:right;font-weight:600;font-size:13px;">${formatCurrency(lineTotal, currencySymbol)}</td>
        </tr>`
    }).join('')

    // Discount row
    let discountRow = ''
    if (invoice.discount && invoice.discount > 0) {
        const discLabel = invoice.discountType === 'percent' ? 'Discount (%)' : 'Discount (Flat)'
        discountRow = `
        <tr>
            <td colspan="7" style="padding:6px 8px;text-align:right;font-size:13px;color:#EF4444;">${discLabel}</td>
            <td style="padding:6px 8px;text-align:right;font-size:13px;color:#EF4444;">-${formatCurrency(invoice.discount, currencySymbol)}</td>
        </tr>`
    }

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice - ${invoice.invoiceNumber || ''}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        @page {
            size: A4;
            margin: 15mm 12mm;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 13px;
            color: #1F2937;
            background: #fff;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div style="text-align:center;padding-bottom:16px;border-bottom:2px solid #E5E7EB;margin-bottom:20px;">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height:48px;margin-bottom:8px;" onerror="this.style.display='none'">` : ''}
        <h1 style="font-size:26px;font-weight:700;color:#111827;letter-spacing:1px;margin:0;">${storeName}</h1>
        ${storeAddress ? `<p style="font-size:12px;color:#6B7280;margin-top:4px;">${storeAddress}</p>` : ''}
        <div style="font-size:11px;color:#9CA3AF;margin-top:4px;">
            ${storePhone ? `Ph: ${storePhone}` : ''}
            ${storePhone && storeEmail ? ' | ' : ''}
            ${storeEmail ? storeEmail : ''}
        </div>
        ${gstNumber ? `<p style="font-size:11px;color:#6B7280;margin-top:2px;">GSTIN: ${gstNumber}</p>` : ''}
    </div>

    <!-- Invoice Meta -->
    <div style="display:flex;justify-content:space-between;margin-bottom:20px;">
        <div>
            <h2 style="font-size:16px;font-weight:600;color:#374151;margin-bottom:6px;">
                Invoice <span style="color:#2563EB;">${invoice.invoiceNumber || 'N/A'}</span>
            </h2>
            <div style="font-size:12px;color:#6B7280;">
                <strong>Date:</strong> ${formatDate(invoice.createdAt)}
            </div>
            ${invoice.billedBy ? `<div style="font-size:12px;color:#6B7280;"><strong>Billed By:</strong> ${invoice.billedBy}</div>` : ''}
        </div>
        <div style="text-align:right;">
            <div style="font-size:12px;color:#6B7280;font-weight:500;">Bill To:</div>
            <div style="font-size:13px;font-weight:600;color:#374151;">
                ${invoice.customerName || 'Walk-in'}
                ${invoice.customerPhone ? `<span style="font-weight:400;color:#6B7280;">(${invoice.customerPhone})</span>` : ''}
            </div>
        </div>
    </div>

    <!-- Items Table -->
    <table>
        <thead>
            <tr style="background:#F9FAFB;border-top:1px solid #E5E7EB;border-bottom:1px solid #E5E7EB;">
                <th style="padding:10px 8px;text-align:left;font-weight:600;font-size:12px;color:#6B7280;">#</th>
                <th style="padding:10px 8px;text-align:left;font-weight:600;font-size:12px;color:#6B7280;">Item</th>
                <th style="padding:10px 8px;text-align:right;font-weight:600;font-size:12px;color:#6B7280;">MRP</th>
                <th style="padding:10px 8px;text-align:right;font-weight:600;font-size:12px;color:#6B7280;">Price</th>
                <th style="padding:10px 8px;text-align:right;font-weight:600;font-size:12px;color:#6B7280;">GST%</th>
                <th style="padding:10px 8px;text-align:center;font-weight:600;font-size:12px;color:#6B7280;">Qty</th>
                <th style="padding:10px 8px;text-align:right;font-weight:600;font-size:12px;color:#6B7280;">GST Amt</th>
                <th style="padding:10px 8px;text-align:right;font-weight:600;font-size:12px;color:#6B7280;">Total</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHTML}
        </tbody>
        <tfoot>
            <!-- Subtotal -->
            <tr style="border-top:2px solid #D1D5DB;">
                <td colspan="7" style="padding:6px 8px;text-align:right;font-size:12px;color:#6B7280;">Subtotal</td>
                <td style="padding:6px 8px;text-align:right;font-size:12px;color:#6B7280;">${formatCurrency(invoice.subtotal, currencySymbol)}</td>
            </tr>
            <!-- GST -->
            ${(invoice.totalGst && invoice.totalGst > 0) ? `
            <tr>
                <td colspan="7" style="padding:6px 8px;text-align:right;font-size:12px;color:#6B7280;">Total GST</td>
                <td style="padding:6px 8px;text-align:right;font-size:12px;color:#6B7280;">${formatCurrency(invoice.totalGst, currencySymbol)}</td>
            </tr>` : ''}
            <!-- Discount -->
            ${discountRow}
            <!-- Grand Total -->
            <tr style="border-top:2px solid #374151;">
                <td colspan="7" style="padding:12px 8px;text-align:right;font-weight:700;font-size:16px;color:#111827;">Grand Total</td>
                <td style="padding:12px 8px;text-align:right;font-weight:700;font-size:18px;color:#111827;">${formatCurrency(invoice.grandTotal, currencySymbol)}</td>
            </tr>
        </tfoot>
    </table>

    <!-- Payment Info -->
    <div style="margin-top:20px;padding:12px 16px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;display:flex;justify-content:space-between;font-size:13px;">
        <span><strong>Payment Mode:</strong> ${invoice.paymentMode || 'Cash'}</span>
        <span><strong>Status:</strong>
            <span style="padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;${
                invoice.paymentStatus === 'Paid'
                    ? 'background:#D1FAE5;color:#065F46;'
                    : 'background:#FEE2E2;color:#991B1B;'
            }">${invoice.paymentStatus || 'Paid'}</span>
        </span>
    </div>

    <!-- Footer -->
    <div style="margin-top:24px;text-align:center;padding-top:16px;border-top:1px solid #E5E7EB;">
        <p style="font-size:12px;color:#6B7280;">${invoiceFooter}</p>
    </div>
</body>
</html>`
}

module.exports = { buildA4InvoiceHTML }
