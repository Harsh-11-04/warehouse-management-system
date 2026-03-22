import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from 'primereact/button'
import { InputText } from 'primereact/inputtext'
import {
    useGetCloudSyncAuditRecordsQuery,
    useGetCloudSyncAuditSummaryQuery,
} from '../../provider/queries/CloudSyncAudit.query'

const STATUS_COLORS: Record<string, string> = {
    received: 'bg-blue-50 text-blue-700',
    processed: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-red-50 text-red-700',
    duplicate: 'bg-amber-50 text-amber-700',
    ignored: 'bg-slate-100 text-slate-600',
    dead_letter: 'bg-orange-50 text-orange-700',
}

const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleString('en-IN') : '-'

const SyncAuditViewerPage = () => {
    const navigate = useNavigate()
    const [page, setPage] = useState(1)
    const [statusFilter, setStatusFilter] = useState('')
    const [entityTypeFilter, setEntityTypeFilter] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const { data: auditData, isLoading, refetch } = useGetCloudSyncAuditRecordsQuery({
        page,
        limit: 30,
        status: statusFilter || undefined,
        entityType: entityTypeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
    })
    const { data: summaryData } = useGetCloudSyncAuditSummaryQuery()

    const records = auditData?.records ?? []
    const total = auditData?.total ?? 0
    const totalPages = auditData?.totalPages ?? 1
    const summary = summaryData?.summary ?? { received: 0, processed: 0, failed: 0, duplicate: 0, ignored: 0 }

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(1)
        refetch()
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">
                        Sync Audit Log
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Cloud-side event ingestion history and status tracking
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        label="Dashboard"
                        icon="pi pi-arrow-left"
                        text
                        onClick={() => navigate('/billing')}
                    />
                    <Button
                        label="Refresh"
                        icon="pi pi-refresh"
                        outlined
                        onClick={() => refetch()}
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(summary).map(([key, count]) => (
                    <div
                        key={key}
                        className={`rounded-xl p-4 cursor-pointer transition-all ${
                            statusFilter === key ? 'ring-2 ring-indigo-400' : ''
                        } ${STATUS_COLORS[key] || 'bg-slate-50 text-slate-700'}`}
                        onClick={() => {
                            setStatusFilter(statusFilter === key ? '' : key)
                            setPage(1)
                        }}
                    >
                        <div className="text-xs uppercase tracking-wide font-semibold">{key}</div>
                        <div className="text-2xl font-black mt-2">{count}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <form onSubmit={handleFilter} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Entity Type</label>
                    <select
                        value={entityTypeFilter}
                        onChange={(e) => { setEntityTypeFilter(e.target.value); setPage(1) }}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-44"
                    >
                        <option value="">All Types</option>
                        <option value="sale">Sale</option>
                        <option value="product">Product</option>
                        <option value="customer">Customer</option>
                        <option value="inventory_movement">Inventory</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <InputText
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-40"
                    />
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <InputText
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-40"
                    />
                </div>
                <Button label="Filter" icon="pi pi-filter" type="submit" size="small" />
                <Button
                    label="Clear"
                    text
                    size="small"
                    onClick={() => {
                        setStatusFilter('')
                        setEntityTypeFilter('')
                        setStartDate('')
                        setEndDate('')
                        setPage(1)
                    }}
                />
            </form>

            {/* Records Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
                    <span>Page {page} of {totalPages} - {total} total records</span>
                    <div className="flex gap-1">
                        {page > 1 && (
                            <Button icon="pi pi-chevron-left" rounded size="small" text onClick={() => setPage(page - 1)} />
                        )}
                        {page < totalPages && (
                            <Button icon="pi pi-chevron-right" rounded size="small" text onClick={() => setPage(page + 1)} />
                        )}
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-8 text-gray-400">Loading audit records...</div>
                ) : (
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="text-left p-3 font-semibold">Event ID</th>
                                    <th className="text-left p-3 font-semibold">Entity</th>
                                    <th className="text-left p-3 font-semibold">Operation</th>
                                    <th className="text-left p-3 font-semibold">Status</th>
                                    <th className="text-left p-3 font-semibold">Received</th>
                                    <th className="text-left p-3 font-semibold">Processed</th>
                                    <th className="text-left p-3 font-semibold">Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.length ? records.map((record) => (
                                    <tr key={record._id} className="border-t border-gray-100 hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-mono text-xs text-gray-600 max-w-[160px] truncate" title={record.eventId}>
                                            {record.eventId}
                                        </td>
                                        <td className="p-3">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                {record.entityType}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-700">{record.operation}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[record.status] || 'bg-slate-100 text-slate-600'}`}>
                                                {record.status}
                                            </span>
                                            {record.duplicateCount > 0 && (
                                                <span className="ml-1 text-xs text-gray-400">({record.duplicateCount}x)</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-xs text-gray-500">{formatDate(record.receivedAt)}</td>
                                        <td className="p-3 text-xs text-gray-500">{formatDate(record.processedAt)}</td>
                                        <td className="p-3 text-xs text-red-600 max-w-[200px] truncate" title={record.error || ''}>
                                            {record.error || '-'}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={7} className="p-6 text-center text-gray-400">No audit records found.</td>
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

export default SyncAuditViewerPage
