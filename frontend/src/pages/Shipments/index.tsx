import { FormEvent, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { InputText } from 'primereact/inputtext'
import { Dropdown } from 'primereact/dropdown'
import { Button } from 'primereact/button'
import {
  useGetAllShipmentsQuery,
  useCreateShipmentMutation,
  useUpdateShipmentStatusMutation,
  useDeleteShipmentMutation,
} from '../../provider/queries/Shipment.query'
import { toast } from 'sonner'
import { UserSlicePath } from '../../provider/slice/user.slice'

const typeOptions = [
  { label: 'All Types', value: '' },
  { label: 'Inbound', value: 'Inbound' },
  { label: 'Outbound', value: 'Outbound' },
]

const statusOptions = [
  { label: 'Pending', value: 'Pending' },
  { label: 'In Transit', value: 'In Transit' },
  { label: 'Delivered', value: 'Delivered' },
]

const ShipmentsPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const page = Number(searchParams.get('page')) || 1
  const query = searchParams.get('query') || ''
  const type = (searchParams.get('type') as 'Inbound' | 'Outbound' | null) || ''

  const [search, setSearch] = useState(query)
  const [selectedType, setSelectedType] = useState<string | ''>(type)

  const { data, isLoading, isError } = useGetAllShipmentsQuery({
    page,
    query,
    type: selectedType || undefined,
  })

  const [createShipment, { isLoading: creating }] = useCreateShipmentMutation()
  const [updateStatus, { isLoading: updating }] = useUpdateShipmentStatusMutation()
  const [deleteShipment, { isLoading: deleting }] = useDeleteShipmentMutation()

  const [form, setForm] = useState({
    type: 'Inbound' as 'Inbound' | 'Outbound',
    productId: '',
    quantity: '',
    notes: '',
  })

  const user = useSelector(UserSlicePath) as { role?: string } | null
  const role = user?.role || 'warehouse_staff'
  const isAdmin = role === 'admin'

  const shipments = data?.shipments || []

  const applyFilters = (e?: FormEvent) => {
    if (e) e.preventDefault()
    const params = new URLSearchParams()
    params.set('page', '1')
    if (search) params.set('query', search)
    if (selectedType) params.set('type', selectedType)
    navigate(`/shipments?${params.toString()}`)
  }

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams()
    params.set('page', String(nextPage))
    if (query) params.set('query', query)
    if (type) params.set('type', type)
    navigate(`/shipments?${params.toString()}`)
  }

  const submitCreate = async () => {
    if (!form.productId || !form.quantity) {
      toast.error('Product and quantity are required')
      return
    }
    try {
      const res: any = await createShipment({
        type: form.type,
        productId: form.productId,
        quantity: Number(form.quantity),
        notes: form.notes || undefined,
      })
      if (res.error) {
        toast.error(res.error?.data?.message || 'Failed to create shipment')
      } else {
        toast.success(res.data?.msg || 'Shipment created')
        setForm({ ...form, quantity: '', notes: '' })
      }
    } catch (e: any) {
      toast.error(e.message || 'Error creating shipment')
    }
  }

  const changeStatus = async (id: string, status: 'Pending' | 'In Transit' | 'Delivered') => {
    try {
      const res: any = await updateStatus({ id, status })
      if (res.error) {
        toast.error(res.error?.data?.message || 'Status update failed')
      } else {
        toast.success(res.data?.msg || 'Status updated')
      }
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  const removeShipment = async (id: string) => {
    if (!window.confirm('Delete this shipment? (Only pending / non-delivered allowed)')) return
    try {
      const res: any = await deleteShipment(id)
      if (res.error) {
        toast.error(res.error?.data?.message || 'Delete failed')
      } else {
        toast.success(res.data?.msg || 'Shipment deleted')
      }
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  if (isLoading) {
    return <div className="p-4">Loading shipments…</div>
  }

  if (isError) {
    return <div className="p-4 text-red-500 text-sm">Failed to load shipments.</div>
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold">Shipments</h1>
      </div>

      <form onSubmit={applyFilters} className="flex flex-wrap gap-2 items-center text-sm">
        <InputText
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product or notes"
          className="w-full md:w-64"
        />
        <Dropdown
          value={selectedType}
          options={typeOptions}
          onChange={(e) => setSelectedType(e.value)}
          placeholder="Type"
          className="w-full md:w-40"
        />
        <Button label="Apply" icon="pi pi-filter" type="submit" size="small" />
      </form>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Create Shipment</h2>
          <div className="grid gap-2 text-sm">
            <div>
              <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">Type</label>
              <Dropdown
                value={form.type}
                options={[
                  { label: 'Inbound', value: 'Inbound' },
                  { label: 'Outbound', value: 'Outbound' },
                ]}
                onChange={(e) => setForm({ ...form, type: e.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">Product ID</label>
              <InputText
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">Quantity</label>
              <InputText
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                type="number"
                min={1}
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">Notes</label>
              <InputText
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full text-sm"
                placeholder="Optional remarks"
              />
            </div>
          </div>
          <Button
            label="Create Shipment"
            icon="pi pi-plus"
            onClick={submitCreate}
            loading={creating}
            className="w-full mt-2"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-2 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Page {page} • {shipments.length} items
            </span>
            <div className="flex gap-1">
              {page > 1 && (
                <Button
                  icon="pi pi-chevron-left"
                  rounded
                  size="small"
                  text
                  onClick={() => goToPage(page - 1)}
                  aria-label="Previous page"
                />
              )}
              {data?.more && (
                <Button
                  icon="pi pi-chevron-right"
                  rounded
                  size="small"
                  text
                  onClick={() => goToPage(page + 1)}
                  aria-label="Next page"
                />
              )}
            </div>
          </div>
          <div className="overflow-auto max-h-[420px]">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Qty</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Handled By</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.length ? (
                  shipments.map((s: any) => (
                    <tr key={s._id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            s.type === 'Inbound'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-orange-50 text-orange-700'
                          }`}
                        >
                          {s.type}
                        </span>
                      </td>
                      <td className="p-2">
                        {s.product?.name || 'N/A'}
                        <div className="text-[10px] text-gray-400">{s.product?.sku}</div>
                      </td>
                      <td className="p-2">{s.quantity}</td>
                      <td className="p-2">
                        <Dropdown
                          value={s.status}
                          options={statusOptions}
                          onChange={(e) => changeStatus(s._id, e.value)}
                          disabled={updating || !isAdmin}
                          className="w-28 text-xs"
                        />
                      </td>
                      <td className="p-2 text-[10px] text-gray-500">
                        {new Date(s.createdAt).toLocaleString()}
                      </td>
                      <td className="p-2 text-[10px] text-gray-500">
                        {s.handledBy?.name || 'N/A'}
                      </td>
                      <td className="p-2">
                        {isAdmin && (
                          <Button
                            icon="pi pi-trash"
                            size="small"
                            text
                            rounded
                            severity="danger"
                            loading={deleting}
                            onClick={() => removeShipment(s._id)}
                            aria-label="Delete"
                          />
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-3 text-xs text-gray-400">
                      No shipments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShipmentsPage
