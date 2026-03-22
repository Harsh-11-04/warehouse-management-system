import { useState, useMemo } from 'react'
import { Button } from 'primereact/button'
import { useGetBillingReportsQuery } from '../../provider/queries/BillingInvoice.query'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    PointElement,
    LineElement,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, Filler, PointElement, LineElement)

const fmt = (n: number) => '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const BillingReportsPage = () => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])

    const { data, isLoading, isFetching } = useGetBillingReportsQuery({ startDate, endDate })

    const report = data || {}
    const rev = report.revenueSummary || {}
    const daily = report.dailyTrend || []
    const topP = report.topProducts || []
    const topC = report.topCustomers || []
    const ps = report.paymentSplit || { cash: { total: 0, count: 0 }, online: { total: 0, count: 0 } }

    // Chart data
    const dailyChartData = useMemo(() => ({
        labels: daily.map((d: any) => {
            const dt = new Date(d.date)
            return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        }),
        datasets: [
            {
                label: 'Revenue',
                data: daily.map((d: any) => d.revenue),
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                borderColor: 'rgb(99, 102, 241)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgb(99, 102, 241)',
                pointRadius: 4,
                pointHoverRadius: 7,
            },
            {
                label: 'Invoices',
                data: daily.map((d: any) => d.invoiceCount),
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                borderColor: 'rgb(16, 185, 129)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgb(16, 185, 129)',
                pointRadius: 4,
                pointHoverRadius: 7,
                yAxisID: 'y1',
            }
        ],
    }), [daily])

    const profitChartData = useMemo(() => ({
        labels: daily.map((d: any) => {
            const dt = new Date(d.date)
            return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        }),
        datasets: [
            {
                label: 'Daily Profit',
                data: daily.map((d: any) => d.profit || 0),
                backgroundColor: 'rgba(236, 72, 153, 0.15)',
                borderColor: 'rgb(236, 72, 153)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgb(236, 72, 153)',
                pointRadius: 4,
                pointHoverRadius: 7,
            }
        ],
    }), [daily])

    const productChartData = useMemo(() => ({
        labels: topP.map((p: any) => p.name?.slice(0, 20)),
        datasets: [{
            label: 'Units Sold',
            data: topP.map((p: any) => p.totalQty),
            backgroundColor: [
                'rgba(99, 102, 241, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)',
                'rgba(239, 68, 68, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(14, 165, 233, 0.8)',
                'rgba(249, 115, 22, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(34, 197, 94, 0.8)',
                'rgba(168, 85, 247, 0.8)',
            ],
            borderRadius: 8,
            borderSkipped: false,
        }],
    }), [topP])

    const paymentChartData = useMemo(() => ({
        labels: ['Cash', 'Online'],
        datasets: [{
            data: [ps.cash.total, ps.online.total],
            backgroundColor: ['rgba(16, 185, 129, 0.85)', 'rgba(99, 102, 241, 0.85)'],
            borderColor: ['rgb(16, 185, 129)', 'rgb(99, 102, 241)'],
            borderWidth: 3,
            hoverOffset: 12,
        }],
    }), [ps])

    const handleCsvExport = () => {
        let csv = 'Section,Field,Value\n'

        csv += `Revenue Summary,Total Revenue,${rev.totalRevenue || 0}\n`
        csv += `Revenue Summary,Total Profit (Selected Period),${rev.totalProfit || 0}\n`
        csv += `Revenue Summary,Total Profit (Lifetime),${rev.lifetimeProfit || 0}\n`
        csv += `Revenue Summary,Total Invoices,${rev.totalInvoices || 0}\n`
        csv += `Revenue Summary,Avg Order Value,${rev.avgOrderValue || 0}\n`
        csv += `Revenue Summary,GST Collected,${rev.totalGst || 0}\n`

        csv += '\nDate,Revenue,Profit,Invoice Count\n'
        daily.forEach((d: any) => { csv += `${d.date},${d.revenue},${d.profit || 0},${d.invoiceCount}\n` })

        csv += '\nProduct,Qty Sold,Revenue,Returned\n'
        topP.forEach((p: any) => { csv += `"${p.name}",${p.totalQty},${p.totalRevenue},${p.returnedQty}\n` })

        csv += '\nCustomer,Phone,Total Spent,Orders\n'
        topC.forEach((c: any) => { csv += `"${c.name}","${c.phone}",${c.totalSpent},${c.orderCount}\n` })

        csv += `\nPayment,Cash Total,${ps.cash.total}\n`
        csv += `Payment,Online Total,${ps.online.total}\n`

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `billing-report-${startDate}-to-${endDate}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    const kpis = [
        { label: 'Total Revenue', value: fmt(rev.totalRevenue), icon: 'pi pi-indian-rupee', color: 'from-emerald-500 to-teal-600', lightColor: 'bg-emerald-50 text-emerald-600' },
        { label: 'Total Invoices', value: rev.totalInvoices || 0, icon: 'pi pi-file', color: 'from-blue-500 to-indigo-600', lightColor: 'bg-blue-50 text-blue-600' },
        { label: 'Avg Order Value', value: fmt(rev.avgOrderValue), icon: 'pi pi-chart-line', color: 'from-violet-500 to-purple-600', lightColor: 'bg-violet-50 text-violet-600' },
        { label: 'GST Collected', value: fmt(rev.totalGst), icon: 'pi pi-percentage', color: 'from-amber-500 to-orange-600', lightColor: 'bg-amber-50 text-amber-600' },
    ]

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8 bg-gray-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 tracking-tight">Jattkart</h1>
                    <p className="text-gray-500 mt-1">The best you got for all your groceries — Reports & Analytics</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white shadow-sm border border-gray-200 rounded-xl px-4 py-2.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">From</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border-none bg-transparent outline-none text-sm font-semibold text-gray-800 cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-2 bg-white shadow-sm border border-gray-200 rounded-xl px-4 py-2.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">To</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border-none bg-transparent outline-none text-sm font-semibold text-gray-800 cursor-pointer" />
                    </div>
                    <Button label="Export CSV" icon="pi pi-download" severity="secondary" outlined className="rounded-xl h-11 font-bold" onClick={handleCsvExport} disabled={!data} />
                </div>
            </div>

            {/* Loading */}
            {(isLoading || isFetching) && (
                <div className="text-center py-16">
                    <i className="pi pi-spin pi-spinner text-5xl text-indigo-500 mb-4"></i>
                    <p className="font-semibold text-gray-500 text-lg">Crunching your numbers...</p>
                </div>
            )}

            {!isLoading && data && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {kpis.map((kpi, i) => (
                            <div key={i} className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{kpi.label}</p>
                                        <h3 className="text-3xl font-black text-gray-900 tracking-tight">{kpi.value}</h3>
                                    </div>
                                    <div className={`p-3 rounded-xl ${kpi.lightColor}`}>
                                        <i className={`${kpi.icon} text-2xl`}></i>
                                    </div>
                                </div>
                                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.color}`}></div>
                            </div>
                        ))}
                    </div>

                    {/* Profit Analysis Section (Different Section as requested) */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <i className="pi pi-chart-pie text-fuchsia-600"></i> Profit Analysis
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">Overall profit generation over the selected period</p>
                            </div>
                            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-6">
                                <div className="text-center sm:text-left">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Profit (Selected)</p>
                                    <p className="text-2xl font-black text-emerald-600">{fmt(rev.totalProfit)}</p>
                                </div>
                                <div className="hidden sm:block w-px h-8 bg-gray-200"></div>
                                <div className="text-center sm:text-left">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Profit (Lifetime)</p>
                                    <p className="text-2xl font-black text-fuchsia-600">{fmt(rev.lifetimeProfit)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="h-72">
                                {daily.length > 0 ? (
                                    <Line data={profitChartData} options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            y: { beginAtZero: true, title: { display: true, text: 'Profit (₹)', font: { weight: 'bold' as const } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                                            x: { grid: { display: false } }
                                        },
                                    }} />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400"><i className="pi pi-chart-line text-4xl mr-3"></i> No profit data for this period</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Daily Trend (large) */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-800 mb-1">Daily Sales Trend</h2>
                            <p className="text-xs text-gray-400 mb-4">Revenue and invoice count over the selected period</p>
                            <div className="h-80">
                                {daily.length > 0 ? (
                                    <Line data={dailyChartData} options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'top', labels: { usePointStyle: true, padding: 20, font: { weight: 'bold' as const } } } },
                                        scales: {
                                            y: { beginAtZero: true, title: { display: true, text: 'Revenue (₹)', font: { weight: 'bold' as const } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                                            y1: { beginAtZero: true, position: 'right' as const, title: { display: true, text: 'Invoices', font: { weight: 'bold' as const } }, grid: { drawOnChartArea: false } },
                                            x: { grid: { display: false } }
                                        },
                                    }} />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400"><i className="pi pi-chart-line text-4xl mr-3"></i> No data for this period</div>
                                )}
                            </div>
                        </div>

                        {/* Payment Split (small) */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                            <h2 className="text-lg font-bold text-gray-800 mb-1">Payment Mode Split</h2>
                            <p className="text-xs text-gray-400 mb-4">Cash vs Online breakdown</p>
                            <div className="flex-1 flex items-center justify-center" style={{ minHeight: 200 }}>
                                {(ps.cash.total > 0 || ps.online.total > 0) ? (
                                    <Doughnut data={paymentChartData} options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        cutout: '65%',
                                        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, font: { weight: 'bold' as const, size: 13 } } } }
                                    }} />
                                ) : (
                                    <div className="text-gray-400 text-center"><i className="pi pi-chart-pie text-4xl mb-2"></i><p>No payment data</p></div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
                                <div className="text-center">
                                    <p className="text-xs text-gray-400 font-bold uppercase">Cash</p>
                                    <p className="text-lg font-black text-emerald-600">{fmt(ps.cash.total)}</p>
                                    <p className="text-[10px] text-gray-400">{ps.cash.count} orders</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-400 font-bold uppercase">Online</p>
                                    <p className="text-lg font-black text-indigo-600">{fmt(ps.online.total)}</p>
                                    <p className="text-[10px] text-gray-400">{ps.online.count} orders</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Products Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Products Chart */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-800 mb-1">Top Selling Products</h2>
                            <p className="text-xs text-gray-400 mb-4">By units sold</p>
                            <div className="h-80">
                                {topP.length > 0 ? (
                                    <Bar data={productChartData} options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        indexAxis: 'y' as const,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, title: { display: true, text: 'Units', font: { weight: 'bold' as const } } },
                                            y: { grid: { display: false }, ticks: { font: { weight: 'bold' as const, size: 11 } } }
                                        },
                                    }} />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">No product data</div>
                                )}
                            </div>
                        </div>

                        {/* Top Products + Revenue Table */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-800 mb-1">Product Revenue Breakdown</h2>
                            <p className="text-xs text-gray-400 mb-4">Top 10 products by volume</p>
                            <div className="overflow-auto max-h-80">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="text-left p-3 font-bold text-gray-600 text-xs uppercase tracking-wider">#</th>
                                            <th className="text-left p-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Product</th>
                                            <th className="text-right p-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Qty</th>
                                            <th className="text-right p-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Revenue</th>
                                            <th className="text-right p-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Rtn</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topP.map((p: any, i: number) => (
                                            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                                                <td className="p-3 text-gray-400 font-bold">{i + 1}</td>
                                                <td className="p-3 font-semibold text-gray-800">{p.name}</td>
                                                <td className="p-3 text-right font-bold text-gray-700">{p.totalQty}</td>
                                                <td className="p-3 text-right font-bold text-emerald-600">{fmt(p.totalRevenue)}</td>
                                                <td className="p-3 text-right text-red-500 font-bold">{p.returnedQty || 0}</td>
                                            </tr>
                                        ))}
                                        {topP.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-400">No products sold in this period</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Top Customers */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-1">Top Customers</h2>
                        <p className="text-xs text-gray-400 mb-4">Ranked by total spending in the selected period</p>
                        <div className="overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left p-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Rank</th>
                                        <th className="text-left p-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Customer</th>
                                        <th className="text-left p-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Phone</th>
                                        <th className="text-right p-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Orders</th>
                                        <th className="text-right p-3 font-bold text-gray-600 text-xs uppercase tracking-wider">Total Spent</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topC.map((c: any, i: number) => (
                                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-3">
                                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {i + 1}
                                                </span>
                                            </td>
                                            <td className="p-3 font-bold text-gray-800">{c.name || 'Walk-in'}</td>
                                            <td className="p-3 text-gray-500 font-mono text-xs">{c.phone || '—'}</td>
                                            <td className="p-3 text-right font-bold text-gray-700">{c.orderCount}</td>
                                            <td className="p-3 text-right font-black text-emerald-600 text-base">{fmt(c.totalSpent)}</td>
                                        </tr>
                                    ))}
                                    {topC.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-400">No customer data in this period</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default BillingReportsPage
