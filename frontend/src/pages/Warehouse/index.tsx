import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Button } from 'primereact/button'
import { InputText } from 'primereact/inputtext'
import { useGetWarehousesQuery } from '../../provider/queries/Warehouse.query'
import { toast } from 'sonner'
import { UserSlicePath } from '../../provider/slice/user.slice'

const WarehousePage = () => {
  const { data, refetch } = useGetWarehousesQuery({ page: 1, query: '' })
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const user = useSelector(UserSlicePath) as { role?: string } | null
  const role = user?.role || 'warehouse_staff'
  const canManage = role === 'admin' || role === 'manager'

  const warehouses = data?.warehouses || []

  const createWarehouse = async () => {
    if (!name.trim() || !address.trim()) {
      toast.error('Name and address are required')
      return
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/warehouse/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
        body: JSON.stringify({ name: name.trim(), address: address.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message || 'Failed to create warehouse')
      }
      toast.success('Warehouse created')
      setName('')
      setAddress('')
      refetch()
    } catch (e: any) {
      toast.error(e.message || 'Error creating warehouse')
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold">Warehouses</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {canManage && (
          <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Create Warehouse</h2>
            <div className="space-y-2 text-sm">
              <div>
                <label className="block mb-1 text-xs text-gray-500">Name</label>
                <InputText
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm"
                  placeholder="Main Distribution Center"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs text-gray-500">Address</label>
                <InputText
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-sm"
                  placeholder="Address / City"
                />
              </div>
              <Button label="Create" icon="pi pi-plus" onClick={createWarehouse} className="w-full mt-2" />
            </div>
          </div>
        )}

        <div className={`bg-white rounded-xl border shadow-sm p-4 ${canManage ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Existing Warehouses</h2>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Address</th>
                </tr>
              </thead>
              <tbody>
                {warehouses.length ? (
                  warehouses.map((w: any) => (
                    <tr key={w._id} className="border-t border-gray-100">
                      <td className="p-2">{w.name}</td>
                      <td className="p-2 text-gray-500">{w.address}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="p-2 text-xs text-gray-400">
                      No warehouses yet.
                      {canManage && ' Create one using the form on the left.'}
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

export default WarehousePage
