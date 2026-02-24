import { useState } from 'react'
import { Dropdown } from 'primereact/dropdown'
import { Button } from 'primereact/button'
import { useGetActivityLogsQuery } from '../../provider/queries/ActivityLog.query'

const entityOptions = [
  { label: 'All Entities', value: '' },
  { label: 'Product', value: 'Product' },
  { label: 'Warehouse', value: 'Warehouse' },
  { label: 'Storage Location', value: 'StorageLocation' },
  { label: 'Stock Location', value: 'StockLocation' },
  { label: 'Shipment', value: 'Shipment' },
  { label: 'User', value: 'User' },
]

const entityIcons: Record<string, string> = {
  Product: 'pi pi-box',
  Warehouse: 'pi pi-building',
  StorageLocation: 'pi pi-map-marker',
  StockLocation: 'pi pi-th-large',
  Shipment: 'pi pi-truck',
  User: 'pi pi-user',
}

const entityColors: Record<string, string> = {
  Product: 'bg-blue-50 text-blue-700',
  Warehouse: 'bg-purple-50 text-purple-700',
  StorageLocation: 'bg-amber-50 text-amber-700',
  StockLocation: 'bg-green-50 text-green-700',
  Shipment: 'bg-orange-50 text-orange-700',
  User: 'bg-pink-50 text-pink-700',
}

const ActivityLogPage = () => {
  const [page, setPage] = useState(1)
  const [entityFilter, setEntityFilter] = useState('')
  const { data, isLoading, isError } = useGetActivityLogsQuery({ page, entity: entityFilter })

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
        <h1 className="text-2xl font-semibold">Activity Logs</h1>
        <span className="text-xs text-gray-400">{total} total entries</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Dropdown
          value={entityFilter}
          options={entityOptions}
          optionLabel="label"
          optionValue="value"
          onChange={(e) => {
            setEntityFilter(String(e.value))
            setPage(1)
          }}
          placeholder="Filter by entity"
          className="w-full md:w-52"
        />
      </div>

      {/* Log list */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-400">Loading activity logs…</div>
        ) : isError ? (
          <div className="p-6 text-center text-sm text-red-500">
            Failed to load activity logs. Make sure you are logged in as admin.
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            No activity logs found{entityFilter ? ` for ${entityFilter}` : ''}.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log: any) => (
              <div key={log._id} className="flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors">
                {/* Entity icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${entityColors[log.entity] || 'bg-gray-100 text-gray-500'}`}>
                  <i className={entityIcons[log.entity] || 'pi pi-circle'} style={{ fontSize: '0.85rem' }} />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">{log.action}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${entityColors[log.entity] || 'bg-gray-100 text-gray-500'}`}>
                      {log.entity}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{log.details}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                    <span>
                      <i className="pi pi-user mr-1" />
                      {log.performedBy?.name || log.performedBy?.email || '—'}
                    </span>
                    <span>
                      <i className="pi pi-clock mr-1" />
                      {formatDate(log.createdAt)}
                    </span>
                    {log.entityId && (
                      <span className="font-mono">
                        ID: …{String(log.entityId).slice(-6)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {(page > 1 || hasMore) && (
          <div className="flex items-center justify-between p-3 border-t bg-gray-50 text-xs text-gray-500">
            <span>Page {page}</span>
            <div className="flex gap-1">
              {page > 1 && (
                <Button
                  icon="pi pi-chevron-left"
                  rounded
                  size="small"
                  text
                  onClick={() => setPage(page - 1)}
                  aria-label="Previous page"
                />
              )}
              {hasMore && (
                <Button
                  icon="pi pi-chevron-right"
                  rounded
                  size="small"
                  text
                  onClick={() => setPage(page + 1)}
                  aria-label="Next page"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActivityLogPage
