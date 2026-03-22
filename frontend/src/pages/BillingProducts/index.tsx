import { FormEvent, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { UserSlicePath } from '../../provider/slice/user.slice'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { toast } from 'sonner'
import {
    useGetAllBillingProductsQuery,
    useCreateBillingProductMutation,
    useUpdateBillingProductMutation,
    useDeleteBillingProductMutation,
    useLazySearchBillingProductsQuery,
} from '../../provider/queries/BillingProduct.query'

const BillingProductsPage = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [search, setSearch] = useState(searchParams.get('query') || '')
    const page = Number(searchParams.get('page')) || 1
    const query = searchParams.get('query') || ''
    const lowStock = searchParams.get('lowStock') === 'true'

    const { data, isLoading } = useGetAllBillingProductsQuery({ page, query, lowStock, limit: 20 })
    const user = useSelector(UserSlicePath) as { role?: string } | null;
    const isWorker = user?.role === 'warehouse_staff';
    
    const [createProduct, { isLoading: creating }] = useCreateBillingProductMutation()
    const [updateProduct] = useUpdateBillingProductMutation()
    const [deleteProduct] = useDeleteBillingProductMutation()
    const [searchProducts, { data: searchResults }] = useLazySearchBillingProductsQuery()
    const [showDropdown, setShowDropdown] = useState(false)

    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({
        barcode: '', name: '', category: '', purchasePrice: '',
        mrp: '', sellingPrice: '', cardPrice: '', gstPercent: '', stock: '', lowStockThreshold: ''
    })

    const products = data?.products || []

    const onSearchSubmit = (e: FormEvent) => {
        e.preventDefault()
        setShowDropdown(false)
        const params = new URLSearchParams()
        if (search) params.set('query', search)
        if (lowStock) params.set('lowStock', 'true')
        params.set('page', '1')
        navigate(`/billing/products?${params.toString()}`)
    }

    const handleSearchInput = (val: string) => {
        setSearch(val)
        if (val.length >= 2) {
            searchProducts(val)
            setShowDropdown(true)
        } else {
            setShowDropdown(false)
        }
    }

    const selectSearchResult = (p: any) => {
        setSearch(p.name)
        setShowDropdown(false)
        const params = new URLSearchParams()
        params.set('query', p.name)
        // Intentionally omitting lowStock here so the selected product is guaranteed to show up
        params.set('page', '1')
        navigate(`/billing/products?${params.toString()}`)
    }

    const clearFilters = () => {
        setSearch('')
        navigate(`/billing/products`)
    }

    const goToPage = (p: number) => {
        const params = new URLSearchParams()
        if (query) params.set('query', query)
        if (lowStock) params.set('lowStock', 'true')
        params.set('page', String(p))
        navigate(`/billing/products?${params.toString()}`)
    }

    const openCreate = () => {
        setEditId(null)
        setForm({ barcode: '', name: '', category: '', purchasePrice: '', mrp: '', sellingPrice: '', cardPrice: '', gstPercent: '', stock: '', lowStockThreshold: '' })
        setShowForm(true)
    }

    const openEdit = (p: any) => {
        setEditId(p._id)
        setForm({
            barcode: p.barcode || '', name: p.name, category: p.category || '',
            purchasePrice: String(p.purchasePrice || 0), mrp: String(p.mrp || 0),
            sellingPrice: String(p.sellingPrice), cardPrice: String(p.cardPrice || 0),
            gstPercent: String(p.gstPercent || 0),
            stock: String(p.stock || 0), lowStockThreshold: String(p.lowStockThreshold || 5)
        })
        setShowForm(true)
    }

    const handleSubmit = async () => {
        if (!form.name || !form.sellingPrice) {
            toast.error('Name and Selling Price are required')
            return
        }
        const payload = {
            barcode: form.barcode, name: form.name, category: form.category,
            purchasePrice: Number(form.purchasePrice) || 0,
            mrp: Number(form.mrp) || 0,
            sellingPrice: Number(form.sellingPrice),
            cardPrice: Number(form.cardPrice) || 0,
            gstPercent: Number(form.gstPercent) || 0,
            stock: Number(form.stock) || 0,
            lowStockThreshold: Number(form.lowStockThreshold) || 5
        }
        try {
            if (editId) {
                const res: any = await updateProduct({ id: editId, data: payload })
                if (res.error) { toast.error(res.error?.data?.message || 'Update failed'); return }
                toast.success('Product updated')
            } else {
                const res: any = await createProduct(payload)
                if (res.error) { toast.error(res.error?.data?.message || 'Create failed'); return }
                toast.success('Product created')
            }
            setShowForm(false)
        } catch (e: any) { toast.error(e.message || 'Error') }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('Deactivate this product?')) return
        try {
            const res: any = await deleteProduct(id)
            if (res.error) { toast.error(res.error?.data?.message || 'Delete failed'); return }
            toast.success('Product deactivated')
        } catch (e: any) { toast.error(e.message) }
    }

    const getStockBadge = (p: any) => {
        if (p.stock === 0) return <span className="px-2 py-1 rounded-full text-xs bg-red-50 text-red-600 font-medium">OUT</span>
        if (p.stock <= p.lowStockThreshold) return <span className="px-2 py-1 rounded-full text-xs bg-yellow-50 text-yellow-700 font-medium">LOW</span>
        return <span className="px-2 py-1 rounded-full text-xs bg-green-50 text-green-700 font-medium">OK</span>
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Jattkart</h1>
                    <p className="text-sm text-gray-500">The best you got for all your groceries — Products</p>
                </div>
                <div className="flex gap-2">
                    {(query || lowStock) && (
                        <Button
                            label="Clear Filters"
                            icon="pi pi-filter-slash"
                            severity="secondary"
                            text
                            size="small"
                            onClick={clearFilters}
                        />
                    )}
                    <Button
                        outlined={!lowStock}
                        label="Low stock"
                        icon="pi pi-exclamation-triangle"
                        severity="warning"
                        size="small"
                        onClick={() => {
                            const params = new URLSearchParams()
                            if (query) params.set('query', query)
                            if (!lowStock) params.set('lowStock', 'true')
                            params.set('page', '1')
                            navigate(`/billing/products?${params.toString()}`)
                        }}
                    />
                    <Button label="Add Product" icon="pi pi-plus" onClick={openCreate} />
                </div>
            </div>

            <form onSubmit={onSearchSubmit} className="relative flex flex-wrap gap-2 items-center">
                <div className="relative w-full md:w-72">
                    <InputText
                        value={search}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        onFocus={() => search.length >= 2 && searchResults?.products?.length && setShowDropdown(true)}
                        placeholder="Search by name, barcode or category"
                        className="w-full"
                    />
                    {showDropdown && searchResults?.products?.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                            {searchResults.products.map((p: any) => (
                                <button
                                    key={p._id}
                                    type="button"
                                    className="w-full text-left px-3 py-2.5 hover:bg-purple-50 border-b border-gray-100 text-sm flex items-center justify-between"
                                    onClick={() => selectSearchResult(p)}
                                >
                                    <span className="font-medium">{p.name}</span>
                                    <span className="text-gray-400 text-xs">₹{p.sellingPrice}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <Button label="Search" icon="pi pi-search" type="submit" size="small" />
            </form>

            <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                    <span>Page {page} • {data?.total || 0} products</span>
                    <div className="flex gap-1">
                        {page > 1 && <Button icon="pi pi-chevron-left" rounded size="small" text onClick={() => goToPage(page - 1)} />}
                        {data && page < data.totalPages && <Button icon="pi pi-chevron-right" rounded size="small" text onClick={() => goToPage(page + 1)} />}
                    </div>
                </div>
                {isLoading ? <div className="text-center py-8 text-gray-400">Loading...</div> : (
                    <div className="overflow-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left p-2 font-medium">Barcode</th>
                                    <th className="text-left p-2 font-medium">Name</th>
                                    <th className="text-left p-2 font-medium">Category</th>
                                    {!isWorker && <th className="text-right p-2 font-medium">Purchase</th>}
                                    <th className="text-right p-2 font-medium">MRP</th>
                                    <th className="text-right p-2 font-medium">Selling</th>
                                     <th className="text-right p-2 font-medium">Card ₹</th>
                                     <th className="text-right p-2 font-medium">GST%</th>
                                    <th className="text-center p-2 font-medium">Stock</th>
                                    <th className="text-left p-2 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.length ? products.map((p: any) => (
                                    <tr key={p._id} className="border-t border-gray-100 hover:bg-blue-50/30">
                                        <td className="p-2 font-mono text-xs text-gray-500">{p.barcode || '-'}</td>
                                        <td className="p-2 font-medium">{p.name}</td>
                                        <td className="p-2 text-gray-500">{p.category || '-'}</td>
                                        {!isWorker && <td className="p-2 text-right">₹{(p.purchasePrice || 0).toLocaleString('en-IN')}</td>}
                                        <td className="p-2 text-right">₹{(p.mrp || 0).toLocaleString('en-IN')}</td>
                                        <td className="p-2 text-right font-semibold">₹{(p.sellingPrice || 0).toLocaleString('en-IN')}</td>
                                         <td className="p-2 text-right text-amber-600 font-medium">{p.cardPrice ? `₹${p.cardPrice.toLocaleString('en-IN')}` : '-'}</td>
                                         <td className="p-2 text-right">{p.gstPercent}%</td>
                                        <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <span>{p.stock}</span>
                                                {getStockBadge(p)}
                                            </div>
                                        </td>
                                        <td className="p-2 flex gap-1">
                                            <Button icon="pi pi-pencil" rounded size="small" text severity="info" onClick={() => openEdit(p)} />
                                            <Button icon="pi pi-trash" rounded size="small" text severity="danger" onClick={() => handleDelete(p._id)} />
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={10} className="p-6 text-center text-gray-400">No products found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Product Dialog */}
            <Dialog header={editId ? 'Edit Product' : 'Add Product'} visible={showForm} onHide={() => setShowForm(false)} className="w-full max-w-lg">
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Barcode</label>
                            <InputText value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Category</label>
                            <InputText value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Name *</label>
                        <InputText value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {!isWorker && (
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Purchase Price</label>
                                <InputText type="number" min={0} value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} className="w-full" />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">MRP</label>
                            <InputText type="number" min={0} value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className="w-full" />
                        </div>
                        <div>
                             <label className="block text-sm text-gray-600 mb-1">Selling Price *</label>
                             <InputText type="number" min={0} value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} className="w-full" />
                         </div>
                         <div>
                             <label className="block text-sm text-gray-600 mb-1">Card Price</label>
                             <InputText type="number" min={0} value={form.cardPrice} onChange={(e) => setForm({ ...form, cardPrice: e.target.value })} className="w-full" />
                         </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">GST %</label>
                            <InputText type="number" min={0} max={100} value={form.gstPercent} onChange={(e) => setForm({ ...form, gstPercent: e.target.value })} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Stock</label>
                            <InputText type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Low Stock Threshold</label>
                            <InputText type="number" min={0} value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} className="w-full" />
                        </div>
                    </div>
                    <Button label={editId ? 'Update' : 'Create'} icon={editId ? 'pi pi-check' : 'pi pi-plus'} onClick={handleSubmit} loading={creating} className="w-full mt-2" />
                </div>
            </Dialog>
        </div>
    )
}

export default BillingProductsPage
