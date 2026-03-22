import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { toast } from 'sonner'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { useGetAllBillingInvoicesQuery, useGetBillingDashboardStatsQuery } from '../../provider/queries/BillingInvoice.query'
import {
    useGetCloudAnalyticsOverviewQuery,
    useGetCloudBestSellersQuery,
    useGetCloudDailyRevenueQuery,
    useGetCloudInventoryAlertsQuery,
    useGetCloudMonthlyRevenueQuery,
} from '../../provider/queries/CloudAnalytics.query'
import {
    useGetSyncStatusQuery,
    usePullCatalogMutation,
    useRetryFailedSyncMutation,
    useRunSyncOnceMutation,
} from '../../provider/queries/Sync.query'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

type LocalPeriodStat = {
    label: string
    cash: number
    online: number
    cashCount: number
    onlineCount: number
}

type LocalInvoice = {
    _id: string
    invoiceNumber: string
    createdAt: string
    customerName: string
    customerPhone?: string
    billedBy?: string
    paymentMode: string
    paymentStatus: string
    grandTotal: number
}

type LocalInvoicesResponse = {
    invoices: LocalInvoice[]
    total: number
    page: number
    totalPages: number
}

type LocalDashboardResponse = {
    stats: LocalPeriodStat[]
    totalInvoices: number
}

const EMPTY_LOCAL_STATS: LocalPeriodStat[] = []
const EMPTY_INVOICES: LocalInvoice[] = []
const EMPTY_DAILY_ROWS: { date: string; revenue: number; taxTotal: number; discountTotal: number; salesCount: number }[] = []
const EMPTY_MONTHLY_ROWS: { month: string; revenue: number; taxTotal: number; discountTotal: number; salesCount: number }[] = []
const EMPTY_BEST_SELLERS: {
    externalProductId: string
    name: string
    barcode: string
    totalQuantity: number
    totalRevenue: number
    totalTax: number
    currentOnHand: number | null
    reorderLevel: number | null
    category: string
    currentSellingPrice: number | null
}[] = []
const EMPTY_INVENTORY_ALERTS: {
    externalProductId: string
    name: string
    barcode: string
    category: string
    active: boolean
    onHand: number
    reorderLevel: number
    shortage: number
    lastMovementAt: string | null
    updatedAt: string
}[] = []

const formatCurrency = (value: number) =>
    `Rs ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const formatShortDate = (value: string) =>
    new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

const formatMonthLabel = (value: string) =>
    new Date(`${value}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

const formatDateTime = (value: string | null) =>
    value ? new Date(value).toLocaleString('en-IN') : 'Waiting for first cloud sync'

