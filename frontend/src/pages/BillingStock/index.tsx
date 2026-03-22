import { useState } from 'react'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { Dialog } from 'primereact/dialog'
import { toast } from 'sonner'
import {
    useGetAllBillingProductsQuery,
    useGetStockStatsQuery,
    useUpdateBillingProductStockMutation,
} from '../../provider/queries/BillingProduct.query'

const BillingStockPage = () => {
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all')
    const [sort, setSort] = useState<'desc' | 'asc'>('desc')
    const [page, setPage] = useState(1)

    const { data, isLoading } = useGetAllBillingProductsQuery({
        page, query: search, limit: 50,
        lowStock: filter === 'low' || filter === 'out'
    })
    const { data: statsData } = useGetStockStatsQuery()
    const [updateStock, { isLoading: updating }] = useUpdateBillingProductStockMutation()

    const [showUpdate, setShowUpdate] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [adjustmentType, setAdjustmentType] = useState<'in' | 'out'>('in')
    const [adjustmentQty, setAdjustmentQty] = useState('1')

    const products = data?.products || []
    const stats = statsData || { total: 0, lowStock: 0, outOfStock: 0 }

    const filteredProducts = filter === 'out'
        ? products.filter((p: any) => p.stock === 0)
        : products

    const displayProducts = [...filteredProducts].sort((a: any, b: any) => {
        return sort === 'desc' ? b.stock - a.stock : a.stock - b.stock
    })

    const openStockUpdate = (product: any) => {
        setSelectedProduct(product)
        setAdjustmentType('in')
        setAdjustmentQty('1')
        setShowUpdate(true)
    }

    const handleStockUpdate = async () => {
        if (!selectedProduct || adjustmentQty === '') return
        const qty = Number(adjustmentQty)
        if (qty <= 0) { toast.error('Quantity must be greater than 0'); return }
        const newStock = adjustmentType === 'in'
            ? selectedProduct.stock + qty
            : Math.max(0, selectedProduct.stock - qty)
        try {
            const res: any = await updateStock({ id: selectedProduct._id, stock: newStock })
            if (res.error) { toast.error(res.error?.data?.message || 'Update failed'); return }
            toast.success(`Stock updated for ${selectedProduct.name}`)
            setShowUpdate(false)
        } catch (e: any) { toast.error(e.message) }
    }

    const getStockBadge = (p: any) => {
        if (p.stock === 0) return { label: 'OUT', bgColor: 'bg-red-500', textColor: 'text-white' }
        if (p.stock <= p.lowStockThreshold) return { label: 'LOW', bgColor: 'bg-amber-500', textColor: 'text-white' }
        return { label: 'OK', bgColor: 'bg-emerald-500', textColor: 'text-white' }
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8 bg-gray-50/50 min-h-screen">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-gray-900 tracking-tight">Jattkart</h1>
                <p className="text-gray-500 mt-1">The best you got for all your groceries — Stock Management</p>
            </div>

            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    onClick={() => { setFilter('all'); setPage(1) }}
                    className={`relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 ${filter === 'all' ? 'bg-blue-600 border-blue-600 shadow-blue-200 shadow-xl text-white scale-[1.02]' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300'}`}
                >
                    <div className="flex items-center justify-between relative z-10">
                        <div className="text-left">
                            <p className={`text-sm font-semibold uppercase tracking-wider mb-2 ${filter === 'all' ? 'text-blue-100' : 'text-gray-500'}`}>Total Products</p>
                            <h3 className={`text-5xl font-black ${filter === 'all' ? 'text-white' : 'text-gray-800'}`}>{stats.total || 0}</h3>
                        </div>
                        <div className={`p-4 rounded-2xl ${filter === 'all' ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
                            <i className="pi pi-box text-3xl"></i>
                        </div>
                    </div>
                    {filter === 'all' && <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>}
                </button>
                
                <button
                    onClick={() => { setFilter('low'); setPage(1) }}
                    className={`relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 ${filter === 'low' ? 'bg-amber-500 border-amber-500 shadow-amber-200 shadow-xl text-white scale-[1.02]' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-amber-300'}`}
                >
                    <div className="flex items-center justify-between relative z-10">
                        <div className="text-left">
                            <p className={`text-sm font-semibold uppercase tracking-wider mb-2 ${filter === 'low' ? 'text-amber-100' : 'text-gray-500'}`}>Low Stock Assets</p>
                            <h3 className={`text-5xl font-black ${filter === 'low' ? 'text-white' : 'text-amber-600'}`}>{stats.lowStock || 0}</h3>
                        </div>
                        <div className={`p-4 rounded-2xl ${filter === 'low' ? 'bg-white/20' : 'bg-amber-50 text-amber-500'}`}>
                            <i className="pi pi-exclamation-triangle text-3xl"></i>
                        </div>
                    </div>
                    {filter === 'low' && <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>}
                </button>

                <button
                    onClick={() => { setFilter('out'); setPage(1) }}
                    className={`relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 ${filter === 'out' ? 'bg-red-500 border-red-500 shadow-red-200 shadow-xl text-white scale-[1.02]' : 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-red-300'}`}
                >
                    <div className="flex items-center justify-between relative z-10">
                        <div className="text-left">
                            <p className={`text-sm font-semibold uppercase tracking-wider mb-2 ${filter === 'out' ? 'text-red-100' : 'text-gray-500'}`}>Out of Stock</p>
                            <h3 className={`text-5xl font-black ${filter === 'out' ? 'text-white' : 'text-red-500'}`}>{stats.outOfStock || 0}</h3>
                        </div>
                        <div className={`p-4 rounded-2xl ${filter === 'out' ? 'bg-white/20' : 'bg-red-50 text-red-500'}`}>
                            <i className="pi pi-times-circle text-3xl"></i>
                        </div>
                    </div>
                    {filter === 'out' && <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>}
                </button>
            </div>

            {/* Action Bar (Search & Filters) */}
            <div className="bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between sticky top-4 z-20">
                <div className="w-full lg:w-96 flex-1 px-2">
                    <span className="p-input-icon-left w-full h-full">
                        <i className="pi pi-search text-gray-400 font-bold" />
                        <InputText
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Find product by name or barcode..."
                            className="w-full pl-10 h-12 border-none ring-0 shadow-none font-medium text-gray-800 placeholder-gray-400"
                        />
                    </span>
                </div>
                
                <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
                    <Dropdown
                        value={filter}
                        options={[
                            { label: 'All Products', value: 'all' },
                            { label: 'Low Stock Priority', value: 'low' },
                            { label: 'Depleted Stock', value: 'out' },
                        ]}
                        onChange={(e) => setFilter(e.value)}
                        className="w-full sm:w-48 h-12 flex items-center bg-gray-50 border-gray-200 rounded-xl font-medium focus:ring-blue-100 placeholder-gray-500 shadow-none transition-colors hover:bg-gray-100"
                    />
                    
                    <Dropdown
                        value={sort}
                        options={[
                            { label: 'Highest Stock First', value: 'desc' },
                            { label: 'Lowest Stock First', value: 'asc' },
                        ]}
                        onChange={(e) => setSort(e.value)}
                        className="w-full sm:w-56 h-12 flex items-center bg-gray-50 border-gray-200 rounded-xl font-medium focus:ring-blue-100 shadow-none transition-colors hover:bg-gray-100"
                    />

                    <Button 
                        label="Apply Filters" 
                        severity="info" 
                        icon="pi pi-filter text-sm"
                        onClick={() => setPage(1)} 
                        className="h-12 px-6 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 border-none shadow-md shadow-blue-200 transition-all w-full sm:w-auto" 
                    />
                </div>
            </div>

            {/* Product Cards Grid */}
            {isLoading ? (
                <div className="text-center py-32 text-gray-400">
                    <i className="pi pi-spin pi-spinner text-5xl mb-4 text-blue-500"></i>
                    <p className="font-semibold text-lg">Fetching realtime stock data...</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {displayProducts.map((p: any) => {
                            const badge = getStockBadge(p)
                            const isOut = p.stock === 0
                            
                            return (
                                <div key={p._id} className={`group bg-white rounded-2xl border p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full bg-gradient-to-br from-white to-gray-50/50 ${isOut ? 'border-red-100 hover:border-red-300' : 'border-gray-100 hover:border-blue-300'}`}>
                                    {/* Header */}
                                    <div className="flex flex-col mb-6">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${badge.bgColor} ${badge.textColor} shadow-sm`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{p.name}</h3>
                                        <p className="text-xs text-gray-400 mt-2 font-mono flex items-center gap-1.5"><i className="pi pi-barcode text-gray-300"></i> {p.barcode || 'NO-BARCODE'}</p>
                                    </div>
                                    
                                    {/* Data */}
                                    <div className="mt-auto grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 mb-5">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-widest">In Stock</p>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className={`text-3xl font-black ${isOut ? 'text-red-500' : 'text-gray-900'}`}>{p.stock}</span>
                                            </div>
                                        </div>
                                        <div className="text-right border-l border-gray-100 pl-4">
                                            <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-widest">Selling Price</p>
                                            <p className="text-xl font-black text-emerald-600">₹{(p.sellingPrice || 0).toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Actions */}
                                    <button
                                        onClick={() => openStockUpdate(p)}
                                        className={`w-full rounded-xl py-3 font-bold text-sm shadow-sm transition-all focus:ring-4 focus:outline-none flex items-center justify-center gap-2 ${isOut ? 'bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-100 focus:ring-red-100' : 'bg-gray-50 hover:bg-gray-900 text-gray-700 hover:text-white border border-gray-200 focus:ring-gray-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600'}`}
                                    >
                                        <i className="pi pi-sliders-h"></i> Manage Stock
                                    </button>
                                </div>
                            )
                        })}
                    </div>

                    {displayProducts.length === 0 && (
                        <div className="text-center py-32 bg-white rounded-2xl border border-dashed border-gray-300">
                            <i className="pi pi-search text-gray-300 text-6xl mb-4"></i>
                            <h3 className="text-xl font-bold text-gray-600">No matching products</h3>
                            <p className="text-gray-400 mt-2 max-w-sm mx-auto">Try adjusting your search criteria, category filters, or sort order to find what you're looking for.</p>
                            <Button label="Clear Filters" icon="pi pi-filter-slash" text onClick={() => { setSearch(''); setFilter('all'); setPage(1) }} className="mt-6" />
                        </div>
                    )}

                    {/* Pagination */}
                    {data && data.totalPages > 1 && (
                        <div className="flex justify-center gap-3 mt-8">
                            <Button label="Prev Page" icon="pi pi-arrow-left" severity="secondary" outlined size="small" className="rounded-xl px-6" disabled={page === 1} onClick={() => setPage(page - 1)} />
                            <div className="flex items-center justify-center px-4 font-semibold text-gray-500 bg-white border rounded-xl shadow-sm">
                                Page {page} of {data.totalPages}
                            </div>
                            <Button label="Next Page" icon="pi pi-arrow-right" iconPos="right" severity="secondary" outlined size="small" className="rounded-xl px-6" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} />
                        </div>
                    )}
                </>
            )}

            {/* Premium Stock Update Dialog */}
            <Dialog header={<div className="font-bold text-xl text-gray-800">Adjust Inventory</div>} visible={showUpdate} onHide={() => setShowUpdate(false)} className="w-full max-w-md" contentClassName="pb-6">
                {selectedProduct && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <h4 className="font-bold text-gray-800 line-clamp-1">{selectedProduct.name}</h4>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-sm font-medium text-gray-500 flex items-center gap-1.5"><i className="pi pi-barcode"></i> {selectedProduct.barcode || 'N/A'}</span>
                                <span className="text-sm font-bold bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100">Current: {selectedProduct.stock}</span>
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-gray-500 uppercase font-black tracking-wider mb-2">Adjustment Action</div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setAdjustmentType('in')}
                                    className={`py-4 rounded-xl text-sm font-black transition-all border-2 flex flex-col items-center justify-center gap-1.5 ${adjustmentType === 'in'
                                            ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-sm'
                                            : 'border-gray-200 bg-white text-gray-400 hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-500'
                                        }`}
                                >
                                    <i className="pi pi-arrow-down text-xl"></i>
                                    STOCK IN (+)
                                </button>
                                <button
                                    onClick={() => setAdjustmentType('out')}
                                    className={`py-4 rounded-xl text-sm font-black transition-all border-2 flex flex-col items-center justify-center gap-1.5 ${adjustmentType === 'out'
                                            ? 'bg-red-50 border-red-500 text-red-600 shadow-sm'
                                            : 'border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:bg-red-50/50 hover:text-red-500'
                                        }`}
                                >
                                    <i className="pi pi-arrow-up text-xl"></i>
                                    STOCK OUT (-)
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <div className="text-xs text-gray-500 uppercase font-black tracking-wider mb-2">Quantity</div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black font-mono select-none">
                                    {adjustmentType === 'in' ? '+' : '-'}
                                </span>
                                <InputText
                                    type="number"
                                    min={1}
                                    value={adjustmentQty}
                                    onChange={(e) => setAdjustmentQty(e.target.value)}
                                    className="w-full text-center text-3xl font-black py-4 border-2 outline-none shadow-inner bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all rounded-xl"
                                    autoFocus
                                />
                            </div>
                        </div>
                        
                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex items-center justify-between">
                            <span className="text-sm font-bold text-blue-800">Resulting Stock:</span>
                            <span className="text-2xl font-black text-blue-600">
                                {adjustmentType === 'in'
                                    ? selectedProduct.stock + (Number(adjustmentQty) || 0)
                                    : Math.max(0, selectedProduct.stock - (Number(adjustmentQty) || 0))
                                }
                            </span>
                        </div>

                        <Button 
                            label="Confirm Adjustment" 
                            icon="pi pi-check-circle"
                            loading={updating} 
                            onClick={handleStockUpdate} 
                            className="w-full py-4 rounded-xl font-bold text-lg shadow-md shadow-blue-200 bg-blue-600 hover:bg-blue-700 border-none transition-all" 
                        />
                    </div>
                )}
            </Dialog>
        </div>
    )
}

export default BillingStockPage
