import { useState } from 'react'
import { Button } from 'primereact/button'
import { useGetWarehouseWiseStockQuery, useGetMonthlyInventorySummaryQuery } from '../../provider/queries/Report.query'
import axios from 'axios'
import { toast } from 'sonner'

const ReportsPage = () => {
  const { data: warehouseStock } = useGetWarehouseWiseStockQuery()
  const { data: monthlySummary } = useGetMonthlyInventorySummaryQuery({ months: 6 })
  const [csvDownloading, setCsvDownloading] = useState('')

  const exportWarehouseCsv = () => {
    if (!warehouseStock?.warehouses?.length) return
    setCsvDownloading('warehouse')
    const rows = [
      ['Warehouse', 'Total Quantity', 'Product Count', 'Total Value'],
      ...warehouseStock.warehouses.map((w: any) => [
        w.warehouseName,
        String(w.totalQuantity),
        String(w.productCount),
        String(w.totalValue),
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'warehouse-stock.csv'
    a.click()
    URL.revokeObjectURL(url)
    setCsvDownloading('')
  }

  const downloadFromBackend = async (endpoint: string, filename: string, key: string) => {
    setCsvDownloading(key)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(import.meta.env.VITE_BACKEND_URL + endpoint, {
        headers: { Authorization: 'Bearer ' + token },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${filename} downloaded!`)
    } catch (err: any) {
      toast.error('Export failed — ' + (err.message || 'Unknown error'))
    }
    setCsvDownloading('')
  }

  const printReport = () => {
    const content = document.querySelector('.p-4.space-y-4')
    if (!content) return

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) { toast.error('Could not open print window'); return }

    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML).join('\n')

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Reports</title>${stylesheets}
      <style>
        body { margin:0; padding:20px; background:white; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
        @media print { body { padding:0; } .no-print { display:none!important; } }
      </style></head><body>
        ${content.innerHTML}
        <div class="no-print" style="margin-top:24px;text-align:center;padding:16px;">
          <button onclick="window.print()" style="padding:10px 32px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:15px;cursor:pointer;margin-right:12px;">🖨️ Print</button>
          <button onclick="window.close()" style="padding:10px 32px;background:#6b7280;color:white;border:none;border-radius:8px;font-size:15px;cursor:pointer;">✕ Close</button>
        </div>
      </body></html>
    `)
    printWindow.document.close()
    printWindow.onload = () => { printWindow.focus(); printWindow.print() }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <div className="flex gap-2 flex-wrap">
          <Button
            label="Warehouse CSV"
            icon="pi pi-file"
            size="small"
            onClick={exportWarehouseCsv}
            loading={csvDownloading === 'warehouse'}
          />
          <Button
            label="Low Stock CSV"
            icon="pi pi-exclamation-triangle"
            size="small"
            severity="warning"
            onClick={() => downloadFromBackend('/report/export/low-stock', 'low-stock-report.csv', 'lowstock')}
            loading={csvDownloading === 'lowstock'}
          />
          <Button
            label="Product Movements CSV"
            icon="pi pi-arrows-h"
            size="small"
            severity="info"
            onClick={() => downloadFromBackend('/report/export/product-movements', 'product-movements.csv', 'movements')}
            loading={csvDownloading === 'movements'}
          />
          <Button label="Print / PDF" icon="pi pi-print" size="small" severity="secondary" onClick={printReport} />
        </div>
      </div>

      <section className="bg-white rounded-xl border shadow-sm p-3 print:p-0">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Warehouse-wise Stock</h2>
        <div className="overflow-auto max-h-80">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Warehouse</th>
                <th className="text-left p-2">Total Qty</th>
                <th className="text-left p-2">Products</th>
                <th className="text-left p-2">Inventory Value</th>
              </tr>
            </thead>
            <tbody>
              {warehouseStock?.warehouses?.length ? (
                warehouseStock.warehouses.map((w: any) => (
                  <tr key={w.warehouseId} className="border-t">
                    <td className="p-2">{w.warehouseName}</td>
                    <td className="p-2">{w.totalQuantity}</td>
                    <td className="p-2">{w.productCount}</td>
                    <td className="p-2">₹{(w.totalValue || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-2 text-xs text-gray-400">
                    No warehouse stock data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl border shadow-sm p-3 print:p-0">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Monthly Inventory Summary (last 6 months)</h2>
        <div className="overflow-auto max-h-80">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Month</th>
                <th className="text-left p-2">Received Qty</th>
                <th className="text-left p-2">Outbound Qty</th>
                <th className="text-left p-2">Transfers</th>
              </tr>
            </thead>
            <tbody>
              {monthlySummary?.summary?.length ? (
                monthlySummary.summary.map((m: any) => (
                  <tr key={`${m._id.year}-${m._id.month}`} className="border-t">
                    <td className="p-2">
                      {m._id.month.toString().padStart(2, '0')}/{m._id.year}
                    </td>
                    <td className="p-2 text-green-700">{m.receiveQty}</td>
                    <td className="p-2 text-orange-700">{m.outQty}</td>
                    <td className="p-2">{m.transferCount}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-2 text-xs text-gray-400">
                    No inventory movement data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default ReportsPage

