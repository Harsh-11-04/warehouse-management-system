import { FormEvent, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { useGetAllProductsQuery, useCreateProductMutation, useDeleteProductMutation } from '../../provider/queries/Product.query'
import { toast } from 'sonner'
import { UserSlicePath } from '../../provider/slice/user.slice'

const ProductsPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('query') || '')

  const page = Number(searchParams.get('page')) || 1
  const query = searchParams.get('query') || ''
  const lowStock = searchParams.get('lowStock') === 'true'

  const { data, isLoading, isError } = useGetAllProductsQuery({ page, query, lowStock })
  const [createProduct, { isLoading: creating }] = useCreateProductMutation()
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation()

  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    price: '',
    reorderThreshold: '',
  })

  const user = useSelector(UserSlicePath) as { role?: string } | null
  const role = user?.role || 'warehouse_staff'
  const isAdmin = role === 'admin'

  const products = data?.products || []

  const onSearchSubmit = (e: FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('query', search)
    if (lowStock) params.set('lowStock', 'true')
    params.set('page', '1')
    navigate(`/products?${params.toString()}`)
  }

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams()
    if (query) params.set('query', query)
    if (lowStock) params.set('lowStock', 'true')
    params.set('page', String(nextPage))
    navigate(`/products?${params.toString()}`)
  }

  const submitCreate = async () => {
    if (!form.name || !form.sku || !form.category || !form.price) {
      toast.error('Name, SKU, Category and Price are required')
      return
    }
    try {
      const res: any = await createProduct({
        name: form.name,
        sku: form.sku,
        category: form.category,
        price: Number(form.price),
        reorderThreshold: form.reorderThreshold ? Number(form.reorderThreshold) : undefined,
      })
      if (res.error) {
        toast.error(res.error?.data?.message || 'Failed to create product')
      } else {
        toast.success(res.data?.msg || 'Product created')
        setForm({ name: '', sku: '', category: '', price: '', reorderThreshold: '' })
      }
    } catch (e: any) {
      toast.error(e.message || 'Error creating product')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deactivate this product?')) return
    try {
      const res: any = await deleteProduct(id)
      if (res.error) {
        toast.error(res.error?.data?.message || 'Delete failed')
      } else {
        toast.success(res.data?.msg || 'Product deactivated')
      }
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  if (isLoading) {
    return <div className="p-4">Loading products…</div>
  }

  if (isError) {
    return <div className="p-4 text-red-500 text-sm">Failed to load products.</div>
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button
          outlined={!!lowStock}
          label="Low stock only"
          icon="pi pi-exclamation-triangle"
          severity="warning"
          size="small"
          onClick={() => {
            const params = new URLSearchParams()
            if (query) params.set('query', query)
            if (!lowStock) params.set('lowStock', 'true')
            params.set('page', '1')
            navigate(`/products?${params.toString()}`)
          }}
        />
      </div>

      <form onSubmit={onSearchSubmit} className="flex flex-wrap gap-2 items-center">
        <InputText
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, SKU or category"
          className="w-full md:w-64"
        />
        <Button label="Search" icon="pi pi-search" type="submit" size="small" />
      </form>

      <div className="grid lg:grid-cols-3 gap-4">
        {isAdmin && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Create Product</h2>
            <div className="grid gap-2 text-sm">
              <div>
                <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">Name</label>
                <InputText
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full text-sm"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">SKU</label>
                <InputText
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full text-sm"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">Category</label>
                <InputText
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">Price</label>
                  <InputText
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    type="number"
                    min={0}
                    className="w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs text-gray-500 dark:text-gray-400">
                    Reorder Threshold
                  </label>
                  <InputText
                    value={form.reorderThreshold}
                    onChange={(e) => setForm({ ...form, reorderThreshold: e.target.value })}
                    type="number"
                    min={0}
                    className="w-full text-sm"
                  />
                </div>
              </div>
            </div>
            <Button
              label="Create Product"
              icon="pi pi-plus"
              onClick={submitCreate}
              loading={creating}
              className="w-full mt-2"
            />
          </div>
        )}

        <div className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-4 ${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="flex items-center justify-between mb-2 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Page {page} • {products.length} items
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
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">SKU</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Price</th>
                  <th className="text-left p-2">On Hand</th>
                  <th className="text-left p-2">Reorder</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length ? (
                  products.map((p: any) => (
                    <tr key={p._id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="p-2">{p.name}</td>
                      <td className="p-2">{p.sku}</td>
                      <td className="p-2">{p.category}</td>
                      <td className="p-2">₹{(p.price || 0).toLocaleString('en-IN')}</td>
                      <td className="p-2">{p.totalQuantity}</td>
                      <td className="p-2">{p.reorderThreshold}</td>
                      <td className="p-2 text-xs">
                        {p.status === 'Active' ? (
                          <span className="px-2 py-1 rounded-full bg-green-50 text-green-700">Active</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-500">Inactive</span>
                        )}
                      </td>
                      <td className="p-2">
                        {isAdmin && (
                          <Button
                            size="small"
                            icon="pi pi-trash"
                            text
                            rounded
                            severity="danger"
                            loading={deleting}
                            onClick={() => handleDelete(p._id)}
                            aria-label="Deactivate"
                          />
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-3 text-xs text-gray-400">
                      No products found.
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

export default ProductsPage
