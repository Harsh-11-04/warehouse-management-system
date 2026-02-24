import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button } from 'primereact/button'
import { InputText } from 'primereact/inputtext'
import { useGetWarehousesQuery, useLazyGetLocationsByWarehouseQuery } from '../../provider/queries/Warehouse.query'
import { toast } from 'sonner'
import { UserSlicePath } from '../../provider/slice/user.slice'

const LocationsPage = () => {
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('warehouseId') || ''
  const { data: warehousesData } = useGetWarehousesQuery({ page: 1, query: '' })
  const [fetchLocations, { data: locationsData, refetch }] = useLazyGetLocationsByWarehouseQuery()

  const [rack, setRack] = useState('')
  const [bin, setBin] = useState('')

  const user = useSelector(UserSlicePath) as { role?: string } | null
  const role = user?.role || 'warehouse_staff'
  const canManageLocations = role === 'admin' || role === 'manager'

  const warehouses = warehousesData?.warehouses || []

  const selectWarehouse = (id: string) => {
    setParams({ warehouseId: id })
    fetchLocations(id)
  }

  const createLocation = async () => {
    if (!selectedId) {
      toast.error('Select a warehouse first')
      return
    }
    if (!rack.trim() || !bin.trim()) {
      toast.error('Rack and Bin are required')
      return
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/warehouse/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
        body: JSON.stringify({ warehouseId: selectedId, rack: rack.trim(), bin: bin.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message || 'Failed to create location')
      }
      toast.success('Location created')
      setRack('')
      setBin('')
      if (refetch) refetch()
      else fetchLocations(selectedId)
    } catch (e: any) {
      toast.error(e.message || 'Error creating location')
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Locations</h1>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Warehouses</h2>
          <ul className="space-y-1 max-h-80 overflow-auto text-sm">
            {warehouses.map((w: any) => (
              <li key={w._id}>
                <button
                  onClick={() => selectWarehouse(w._id)}
                  className={`w-full text-left px-2 py-1 rounded ${selectedId === w._id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                  {w.name}
                </button>
              </li>
            ))}
            {!warehouses.length && <li className="text-xs text-gray-400">No warehouses yet.</li>}
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-3 space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Rack / Bin Locations</h2>
          {selectedId ? (
            <>
              {canManageLocations && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block mb-1 text-gray-500 dark:text-gray-400">Rack</label>
                    <InputText value={rack} onChange={(e) => setRack(e.target.value)} className="w-full text-sm" />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="block mb-1 text-gray-500 dark:text-gray-400">Bin</label>
                    <InputText value={bin} onChange={(e) => setBin(e.target.value)} className="w-full text-sm" />
                  </div>
                  <div className="flex items-end">
                    <Button label="Add Location" icon="pi pi-plus" onClick={createLocation} />
                  </div>
                </div>
              )}

              <div className="max-h-72 overflow-auto mt-3">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="text-left p-2">Rack</th>
                      <th className="text-left p-2">Bin</th>
                      <th className="text-left p-2">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationsData?.locations?.length ? (
                      locationsData.locations.map((loc: any) => (
                        <tr key={loc._id} className="border-t border-gray-100 dark:border-gray-700">
                          <td className="p-2">{loc.rack}</td>
                          <td className="p-2">{loc.bin}</td>
                          <td className="p-2 text-xs">{loc.isActive ? 'Yes' : 'No'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-2 text-xs text-gray-400">
                          No locations yet for this warehouse.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-400">Select a warehouse on the left to manage rack/bin locations.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default LocationsPage
