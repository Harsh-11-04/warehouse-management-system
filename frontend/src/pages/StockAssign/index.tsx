import { useState } from 'react'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { useAssignStockMutation, useReceiveStockMutation } from '../../provider/queries/StockLocation.query'
import { toast } from 'sonner'

const StockAssignPage = () => {
  const [productId, setProductId] = useState('')
  const [locationId, setLocationId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [assignStock, { isLoading: assigning }] = useAssignStockMutation()
  const [receiveStock, { isLoading: receiving }] = useReceiveStockMutation()

  const submit = async (mode: 'assign' | 'receive') => {
    if (!productId || !locationId || !quantity) {
      toast.error('Product, Location and Quantity are required')
      return
    }
    const payload = {
      productId,
      locationId,
      quantity: Number(quantity),
    }
    try {
      const fn = mode === 'assign' ? assignStock : receiveStock
      const res: any = await fn(payload)
      if (res.error) {
        const msg = res.error?.data?.message || 'Operation failed'
        toast.error(msg)
      } else {
        toast.success(res.data?.msg || 'Success')
      }
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Assign / Receive Stock</h1>
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-4 space-y-3 max-w-xl">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Use this screen to assign inventory into a bin for the first time, or receive inbound stock into an existing
          bin. You can paste IDs from the product and location details pages or later wire a selector/search.
        </p>
        <div className="grid gap-3">
          <div>
            <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">Product ID</label>
            <InputText value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full text-sm" />
          </div>
          <div>
            <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">Location ID</label>
            <InputText value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full text-sm" />
          </div>
          <div>
            <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">Quantity</label>
            <InputText
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              min={1}
              className="w-full text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            label="Assign to Location"
            icon="pi pi-arrow-right-arrow-left"
            onClick={() => submit('assign')}
            loading={assigning}
          />
          <Button
            label="Receive Inbound"
            icon="pi pi-download"
            severity="success"
            onClick={() => submit('receive')}
            loading={receiving}
          />
        </div>
      </div>
    </div>
  )
}

export default StockAssignPage
