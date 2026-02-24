import { useState } from 'react'
import { Button } from 'primereact/button'
import { useGetWarehousesQuery, useLazyGetLocationsByWarehouseQuery, useLazyGetLocationByScanQuery } from '../../provider/queries/Warehouse.query'
import BarcodeScanner from '../../components/BarcodeScanner'
import QRCode from 'react-qr-code'

const WarehouseStockPage = () => {
  const { data: warehousesData } = useGetWarehousesQuery({ page: 1, query: '' })
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [scannedLocationId, setScannedLocationId] = useState<string | null>(null)

  const [fetchLocations, { data: locationsData, isLoading: loadingLocations }] = useLazyGetLocationsByWarehouseQuery()
  const [fetchScan, { data: scannedData, isLoading: loadingScan }] = useLazyGetLocationByScanQuery()

  const handleSelectWarehouse = (id: string) => {
    setSelectedWarehouseId(id)
    setScannedLocationId(null)
    fetchLocations(id)
  }

  const handleScan = (value: string) => {
    setScanOpen(false)
    setScannedLocationId(value)
    fetchScan(value)
  }

  const warehouses = warehousesData?.warehouses || []

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Warehouse Stock</h1>
        <Button icon="pi pi-qrcode" label="Scan Location" onClick={() => setScanOpen(true)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-3">
          <h2 className="text-sm font-semibold mb-2 text-gray-700">Warehouses</h2>
          <ul className="space-y-1 max-h-80 overflow-auto text-sm">
            {warehouses.map((w: any) => (
              <li key={w._id}>
                <button
                  onClick={() => handleSelectWarehouse(w._id)}
                  className={`w-full text-left px-2 py-1 rounded ${selectedWarehouseId === w._id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                    }`}
                >
                  {w.name}
                </button>
              </li>
            ))}
            {!warehouses.length && <li className="text-xs text-gray-400">No warehouses yet.</li>}
          </ul>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-3 lg:col-span-2">
          <h2 className="text-sm font-semibold mb-2 text-gray-700">Locations & Stock</h2>
          {loadingLocations && <p className="text-xs text-gray-500">Loading locations…</p>}

          {locationsData?.locations?.length > 0 ? (
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Rack</th>
                    <th className="text-left p-2">Bin</th>
                    <th className="text-left p-2">QR</th>
                  </tr>
                </thead>
                <tbody>
                  {locationsData.locations.map((loc: any) => (
                    <tr key={loc._id} className="border-t">
                      <td className="p-2">{loc.rack}</td>
                      <td className="p-2">{loc.bin}</td>
                      <td className="p-2">
                        <div className="inline-block bg-white p-1 rounded border">
                          <QRCode value={loc._id} size={56} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !loadingLocations && (
              <p className="text-xs text-gray-400">
                Select a warehouse to view its rack/bin locations and download QR codes.
              </p>
            )
          )}
        </div>
      </div>

      {scannedLocationId && (
        <div className="bg-white rounded-xl border shadow-sm p-3">
          <h2 className="text-sm font-semibold mb-2 text-gray-700">Scanned Location Details</h2>
          {loadingScan && <p className="text-xs text-gray-500">Fetching location stock…</p>}
          {scannedData?.location && (
            <div className="text-xs space-y-2">
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-semibold text-gray-800">
                    {scannedData.location.warehouse?.name} – Rack {scannedData.location.rack} / Bin {scannedData.location.bin}
                  </p>
                  <p className="text-gray-500">Location ID: {scannedData.location._id}</p>
                </div>
                <div className="ml-auto bg-white p-1 rounded border">
                  <QRCode value={scannedData.location._id} size={64} />
                </div>
              </div>

              <div className="mt-2">
                {scannedData.stocks?.length ? (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2">Product</th>
                        <th className="text-left p-2">SKU</th>
                        <th className="text-left p-2">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scannedData.stocks.map((s: any) => (
                        <tr key={s._id} className="border-t">
                          <td className="p-2">{s.product?.name}</td>
                          <td className="p-2">{s.product?.sku}</td>
                          <td className="p-2">{s.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-gray-400">No stock currently stored at this location.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {scanOpen && <BarcodeScanner onScan={handleScan} onClose={() => setScanOpen(false)} />}
    </div>
  )
}

export default WarehouseStockPage
