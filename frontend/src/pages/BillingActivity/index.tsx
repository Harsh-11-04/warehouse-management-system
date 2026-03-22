import { useState } from 'react'
import { Dropdown } from 'primereact/dropdown'
import { Button } from 'primereact/button'
import { useGetActivityLogsQuery } from '../../provider/queries/ActivityLog.query'

const entityOptions = [
  { label: 'All Billing Activity', value: '' },
  { label: 'Invoices', value: 'BillingInvoice' },
  { label: 'Shoppers/Customers', value: 'BillingCustomer' },
  { label: 'Billing Products', value: 'BillingProduct' },
]

const entityIcons: Record<string, string> = {
  BillingInvoice: 'pi pi-file-edit',
  BillingCustomer: 'pi pi-users',
  BillingProduct: 'pi pi-shopping-bag',
}

const entityColors: Record<string, string> = {
  BillingInvoice: 'bg-emerald-50 text-emerald-700',
  BillingCustomer: 'bg-orange-50 text-orange-700',
  BillingProduct: 'bg-blue-50 text-blue-700',
}

const BillingActivityPage = () => {
  const [page, setPage] = useState(1)
  const [entityFilter, setEntityFilter] = useState('')
  const { data, isLoading, isError } = useGetActivityLogsQuery({ page, entity: entityFilter, system: 'billing' })

  const logs = data?.logs || []
  const hasMore = data?.more || false
  const total = data?.total || 0

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Activity Tracker</h1>
          <p className="text-sm text-gray-500">Monitor all changes made in the billing system</p>
        </div>
        <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-500">{total} logs recorded</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-xl border shadow-sm">
        <Dropdown
          value={entityFilter}
          options={entityOptions}
          optionLabel="label"
          optionValue="value"
          onChange={(e) => {
            setEntityFilter(String(e.value))
            setPage(1)
          }}
          placeholder="Filter by system area"
          className="w-full md:w-64"
        />
        {entityFilter && (
            <Button 
                icon="pi pi-times" 
                label="Clear Filter" 
                className="p-button-text p-button-sm" 
                onClick={() => setEntityFilter('')} 
            />
        )}
      </div>

      {/* Log list */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-400">
            <i className="pi pi-spin pi-spinner text-2xl mb-2 block" />
            Loading system activity logs…
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-sm text-red-500 bg-red-50/30">
            <i className="pi pi-exclamation-triangle text-2xl mb-2 block" />
            Failed to load activity logs. Please ensure you have Admin privileges.
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
             <i className="pi pi-info-circle text-2xl mb-2 block" />
            No recent activity found {entityFilter ? ` for ${entityFilter}` : ''}.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log: any) => (
              <div key={log._id} className="flex items-start gap-4 p-4 hover:bg-gray-50/80 transition-all border-l-4 border-transparent hover:border-blue-500">
                {/* Entity icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${entityColors[log.entity] || 'bg-gray-100 text-gray-500'}`}>
                  <i className={entityIcons[log.entity] || 'pi pi-circle-fill'} style={{ fontSize: '1rem' }} />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-bold text-gray-900">{log.action}</span>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${entityColors[log.entity] || 'bg-gray-100 text-gray-500'}`}>
                      {log.entity.replace('Billing', ' ')}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100 mb-2">
                    <p className="text-sm text-gray-700 leading-relaxed font-medium">{log.details || 'No details provided'}</p>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-gray-100 shadow-sm">
                      <i className="pi pi-user text-blue-500" />
                      <span className="text-gray-900 font-semibold">{log.performedBy?.name || log.performedBy?.email || 'System'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <i className="pi pi-clock" />
                      {formatDate(log.createdAt)}
                    </span>
                    {log.entityId && (
                      <span className="text-gray-300 font-mono hidden sm:inline">
                        #{String(log.entityId).slice(-8)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination bar */}
        {(page > 1 || hasMore) && (
          <div className="flex items-center justify-between p-4 border-t bg-gray-50/50">
            <span className="text-xs font-medium text-gray-500">Page {page}</span>
            <div className="flex gap-2">
              <Button
                icon="pi pi-chevron-left"
                label="Previous"
                className="p-button-sm p-button-outlined p-button-secondary bg-white"
                disabled={page <= 1}
                onClick={() => {
                    setPage(page - 1)
                    window.scrollTo(0, 0)
                }}
              />
              <Button
                icon="pi pi-chevron-right"
                iconPos="right"
                label="Next"
                className="p-button-sm p-button-outlined p-button-secondary bg-white"
                disabled={!hasMore}
                onClick={() => {
                    setPage(page + 1)
                    window.scrollTo(0, 0)
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BillingActivityPage
