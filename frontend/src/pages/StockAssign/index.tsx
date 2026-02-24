import { useState, useMemo } from 'react'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { useAssignStockMutation, useReceiveStockMutation } from '../../provider/queries/StockLocation.query'
import { useGetAllProductsQuery } from '../../provider/queries/Product.query'
import { useGetWarehousesQuery, useGetLocationsByWarehouseQuery } from '../../provider/queries/Warehouse.query'
import { toast } from 'sonner'

const StockAssignPage = () => {
  const [productId, setProductId] = useState<string | null>(null)
  const [warehouseId, setWarehouseId] = useState<string | null>(null)
  const [locationId, setLocationId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState('')
  const [assignStock, { isLoading: assigning }] = useAssignStockMutation()
  const [receiveStock, { isLoading: receiving }] = useReceiveStockMutation()

  // Fetch all products (page 1, large enough)
  const { data: prodData, isLoading: loadingProducts } = useGetAllProductsQuery({ page: 1, query: '' })
  // Fetch all warehouses
  const { data: whData, isLoading: loadingWarehouses } = useGetWarehousesQuery({ page: 1, query: '' })
  // Fetch locations for selected warehouse  
  const { data: locData, isLoading: loadingLocations } = useGetLocationsByWarehouseQuery(warehouseId!, { skip: !warehouseId })

  const productOptions = useMemo(() => {
    const items = prodData?.data || prodData?.products || []
    return items.map((p: any) => ({
      label: `${p.name} (SKU: ${p.sku})`,
      value: p._id,
    }))
  }, [prodData])

  const warehouseOptions = useMemo(() => {
    const items = whData?.data || whData?.warehouses || []
    return items.map((w: any) => ({
      label: w.name,
      value: w._id,
    }))
  }, [whData])

  const locationOptions = useMemo(() => {
    const items = locData?.data || locData?.locations || []
    return items.map((l: any) => ({
      label: `${l.zone} / Rack ${l.rack} / Bin ${l.bin} (Cap: ${l.capacity})`,
      value: l._id,
    }))
  }, [locData])

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
      <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4 max-w-xl">
        <p className="text-xs text-gray-500">
          Select a product, pick a warehouse and storage location, then assign or receive stock.
        </p>
        <div className="grid gap-4">
          {/* Product dropdown */}
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">Product</label>
            <Dropdown
              value={productId}
              options={productOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setProductId(e.value)}
              placeholder={loadingProducts ? 'Loading products...' : 'Select a product'}
              filter
              filterPlaceholder="Search by name or SKU"
              className="w-full"
              loading={loadingProducts}
              emptyMessage="No products found"
            />
          </div>

          {/* Warehouse dropdown */}
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">Warehouse</label>
            <Dropdown
              value={warehouseId}
              options={warehouseOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => {
                setWarehouseId(e.value)
                setLocationId(null) // reset location when warehouse changes
              }}
              placeholder={loadingWarehouses ? 'Loading warehouses...' : 'Select a warehouse'}
              filter
              filterPlaceholder="Search warehouse"
              className="w-full"
              loading={loadingWarehouses}
              emptyMessage="No warehouses found"
            />
          </div>

          {/* Location dropdown (depends on warehouse) */}
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">Storage Location</label>
            <Dropdown
              value={locationId}
              options={locationOptions}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => setLocationId(e.value)}
              placeholder={
                !warehouseId
                  ? 'Select a warehouse first'
                  : loadingLocations
                    ? 'Loading locations...'
                    : 'Select a storage location'
              }
              disabled={!warehouseId}
              filter
              filterPlaceholder="Search location"
              className="w-full"
              loading={loadingLocations}
              emptyMessage="No locations in this warehouse"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">Quantity</label>
            <InputText
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              min={1}
              placeholder="Enter quantity"
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
