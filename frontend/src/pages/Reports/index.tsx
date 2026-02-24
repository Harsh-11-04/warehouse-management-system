import { useState } from 'react'
import { Button } from 'primereact/button'
import { useGetWarehouseWiseStockQuery, useGetMonthlyInventorySummaryQuery } from '../../provider/queries/Report.query'

const ReportsPage = () => {
  const { data: warehouseStock } = useGetWarehouseWiseStockQuery()
  const { data: monthlySummary } = useGetMonthlyInventorySummaryQuery({ months: 6 })
  const [csvDownloading, setCsvDownloading] = useState(false)

  const exportCsv = () => {
    if (!warehouseStock?.warehouses?.length) return
    setCsvDownloading(true)
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
    setCsvDownloading(false)
  }

  const printReport = () => {
    window.print()
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <div className="flex gap-2">
          <Button label="Export CSV" icon="pi pi-file" onClick={exportCsv} disabled={csvDownloading} />
          <Button label="Print / PDF" icon="pi pi-print" severity="secondary" onClick={printReport} />
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
