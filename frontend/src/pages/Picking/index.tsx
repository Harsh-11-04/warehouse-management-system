import { useState } from 'react'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { usePickStockMutation, useTransferStockMutation } from '../../provider/queries/StockLocation.query'
import { toast } from 'sonner'

const PickingPage = () => {
  const [productId, setProductId] = useState('')
  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId, setToLocationId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [pickStock, { isLoading: picking }] = usePickStockMutation()
  const [transferStock, { isLoading: transferring }] = useTransferStockMutation()

  const submitPick = async () => {
    if (!productId || !fromLocationId || !quantity) {
      toast.error('Product, From Location and Quantity are required')
      return
    }
    try {
      const res: any = await pickStock({
        productId,
        locationId: fromLocationId,
        quantity: Number(quantity),
      })
      if (res.error) {
        toast.error(res.error?.data?.message || 'Pick failed')
      } else {
        toast.success(res.data?.msg || 'Picked successfully')
      }
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  const submitTransfer = async () => {
    if (!productId || !fromLocationId || !toLocationId || !quantity) {
      toast.error('All fields are required for transfer')
      return
    }
    try {
      const res: any = await transferStock({
        productId,
        fromLocationId,
        toLocationId,
        quantity: Number(quantity),
      })
      if (res.error) {
        toast.error(res.error?.data?.message || 'Transfer failed')
      } else {
        toast.success(res.data?.msg || 'Transfer successful')
      }
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Picking / Transfer</h1>
      <div className="grid lg:grid-cols-2 gap-4 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Pick from Location</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Deducts stock from a specific bin and keeps product totals in sync with the Inventory module.
          </p>
          <div className="grid gap-3">
            <div>
              <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">Product ID</label>
              <InputText value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full text-sm" />
            </div>
            <div>
              <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">From Location ID</label>
              <InputText
                value={fromLocationId}
                onChange={(e) => setFromLocationId(e.target.value)}
                className="w-full text-sm"
              />
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
          <Button label="Pick Items" icon="pi pi-box" onClick={submitPick} loading={picking} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Transfer Between Locations</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Moves inventory between racks/bins inside the same or different warehouses while maintaining history.
          </p>
          <div className="grid gap-3">
            <div>
              <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">Product ID</label>
              <InputText value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">From Location ID</label>
                <InputText
                  value={fromLocationId}
                  onChange={(e) => setFromLocationId(e.target.value)}
                  className="w-full text-sm"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">To Location ID</label>
                <InputText
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                  className="w-full text-sm"
                />
              </div>
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
          <Button
            label="Transfer Items"
            icon="pi pi-arrow-right-arrow-left"
            severity="secondary"
            onClick={submitTransfer}
            loading={transferring}
          />
        </div>
      </div>
    </div>
  )
}

export default PickingPage
