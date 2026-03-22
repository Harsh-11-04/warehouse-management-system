import { FormEvent, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { toast } from 'sonner'
import {
    useGetAllBillingCustomersQuery,
    useCreateBillingCustomerMutation,
    useUpdateBillingCustomerMutation,
    useDeleteBillingCustomerMutation,
    useLazySearchBillingCustomersQuery,
} from '../../provider/queries/BillingCustomer.query'
import { useLazyGetCustomerInvoicesQuery } from '../../provider/queries/BillingInvoice.query'

const BillingCustomersPage = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [search, setSearch] = useState(searchParams.get('query') || '')
    const page = Number(searchParams.get('page')) || 1
    const query = searchParams.get('query') || ''

    const { data, isLoading } = useGetAllBillingCustomersQuery({ page, query, limit: 20 })
    const [createCustomer, { isLoading: creating }] = useCreateBillingCustomerMutation()
    const [updateCustomer] = useUpdateBillingCustomerMutation()
    const [deleteCustomer] = useDeleteBillingCustomerMutation()
    const [searchCustomers, { data: searchResults }] = useLazySearchBillingCustomersQuery()
    const [getCustomerInvoices, { isFetching: loadingHistory }] = useLazyGetCustomerInvoicesQuery()
    const [showDropdown, setShowDropdown] = useState(false)

    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', gstNumber: '', hasCard: false })

    // History state
    const [showHistory, setShowHistory] = useState(false)
    const [historyData, setHistoryData] = useState<any[]>([])
    const [historyCustomerName, setHistoryCustomerName] = useState('')

    const customers = data?.customers || []

    const onSearchSubmit = (e: FormEvent) => {
        e.preventDefault()
        setShowDropdown(false)
        const params = new URLSearchParams()
        if (search) params.set('query', search)
        params.set('page', '1')
        navigate(`/billing/customers?${params.toString()}`)
    }

    const handleSearchInput = (val: string) => {
        setSearch(val)
        if (val.length >= 2) {
            searchCustomers(val)
            setShowDropdown(true)
        } else {
            setShowDropdown(false)
        }
    }

    const selectSearchResult = (c: any) => {
        setSearch(c.name)
        setShowDropdown(false)
        const params = new URLSearchParams()
        params.set('query', c.name)
        params.set('page', '1')
        navigate(`/billing/customers?${params.toString()}`)
    }

    const goToPage = (p: number) => {
        const params = new URLSearchParams()
        if (query) params.set('query', query)
        params.set('page', String(p))
        navigate(`/billing/customers?${params.toString()}`)
    }

    const openCreate = () => {
        setEditId(null)
        setForm({ name: '', phone: '', email: '', address: '', gstNumber: '', hasCard: false })
        setShowForm(true)
    }

    const openEdit = (c: any) => {
        setEditId(c._id)
        setForm({ name: c.name, phone: c.phone, email: c.email || '', address: c.address || '', gstNumber: c.gstNumber || '', hasCard: c.hasCard || false })
        setShowForm(true)
    }

    const handleSubmit = async () => {
        if (!form.name || !form.phone) {
            toast.error('Name and Phone are required')
            return
        }
        try {
            if (editId) {
                const res: any = await updateCustomer({ id: editId, data: form })
                if (res.error) { toast.error(res.error?.data?.message || 'Update failed'); return }
                toast.success('Customer updated')
            } else {
                const res: any = await createCustomer(form)
                if (res.error) { toast.error(res.error?.data?.message || 'Create failed'); return }
                toast.success('Customer created')
            }
            setShowForm(false)
        } catch (e: any) {
            toast.error(e.message || 'Error')
        }
    }

    const handleDelete = async (id: string) => {
        if (!window.confirm('Deactivate this customer?')) return
        try {
            const res: any = await deleteCustomer(id)
            if (res.error) { toast.error(res.error?.data?.message || 'Delete failed'); return }
            toast.success('Customer deactivated')
        } catch (e: any) { toast.error(e.message) }
    }

    const openHistory = async (c: any) => {
        setHistoryCustomerName(c.name)
        setShowHistory(true)
        const res: any = await getCustomerInvoices(c._id)
        if (res.data?.invoices) {
            setHistoryData(res.data.invoices)
        }
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Jattkart</h1>
                    <p className="text-sm text-gray-500">The best you got for all your groceries — Customers</p>
                </div>
                <Button label="Add Customer" icon="pi pi-plus" onClick={openCreate} />
            </div>

            <form onSubmit={onSearchSubmit} className="relative flex flex-wrap gap-2 items-center">
                <div className="relative w-full md:w-72">
                    <InputText
                        value={search}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                        onFocus={() => search.length >= 2 && searchResults?.customers?.length && setShowDropdown(true)}
                        placeholder="Search by name, phone, or email"
                        className="w-full"
                    />
                    {showDropdown && searchResults?.customers?.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                            {searchResults.customers.map((c: any) => (
                                <button
                                    key={c._id}
                                    type="button"
                                    className="w-full text-left px-3 py-2.5 hover:bg-purple-50 border-b border-gray-100 text-sm flex items-center justify-between"
                                    onClick={() => selectSearchResult(c)}
                                >
                                    <span className="font-medium">{c.name}</span>
                                    <span className="text-gray-400 text-xs">{c.phone}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <Button label="Search" icon="pi pi-search" type="submit" size="small" />
            </form>

            <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                    <span>Page {page} • {data?.total || 0} customers</span>
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
                                    <th className="text-left p-3 font-medium">Name</th>
                                     <th className="text-left p-3 font-medium">Phone</th>
                                     <th className="text-left p-3 font-medium">Type</th>
                                     <th className="text-left p-3 font-medium">Email</th>
                                     <th className="text-left p-3 font-medium">Address</th>
                                     <th className="text-left p-3 font-medium">GST No.</th>
                                     <th className="text-left p-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.length ? customers.map((c: any) => (
                                    <tr key={c._id} className="border-t border-gray-100 hover:bg-blue-50/30">
                                        <td className="p-3 font-medium">{c.name}</td>
                                         <td className="p-3">{c.phone}</td>
                                         <td className="p-3">
                                             {c.hasCard ? (
                                                 <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">CARD</span>
                                             ) : (
                                                 <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Regular</span>
                                             )}
                                         </td>
                                        <td className="p-3 text-gray-500">{c.email || '-'}</td>
                                        <td className="p-3 text-gray-500 max-w-[200px] truncate">{c.address || '-'}</td>
                                        <td className="p-3 text-gray-500">{c.gstNumber || '-'}</td>
                                        <td className="p-3 flex gap-1">
                                            <Button icon="pi pi-history" rounded size="small" text severity="help" onClick={() => openHistory(c)} title="Purchase History" />
                                            <Button icon="pi pi-pencil" rounded size="small" text severity="info" onClick={() => openEdit(c)} />
                                            <Button icon="pi pi-trash" rounded size="small" text severity="danger" onClick={() => handleDelete(c._id)} />
                                        </td>
                                    </tr>
                                )) : (
                                     <tr><td colSpan={7} className="p-6 text-center text-gray-400">No customers found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Dialog */}
            <Dialog
                header={editId ? 'Edit Customer' : 'Add Customer'}
                visible={showForm}
                onHide={() => setShowForm(false)}
                className="w-full max-w-md"
            >
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Name *</label>
                        <InputText value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Phone *</label>
                        <InputText value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full" />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Email</label>
                        <InputText value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full" />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Address</label>
                        <InputText value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full" />
                    </div>
                    <div>
                         <label className="block text-sm text-gray-600 mb-1">GST Number</label>
                         <InputText value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} className="w-full" />
                     </div>
                     <div className="flex items-center gap-3 pt-1">
                         <label className="text-sm text-gray-600">Card Holder (₹200 subscription)</label>
                         <button
                             type="button"
                             onClick={() => setForm({ ...form, hasCard: !form.hasCard })}
                             className={`relative w-11 h-6 rounded-full transition-colors ${
                                 form.hasCard ? 'bg-amber-500' : 'bg-gray-300'
                             }`}
                         >
                             <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                                 form.hasCard ? 'translate-x-5' : 'translate-x-0'
                             }`} />
                         </button>
                     </div>
                    <Button
                        label={editId ? 'Update' : 'Create'}
                        icon={editId ? 'pi pi-check' : 'pi pi-plus'}
                        onClick={handleSubmit}
                        loading={creating}
                        className="w-full mt-2"
                    />
                </div>
            </Dialog>

            {/* Purchase History Dialog */}
            <Dialog
                header={`Purchase History: ${historyCustomerName}`}
                visible={showHistory}
                onHide={() => { setShowHistory(false); setHistoryData([]) }}
                className="w-full max-w-4xl"
            >
                {loadingHistory ? (
                    <div className="py-8 text-center text-gray-500"><i className="pi pi-spin pi-spinner text-2xl"></i> Loading history...</div>
                ) : historyData.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">No purchase history found for this customer.</div>
                ) : (
                    <div className="overflow-auto max-h-[60vh]">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="p-3 text-left font-medium">Date</th>
                                    <th className="p-3 text-left font-medium">Invoice No.</th>
                                    <th className="p-3 text-left font-medium">Items</th>
                                    <th className="p-3 text-right font-medium">Total</th>
                                    <th className="p-3 text-left font-medium">Payment</th>
                                    <th className="p-3 text-center font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyData.map((inv) => (
                                    <tr key={inv._id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="p-3">{new Date(inv.createdAt).toLocaleDateString()}</td>
                                        <td className="p-3 font-medium text-blue-600">#{inv.invoiceNumber}</td>
                                        <td className="p-3 text-gray-500">{inv.items?.length || 0} items</td>
                                        <td className="p-3 text-right font-semibold">₹{(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${inv.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {inv.paymentStatus} ({inv.paymentMode})
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <Button icon="pi pi-external-link" size="small" rounded text onClick={() => navigate(`/billing/invoice/${inv._id}`)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Dialog>
        </div>
    )
}

export default BillingCustomersPage