const BillingDashboardPage = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [search, setSearch] = useState(searchParams.get('query') || '')
    const [startDate, setStartDate] = useState(searchParams.get('startDate') || '')
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')

    const page = Number(searchParams.get('page')) || 1
    const query = searchParams.get('query') || ''
    const sd = searchParams.get('startDate') || ''
    const ed = searchParams.get('endDate') || ''

    const { data: localStatsRaw } = useGetBillingDashboardStatsQuery()
    const { data: invoicesRaw, isLoading: invoicesLoading } = useGetAllBillingInvoicesQuery({
        page,
        query,
        startDate: sd,
        endDate: ed,
        limit: 15
    })

    const {
        data: overview,
        isFetching: isOverviewFetching,
        error: overviewError,
        refetch: refetchOverview,
    } = useGetCloudAnalyticsOverviewQuery()
    const {
        data: dailyRevenue,
        isFetching: isDailyFetching,
        error: dailyError,
        refetch: refetchDailyRevenue,
    } = useGetCloudDailyRevenueQuery({ days: 14 })
    const {
        data: monthlyRevenue,
        isFetching: isMonthlyFetching,
        error: monthlyError,
        refetch: refetchMonthlyRevenue,
    } = useGetCloudMonthlyRevenueQuery({ months: 6 })
    const {
        data: bestSellers,
        isFetching: isBestSellersFetching,
        error: bestSellersError,
        refetch: refetchBestSellers,
    } = useGetCloudBestSellersQuery({ days: 30, limit: 8 })
    const {
        data: inventoryAlerts,
        isFetching: isInventoryAlertsFetching,
        error: inventoryAlertsError,
        refetch: refetchInventoryAlerts,
    } = useGetCloudInventoryAlertsQuery({ limit: 8 })
    const {
        data: syncStatus,
        refetch: refetchSyncStatus,
    } = useGetSyncStatusQuery()
    const [pullCatalog, { isLoading: isPullingCatalog }] = usePullCatalogMutation()
    const [runSyncOnce, { isLoading: isRunningSync }] = useRunSyncOnceMutation()
    const [retryFailedSync, { isLoading: isRetryingFailed }] = useRetryFailedSyncMutation()

    const localStatsData = localStatsRaw as LocalDashboardResponse | undefined
    const invoiceData = invoicesRaw as LocalInvoicesResponse | undefined

    const localStats = localStatsData?.stats ?? EMPTY_LOCAL_STATS
    const invoices = invoiceData?.invoices ?? EMPTY_INVOICES
    const totalInvoices = localStatsData?.totalInvoices ?? 0
    const dailyRows = dailyRevenue?.rows ?? EMPTY_DAILY_ROWS
    const monthlyRows = monthlyRevenue?.rows ?? EMPTY_MONTHLY_ROWS
    const bestSellerRows = bestSellers?.rows ?? EMPTY_BEST_SELLERS
    const inventoryAlertRows = inventoryAlerts?.rows ?? EMPTY_INVENTORY_ALERTS

    const cloudLoading = isOverviewFetching || isDailyFetching || isMonthlyFetching || isBestSellersFetching || isInventoryAlertsFetching
    const cloudError = Boolean(overviewError || dailyError || monthlyError || bestSellersError || inventoryAlertsError)
    const hasCloudData = Boolean(
        (overview?.lifetime.salesCount ?? 0) > 0
        || dailyRows.length
        || monthlyRows.length
        || bestSellerRows.length
        || inventoryAlertRows.length
    )

    const onFilter = (event: React.FormEvent) => {
        event.preventDefault()
        const params = new URLSearchParams()
        if (search) params.set('query', search)
        if (startDate) params.set('startDate', startDate)
        if (endDate) params.set('endDate', endDate)
        params.set('page', '1')
        navigate(`/billing?${params.toString()}`)
    }

    const goToPage = (targetPage: number) => {
        const params = new URLSearchParams()
        if (query) params.set('query', query)
        if (sd) params.set('startDate', sd)
        if (ed) params.set('endDate', ed)
        params.set('page', String(targetPage))
        navigate(`/billing?${params.toString()}`)
    }

    const refreshCloudDashboard = async () => {
        await Promise.all([
            refetchOverview(),
            refetchDailyRevenue(),
            refetchMonthlyRevenue(),
            refetchBestSellers(),
            refetchInventoryAlerts(),
            refetchSyncStatus(),
        ])
    }

    const handlePullCatalog = async () => {
        try {
            const result = await pullCatalog({ limit: 200 }).unwrap()

            if (!result.ok) {
                toast.error(result.error || result.reason || 'Catalog pull failed')
                return
            }

            toast.success(
                `Catalog refreshed: ${result.appliedCount || 0} product(s), ${result.stockUpdatedCount || 0} stock update(s)`
            )
            await refreshCloudDashboard()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Catalog pull failed')
        }
    }

    const handleRunSync = async () => {
        try {
            const result = await runSyncOnce({ limit: 50 }).unwrap()

            if (!result.ok && !result.skipped) {
                toast.error(result.error || 'Sync failed')
            } else if (result.skipped) {
                toast.message(result.reason || 'Sync skipped')
            } else {
                toast.success(`Sync complete: ${result.synced || 0} event(s) pushed`)
            }

            await refreshCloudDashboard()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Sync failed')
        }
    }

    const handleRetryFailed = async () => {
        try {
            const result = await retryFailedSync({ limit: 100 }).unwrap()
            toast.success(`Requeued ${result.requeued || 0} failed event(s)`)
            await refetchSyncStatus()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Retry failed')
        }
    }

    const cloudCards = [
        {
            label: 'Today Revenue',
            value: formatCurrency(overview?.today.revenue ?? 0),
            meta: `${overview?.today.salesCount ?? 0} synced sale(s)`,
            icon: 'pi pi-sparkles',
            tone: 'from-emerald-500 to-teal-600',
        },
        {
            label: 'This Month',
            value: formatCurrency(overview?.thisMonth.revenue ?? 0),
            meta: `${overview?.thisMonth.salesCount ?? 0} synced sale(s)`,
            icon: 'pi pi-calendar',
            tone: 'from-blue-500 to-cyan-600',
        },
        {
            label: 'Lifetime Revenue',
            value: formatCurrency(overview?.lifetime.revenue ?? 0),
            meta: `${overview?.lifetime.salesCount ?? 0} synced sale(s)`,
            icon: 'pi pi-chart-line',
            tone: 'from-violet-500 to-fuchsia-600',
        },
        {
            label: 'Inventory Alerts',
            value: String(overview?.inventory.lowStockCount ?? 0),
            meta: 'Products at or below reorder level',
            icon: 'pi pi-exclamation-triangle',
            tone: 'from-amber-500 to-orange-600',
        },
    ]

    const dailyChartData = useMemo(() => ({
        labels: dailyRows.map((row) => formatShortDate(row.date)),
        datasets: [
            {
                label: 'Daily Revenue',
                data: dailyRows.map((row) => row.revenue),
                borderColor: 'rgb(14, 165, 233)',
                backgroundColor: 'rgba(14, 165, 233, 0.14)',
                fill: true,
                tension: 0.35,
                borderWidth: 3,
                pointRadius: 3,
                pointHoverRadius: 5,
            }
        ]
    }), [dailyRows])

    const monthlyChartData = useMemo(() => ({
        labels: monthlyRows.map((row) => formatMonthLabel(row.month)),
        datasets: [
            {
                label: 'Monthly Revenue',
                data: monthlyRows.map((row) => row.revenue),
                backgroundColor: [
                    'rgba(99, 102, 241, 0.85)',
                    'rgba(59, 130, 246, 0.85)',
                    'rgba(16, 185, 129, 0.85)',
                    'rgba(245, 158, 11, 0.85)',
                    'rgba(244, 63, 94, 0.85)',
                    'rgba(168, 85, 247, 0.85)',
                ],
                borderRadius: 12,
                borderSkipped: false,
            }
        ]
    }), [monthlyRows])

    const cardColors = [
        'from-slate-700 to-slate-800',
        'from-blue-600 to-indigo-700',
        'from-emerald-600 to-teal-700',
        'from-fuchsia-600 to-violet-700',
        'from-orange-500 to-amber-600',
        'from-cyan-600 to-sky-700',
    ]

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">
                        {overview?.shop.name || 'Billing Command Center'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Cloud overview, synced trends, and live counter activity in one place.
                    </p>
                    {overview?.shop.code && (
                        <p className="text-xs text-gray-500 mt-2">
                            Shop code: <span className="font-semibold tracking-[0.18em]">{overview.shop.code}</span>
                        </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                        Last cloud sync: {formatDateTime(overview?.lastCloudSyncAt ?? null)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        label={isPullingCatalog ? 'Refreshing...' : 'Pull Catalog'}
                        icon="pi pi-refresh"
                        outlined
                        loading={isPullingCatalog}
                        onClick={handlePullCatalog}
                    />
                    <Button
                        label={isRunningSync ? 'Syncing...' : 'Sync Now'}
                        icon="pi pi-cloud-upload"
                        outlined
                        loading={isRunningSync}
                        onClick={handleRunSync}
                    />
                    <Button
                        label="Billing Reports"
                        icon="pi pi-chart-bar"
                        outlined
                        onClick={() => navigate('/billing/reports')}
                    />
                    <Button
                        label="New Invoice"
                        icon="pi pi-plus"
                        severity="success"
                        onClick={() => navigate('/billing/new-invoice')}
                    />
                </div>
            </div>

            {cloudError && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900">
                    <div className="font-semibold">Cloud analytics are not available right now.</div>
                    <div className="text-sm mt-1">
                        Local billing is still working. This usually means the sync worker has not pushed data yet or the cloud endpoint is not fully configured.
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {cloudCards.map((card) => (
                    <div key={card.label} className={`rounded-2xl p-5 text-white bg-gradient-to-br ${card.tone} shadow-sm`}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.2em] text-white/75">{card.label}</p>
                                <h2 className="text-2xl font-black mt-3">{card.value}</h2>
                                <p className="text-xs text-white/80 mt-2">{card.meta}</p>
                            </div>
                            <i className={`${card.icon} text-2xl text-white/85`}></i>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Sync Health</h2>
                        <p className="text-sm text-gray-500">Queue status for offline-first push and catalog pull.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${syncStatus?.syncState.isOnline === false
                            ? 'bg-red-50 text-red-700'
                            : 'bg-emerald-50 text-emerald-700'
                            }`}>
                            {syncStatus?.syncState.isOnline === false ? 'Offline' : 'Online'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${syncStatus?.syncState.workerStatus === 'error'
                            ? 'bg-red-50 text-red-700'
                            : syncStatus?.syncState.workerStatus === 'running'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                            Worker: {syncStatus?.syncState.workerStatus || 'idle'}
                        </span>
                        <Button
                            label={isRetryingFailed ? 'Retrying...' : 'Retry Failed'}
                            icon="pi pi-replay"
                            text
                            loading={isRetryingFailed}
                            onClick={handleRetryFailed}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                    <div className="rounded-xl bg-slate-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Pending</div>
                        <div className="text-2xl font-black text-slate-900 mt-2">{syncStatus?.summary.pending || 0}</div>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-blue-600">Processing</div>
                        <div className="text-2xl font-black text-blue-800 mt-2">{syncStatus?.summary.processing || 0}</div>
                    </div>
                    <div className="rounded-xl bg-red-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-red-600">Failed</div>
                        <div className="text-2xl font-black text-red-800 mt-2">{syncStatus?.summary.failed || 0}</div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-emerald-600">Synced</div>
                        <div className="text-2xl font-black text-emerald-800 mt-2">{syncStatus?.summary.synced || 0}</div>
                    </div>
                    <div className="rounded-xl bg-orange-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-orange-600">Dead Letter</div>
                        <div className="text-2xl font-black text-orange-800 mt-2">{syncStatus?.summary.dead_letter || 0}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                    <div className="rounded-xl border border-gray-100 p-4">
                        <div className="text-xs uppercase tracking-wide text-gray-400">Last Push Success</div>
                        <div className="font-medium text-gray-800 mt-2">
                            {formatDateTime(syncStatus?.syncState.lastPushSuccessAt || null)}
                        </div>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-4">
                        <div className="text-xs uppercase tracking-wide text-gray-400">Last Pull Success</div>
                        <div className="font-medium text-gray-800 mt-2">
                            {formatDateTime(syncStatus?.syncState.lastPullSuccessAt || null)}
                        </div>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-4">
                        <div className="text-xs uppercase tracking-wide text-gray-400">Latest Error</div>
                        <div className="font-medium text-gray-800 mt-2 break-words">
                            {syncStatus?.syncState.lastError || 'No sync errors'}
                        </div>
                    </div>
                </div>
            </div>

            {cloudLoading && !hasCloudData && !cloudError && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-500">
                    <i className="pi pi-spin pi-spinner text-3xl mb-3"></i>
                    <p className="font-semibold">Loading synced analytics...</p>
                </div>
            )}

            {!cloudLoading && !cloudError && !hasCloudData && (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm p-10 text-center">
                    <div className="text-lg font-semibold text-gray-800">No synced cloud data yet</div>
                    <p className="text-sm text-gray-500 mt-2">
                        Bills are still being saved locally. Once the background sync worker pushes records, this dashboard will populate automatically.
                    </p>
                </div>
            )}

            {hasCloudData && (
                <>
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Daily Synced Revenue</h2>
                                    <p className="text-sm text-gray-500">Last 14 days based on cloud-synced sales</p>
                                </div>
                                <span className="text-xs px-3 py-1 rounded-full bg-sky-50 text-sky-700 font-medium">
                                    {dailyRevenue?.days ?? 14} day window
                                </span>
                            </div>
                            <div className="h-80">
                                {dailyRows.length ? (
                                    <Line
                                        data={dailyChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { display: false }
                                            },
                                            scales: {
                                                x: { grid: { display: false } },
                                                y: {
                                                    beginAtZero: true,
                                                    grid: { color: 'rgba(0,0,0,0.05)' }
                                                }
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">No daily revenue data yet.</div>
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Monthly Revenue</h2>
                                    <p className="text-sm text-gray-500">Recent cloud billing performance</p>
                                </div>
                                <span className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                                    {monthlyRevenue?.months ?? 6} months
                                </span>
                            </div>
                            <div className="h-80">
                                {monthlyRows.length ? (
                                    <Bar
                                        data={monthlyChartData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { display: false }
                                            },
                                            scales: {
                                                x: { grid: { display: false } },
                                                y: {
                                                    beginAtZero: true,
                                                    grid: { color: 'rgba(0,0,0,0.05)' }
                                                }
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">No monthly revenue data yet.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Best Sellers</h2>
                                    <p className="text-sm text-gray-500">Top synced products over the last 30 days</p>
                                </div>
                                <Button
                                    label="Products"
                                    text
                                    onClick={() => navigate('/billing/products')}
                                />
                            </div>
                            <div className="overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-600">
                                        <tr>
                                            <th className="text-left p-3 font-semibold">Product</th>
                                            <th className="text-right p-3 font-semibold">Qty</th>
                                            <th className="text-right p-3 font-semibold">Revenue</th>
                                            <th className="text-right p-3 font-semibold">On Hand</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bestSellerRows.length ? bestSellerRows.map((item) => (
                                            <tr key={item.externalProductId || item.name} className="border-t border-gray-100">
                                                <td className="p-3">
                                                    <div className="font-semibold text-gray-900">{item.name}</div>
                                                    <div className="text-xs text-gray-400">
                                                        {item.category || 'Uncategorized'}{item.barcode ? ` - ${item.barcode}` : ''}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right font-semibold">{item.totalQuantity}</td>
                                                <td className="p-3 text-right font-semibold text-emerald-700">{formatCurrency(item.totalRevenue)}</td>
                                                <td className="p-3 text-right">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.currentOnHand !== null && item.reorderLevel !== null && item.currentOnHand <= item.reorderLevel
                                                        ? 'bg-amber-50 text-amber-700'
                                                        : 'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {item.currentOnHand ?? 'NA'}
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="p-6 text-center text-gray-400">No synced product sales yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Inventory Alerts</h2>
                                    <p className="text-sm text-gray-500">Cloud-side low stock watchlist</p>
                                </div>
                                <Button
                                    label="Stock"
                                    text
                                    onClick={() => navigate('/billing/stock')}
                                />
                            </div>
                            <div className="space-y-3">
                                {inventoryAlertRows.length ? inventoryAlertRows.map((item) => (
                                    <div key={item.externalProductId || item.name} className="border border-gray-100 rounded-xl p-4 flex items-start justify-between gap-4">
                                        <div>
                                            <div className="font-semibold text-gray-900">{item.name}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {item.category || 'Uncategorized'}{item.barcode ? ` - ${item.barcode}` : ''}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-2">
                                                Last movement: {item.lastMovementAt ? new Date(item.lastMovementAt).toLocaleString('en-IN') : 'Not available'}
                                            </div>
                                        </div>
                                        <div className="text-right min-w-[120px]">
                                            <div className="text-xs uppercase tracking-wide text-gray-400">On Hand</div>
                                            <div className="text-2xl font-black text-amber-600">{item.onHand}</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Reorder at {item.reorderLevel}
                                            </div>
                                            <div className="text-xs font-medium text-red-500 mt-1">
                                                Short by {Math.max(item.shortage, 0)}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-sm text-gray-400 py-8 text-center">No low-stock alerts in synced inventory.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {localStats.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Counter Snapshot</h2>
                            <p className="text-sm text-gray-500">Local billing trends from the POS side</p>
                        </div>
                        <span className="text-xs text-gray-400">Total local invoices: {totalInvoices}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {localStats.map((stat, index) => (
                            <div
                                key={stat.label}
                                className={`bg-gradient-to-br ${cardColors[index % cardColors.length]} rounded-2xl p-4 text-white`}
                            >
                                <div className="text-xs uppercase tracking-[0.2em] text-white/70">{stat.label}</div>
                                <div className="mt-4 space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white/75">Cash</span>
                                        <span className="font-semibold">{formatCurrency(stat.cash)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-white/75">Online</span>
                                        <span className="font-semibold">{formatCurrency(stat.online)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-white/15 text-xs text-white/70">
                                        {stat.cashCount + stat.onlineCount} invoice(s)
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <form onSubmit={onFilter} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Search invoice or customer</label>
                    <InputText
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search invoices"
                        className="w-64"
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <InputText
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                        className="w-40"
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <InputText
                        type="date"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        className="w-40"
                    />
                </div>
                <Button label="Filter" icon="pi pi-filter" type="submit" />
            </form>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
                    <span>Page {page} - {invoiceData?.total || 0} invoice(s)</span>
                    <div className="flex gap-1">
                        {page > 1 && (
                            <Button icon="pi pi-chevron-left" rounded size="small" text onClick={() => goToPage(page - 1)} />
                        )}
                        {invoiceData && page < invoiceData.totalPages && (
                            <Button icon="pi pi-chevron-right" rounded size="small" text onClick={() => goToPage(page + 1)} />
                        )}
                    </div>
                </div>

                {invoicesLoading ? (
                    <div className="text-center py-8 text-gray-400">Loading invoices...</div>
                ) : (
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="text-left p-3 font-medium">Invoice Number</th>
                                    <th className="text-left p-3 font-medium">Date</th>
                                    <th className="text-left p-3 font-medium">Customer</th>
                                    <th className="text-left p-3 font-medium">Billed By</th>
                                    <th className="text-left p-3 font-medium">Payment</th>
                                    <th className="text-right p-3 font-medium">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.length ? invoices.map((invoice) => (
                                    <tr key={invoice._id} className="border-t border-gray-100 hover:bg-slate-50 transition-colors">
                                        <td className="p-3">
                                            <Link to={`/billing/invoice/${invoice._id}`} className="text-blue-600 font-medium hover:underline">
                                                {invoice.invoiceNumber}
                                            </Link>
                                        </td>
                                        <td className="p-3 text-gray-500">{new Date(invoice.createdAt).toLocaleString('en-IN')}</td>
                                        <td className="p-3">
                                            <div>{invoice.customerName || 'Walk-in'}</div>
                                            {invoice.customerPhone && <div className="text-xs text-gray-400">{invoice.customerPhone}</div>}
                                        </td>
                                        <td className="p-3 text-gray-500">{invoice.billedBy || '-'}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${invoice.paymentMode === 'Cash'
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-blue-50 text-blue-700'
                                                }`}>
                                                {invoice.paymentMode}
                                            </span>
                                            {invoice.paymentStatus === 'Unpaid' && (
                                                <span className="ml-1 px-2 py-1 rounded-full text-xs bg-red-50 text-red-600">Unpaid</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right font-semibold">{formatCurrency(invoice.grandTotal)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="p-6 text-center text-gray-400">No invoices found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default BillingDashboardPage
