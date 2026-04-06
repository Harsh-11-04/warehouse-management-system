import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { UserSlicePath } from '../../provider/slice/user.slice'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { toast } from 'sonner'
import { 
    useGetBillingInvoiceByIdQuery, 
    useUpdateBillingInvoicePaymentMutation, 
    useReturnBillingInvoiceItemsMutation,
    useAddBillingInvoiceItemsMutation,
    useDeleteBillingInvoiceMutation
} from '../../provider/queries/BillingInvoice.query'
import { useLazySearchBillingProductsQuery } from '../../provider/queries/BillingProduct.query'
import { useGetBillingSettingsQuery } from '../../provider/queries/BillingSettings.query'
import { printInvoice, saveAsPDF } from '../../services/printService'

const BillingInvoiceDetailPage = () => {
    const { id } = useParams<{ id: string }>()
    const { data, isLoading } = useGetBillingInvoiceByIdQuery(id || '')
    const [updatePayment, { isLoading: updating }] = useUpdateBillingInvoicePaymentMutation()
    const [returnItemsMutation, { isLoading: returning }] = useReturnBillingInvoiceItemsMutation()
    const [addItemsMutation, { isLoading: adding }] = useAddBillingInvoiceItemsMutation()
    const [searchProducts, { data: productResults }] = useLazySearchBillingProductsQuery()
    const { data: settingsData } = useGetBillingSettingsQuery()
    const settings = settingsData?.settings || {}
    
    const user = useSelector(UserSlicePath) as { role?: string } | null;
    const isWorker = user?.role === 'warehouse_staff';
    const isAdmin = user?.role === 'admin';

    const navigate = useNavigate()
    const [deleteInvoice, { isLoading: deleting }] = useDeleteBillingInvoiceMutation()

    const invoice = data?.invoice
    const [paymentMode, setPaymentMode] = useState<string | null>(null)
    const [paymentStatus, setPaymentStatus] = useState<string | null>(null)

    // Modals state
    const [showReturnModal, setShowReturnModal] = useState(false)
    const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({})
    const [showAddModal, setShowAddModal] = useState(false)
    const [productSearch, setProductSearch] = useState('')
    const [selectedNewItems, setSelectedNewItems] = useState<any[]>([])

    // Sync local state when data loads
    const currentMode = paymentMode ?? invoice?.paymentMode ?? 'Cash'
    const currentStatus = paymentStatus ?? invoice?.paymentStatus ?? 'Paid'

    const handleUpdatePayment = async () => {
        if (!id) return
        try {
            const res: any = await updatePayment({ id, paymentMode: currentMode, paymentStatus: currentStatus })
            if (res.error) { toast.error(res.error?.data?.message || 'Update failed'); return }
            toast.success('Payment updated successfully')
        } catch (e: any) { toast.error(e.message || 'Error') }
    }

    const handleReturnSubmit = async () => {
        const itemsToReturn = Object.entries(returnQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([productId, quantity]) => ({ productId, quantity }))
        
        if (!itemsToReturn.length) { toast.error("Enter at least one valid return quantity"); return }

        try {
            await returnItemsMutation({ id: id!, itemsToReturn }).unwrap()
            toast.success("Items returned successfully")
            setShowReturnModal(false)
            setReturnQuantities({})
        } catch (e: any) { toast.error(e.data?.message || e.message || "Failed to process return") }
    }

    const handleSearchProduct = (val: string) => {
        setProductSearch(val)
        if (val.length >= 2) searchProducts(val)
    }

    const addProductToNewItemsList = (product: any) => {
        const current = [...selectedNewItems]
        const idx = current.findIndex(i => i.product === product._id)
        if (idx > -1) {
            current[idx].quantity += 1
        } else {
            current.push({
                product: product._id,
                name: product.name,
                barcode: product.barcode,
                quantity: 1,
                price: invoice?.customer?.hasCard && product.cardPrice ? product.cardPrice : product.sellingPrice,
                gstPercent: product.gstPercent || 0
            })
        }
        setSelectedNewItems(current)
        setProductSearch('')
    }

    const handleAddNewItemsSubmit = async () => {
        if (!selectedNewItems.length) { toast.error("Select at least one item"); return }
        try {
            await addItemsMutation({ id: id!, itemsToAdd: selectedNewItems }).unwrap()
            toast.success("Items added successfully")
            setShowAddModal(false)
            setSelectedNewItems([])
        } catch (e: any) { toast.error(e.data?.message || e.message || "Failed to add items") }
    }
    // ── Unified Print handler ─────────────────────────────
    // Auto-detects layout based on default printer (thermal vs a4).
    // Uses the new custom electron print process to prevent scaling issues.
    const handlePrint = async () => {
        toast.info('Sending to printer…')
        const result = await printInvoice(invoice, settings)
        if (!result.success) {
            toast.error(result.error || 'Print failed')
        } else {
            toast.success('Print job sent')
        }
    }

    const handleDeleteInvoice = async () => {
        if (!window.confirm("Are you sure you want to permanently delete this invoice? The stock will be restored to the inventory.")) return;
        try {
            await deleteInvoice(id!).unwrap();
            toast.success("Invoice successfully deleted");
            navigate('/billing');
        } catch (e: any) {
            toast.error(e.data?.message || "Failed to delete invoice");
        }
    }

    // ── Quick visual preview in a popup window ──────────────────────────
    const handleQuickPreview = () => {
        const printArea = document.getElementById('invoice-print-area')
        if (!printArea) return

        const printWindow = window.open('', '_blank', 'width=900,height=700')
        if (!printWindow) {
            toast.error('Could not open preview window.')
            return
        }

        const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(el => el.outerHTML)
            .join('\n')

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice - ${invoice?.invoiceNumber || 'Preview'}</title>
                ${stylesheets}
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        background: white;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                </style>
            </head>
            <body>
                ${printArea.innerHTML}
                <div style="margin-top: 24px; text-align: center; padding: 16px;">
                    <button onclick="window.close()" style="
                        padding: 10px 32px;
                        background: #6b7280;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 15px;
                        cursor: pointer;
                    ">✕ Close Preview</button>
                </div>
            </body>
            </html>
        `)
        printWindow.document.close()
    }

    // ── Save as PDF with dialog ─────────────────────────────────────────
    const handleSavePDF = async () => {
        toast.info('Generating PDF...')
        const result = await saveAsPDF()
        if (result.success) {
            toast.success('PDF saved successfully')
        } else if (result.error !== 'cancelled') {
            toast.error('Failed to save PDF: ' + result.error)
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center text-gray-400">Loading invoice...</div>
    }

    if (!invoice) {
        return <div className="p-8 text-center text-gray-500">Invoice not found. <Link to="/billing" className="text-blue-600 hover:underline">← Back to Dashboard</Link></div>
    }

    return (
        <div className="p-4 max-w-5xl mx-auto">
            {/* Print-friendly container */}
            <div className="bg-white rounded-xl border shadow-sm p-6 md:p-8 print:shadow-none print:border-none" id="invoice-print-area">

                {/* Company Header */}
                <div className="text-center mb-6 border-b pb-4 relative">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Jattkart</h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">The best you got for all your groceries</p>
                    {isAdmin && (
                        <div className="absolute top-0 right-0 print:hidden">
                            <Button
                                label="Delete Invoice"
                                icon="pi pi-trash"
                                severity="danger"
                                size="small"
                                outlined
                                loading={deleting}
                                onClick={handleDeleteInvoice}
                            />
                        </div>
                    )}
                </div>

                {/* Invoice Meta + Customer */}
                <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                            Invoice <span className="text-blue-600">{invoice.invoiceNumber}</span>
                        </h2>
                        <div className="text-sm text-gray-500 mt-1">
                            <strong>Date:</strong> {new Date(invoice.createdAt).toLocaleString('en-IN')}
                        </div>
                        <div className="text-sm text-gray-500">
                            <strong>Billed By:</strong> {invoice.billedBy || 'N/A'}
                        </div>
                    </div>
                    <div className="md:text-right">
                        <div className="text-sm text-gray-500 font-medium">Bill To:</div>
                        <div className="text-sm text-gray-800 font-semibold">
                            {invoice.customerName || 'Walk-in'}
                            {invoice.customerPhone && <span className="text-gray-500 font-normal"> ({invoice.customerPhone})</span>}
                        </div>
                        {invoice.customer?.email && (
                            <div className="text-sm text-gray-500">{invoice.customer.email}</div>
                        )}
                    </div>
                </div>

                {/* Items Table */}
                <div className="overflow-auto mb-6">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-t border-b">
                                <th className="text-left p-3 font-semibold text-gray-700">#</th>
                                <th className="text-left p-3 font-semibold text-gray-700">Item</th>
                                <th className="text-right p-3 font-semibold text-gray-700">MRP (₹)</th>
                                <th className="text-right p-3 font-semibold text-gray-700">Price (₹)</th>
                                <th className="text-right p-3 font-semibold text-gray-700">GST%</th>
                                <th className="text-center p-3 font-semibold text-gray-700">Qty</th>
                                <th className="text-right p-3 font-semibold text-gray-700">GST Amt (₹)</th>
                                <th className="text-right p-3 font-semibold text-gray-700">Line Total (₹)</th>
                                {!isWorker && <th className="text-right p-3 font-semibold text-gray-700 print:hidden">Profit (₹)</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item: any, idx: number) => {
                                const isReturned = item.returnedQuantity > 0;
                                return (
                                    <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50/50 ${isReturned ? 'bg-red-50/30' : ''}`}>
                                        <td className="p-3 text-gray-400">{idx + 1}</td>
                                        <td className="p-3 font-medium text-gray-800">
                                            {item.name}
                                            {isReturned && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 print:hidden">
                                                    Partially Returned
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">{(item.mrp || 0).toFixed(2)}</td>
                                        <td className="p-3 text-right">{(item.price || 0).toFixed(2)}</td>
                                        <td className="p-3 text-right">{(item.gstPercent || 0).toFixed(2)}%</td>
                                        <td className="p-3 text-center">
                                            {item.quantity}
                                            {isReturned && <span className="text-red-500 text-xs ml-1 block">- {item.returnedQuantity} Rtn</span>}
                                        </td>
                                        <td className="p-3 text-right">{(item.gstAmount || 0).toFixed(2)}</td>
                                        <td className="p-3 text-right font-semibold">{(item.lineTotal || 0).toFixed(2)}</td>
                                        {!isWorker && <td className="p-3 text-right font-semibold text-green-600 print:hidden">{(item.profit || 0).toFixed(2)}</td>}
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-300 bg-gray-50/50 text-xs">
                                <td colSpan={7} className="p-2 text-right text-gray-600">Subtotal</td>
                                <td className="p-2 text-right text-gray-600">₹ {(invoice.subtotal || 0).toFixed(2)}</td>
                            </tr>
                            <tr className="text-xs">
                                <td colSpan={7} className="p-2 text-right text-gray-600">Total GST</td>
                                <td className="p-2 text-right text-gray-600">₹ {(invoice.totalGst || 0).toFixed(2)}</td>
                            </tr>
                            {invoice.discount > 0 && (
                                <tr className="text-xs">
                                    <td colSpan={7} className="p-2 text-right text-red-500">Discount ({invoice.discountType === 'percent' ? '%' : 'Flat'})</td>
                                    <td className="p-2 text-right text-red-500">- ₹ {(invoice.discount || 0).toFixed(2)}</td>
                                </tr>
                            )}
                            <tr className="border-t border-gray-300">
                                <td colSpan={7} className="p-3 text-right font-bold text-gray-800 text-base">Grand Total</td>
                                <td colSpan={isWorker ? 1 : 2} className="p-3 text-right font-bold text-xl text-gray-900">₹ {(invoice.grandTotal || 0).toFixed(2)}</td>
                            </tr>
                            {!isWorker && (
                                <tr className="border-t border-gray-100 bg-green-50/30 print:hidden">
                                    <td colSpan={7} className="p-3 text-right font-bold text-green-700 text-sm">Total Profit</td>
                                    <td colSpan={2} className="p-3 text-right font-bold text-lg text-green-700">₹ {(invoice.totalProfit || 0).toFixed(2)}</td>
                                </tr>
                            )}
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Actions (hidden in print) */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2">
                    <Dropdown
                        value={currentMode}
                        options={[{ label: 'Cash', value: 'Cash' }, { label: 'Online', value: 'Online' }]}
                        onChange={(e) => setPaymentMode(e.value)}
                        className="w-36"
                    />
                    <Dropdown
                        value={currentStatus}
                        options={[{ label: 'Paid', value: 'Paid' }, { label: 'Unpaid', value: 'Unpaid' }]}
                        onChange={(e) => setPaymentStatus(e.value)}
                        className="w-36"
                    />
                    <Button
                        label="Update"
                        icon="pi pi-check"
                        severity="info"
                        size="small"
                        onClick={handleUpdatePayment}
                        loading={updating}
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    <Button 
                        label="Add Item" 
                        icon="pi pi-plus" 
                        severity="success" 
                        size="small" 
                        outlined 
                        onClick={() => setShowAddModal(true)} 
                    />
                    <Button 
                        label="Process Return" 
                        icon="pi pi-undo" 
                        severity="warning" 
                        size="small" 
                        outlined 
                        onClick={() => setShowReturnModal(true)} 
                    />
                    <Button
                        label="Print"
                        icon="pi pi-print"
                        size="small"
                        outlined
                        onClick={handlePrint}
                    />
                    <Button
                        label="Preview"
                        icon="pi pi-eye"
                        size="small"
                        outlined
                        severity="info"
                        onClick={handleQuickPreview}
                    />
                    <Button
                        label="Save as PDF"
                        icon="pi pi-file-pdf"
                        size="small"
                        outlined
                        severity="danger"
                        onClick={handleSavePDF}
                    />
                    <Link to="/billing" className="text-blue-600 hover:underline text-sm ml-2">← Dashboard</Link>
                </div>
            </div>

            {/* RETURN ITEMS DIALOG */}
            <Dialog header="Process Return" visible={showReturnModal} style={{ width: '90vw', maxWidth: '600px' }} onHide={() => { setShowReturnModal(false); setReturnQuantities({}) }}>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Select the quantity of items the customer is returning. The invoice total will be recalculated and the stock will be dynamically restored to the warehouse.</p>
                    <table className="w-full text-sm border">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-2 text-left">Item</th>
                                <th className="p-2 text-center">Billed Qty</th>
                                <th className="p-2 text-center">Returned</th>
                                <th className="p-2 text-center">Return Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item: any) => {
                                const maxRet = item.quantity - (item.returnedQuantity || 0);
                                if (maxRet <= 0) return null; // Fully returned

                                return (
                                    <tr key={item.product} className="border-b">
                                        <td className="p-2 font-medium">{item.name}</td>
                                        <td className="p-2 text-center text-gray-500">{item.quantity}</td>
                                        <td className="p-2 text-center text-red-500">{item.returnedQuantity || 0}</td>
                                        <td className="p-2 text-center">
                                            <div className="flex items-center justify-center gap-2 mx-auto w-max">
                                                <Button icon="pi pi-minus" size="small" text rounded onClick={() => {
                                                    setReturnQuantities(prev => ({ ...prev, [item.product]: Math.max(0, (prev[item.product] || 0) - 1) }))
                                                }} />
                                                <span className="w-6 text-center text-lg font-bold">{returnQuantities[item.product] || 0}</span>
                                                <Button icon="pi pi-plus" size="small" text rounded onClick={() => {
                                                    setReturnQuantities(prev => ({ ...prev, [item.product]: Math.min(maxRet, (prev[item.product] || 0) + 1) }))
                                                }} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="flex justify-end pt-4">
                        <Button label="Cancel" icon="pi pi-times" text onClick={() => setShowReturnModal(false)} />
                        <Button label="Confirm Return" icon="pi pi-check" severity="danger" loading={returning} onClick={handleReturnSubmit} className="ml-2" />
                    </div>
                </div>
            </Dialog>

            {/* ADD ITEMS DIALOG */}
            <Dialog header="Add Items to Invoice" visible={showAddModal} style={{ width: '90vw', maxWidth: '600px' }} onHide={() => { setShowAddModal(false); setSelectedNewItems([]); setProductSearch('') }}>
                <div className="space-y-4 h-[400px] flex flex-col">
                    <p className="text-sm text-gray-600">Search for products to add to this invoice. This is perfect for replacing items or adding forgotten products safely.</p>
                    
                    <div className="relative">
                        <span className="p-input-icon-left w-full">
                            <i className="pi pi-search" />
                            <InputText 
                                value={productSearch} 
                                onChange={(e) => handleSearchProduct(e.target.value)} 
                                placeholder="Search products directly..." 
                                className="w-full pl-10" 
                            />
                        </span>
                        {productResults?.products?.length > 0 && productSearch.length >= 2 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-48 overflow-auto">
                                {productResults.products.map((p: any) => (
                                    <button
                                        key={p._id}
                                        className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b flex justify-between items-center"
                                        onClick={() => addProductToNewItemsList(p)}
                                    >
                                        <div>
                                            <div className="font-semibold text-gray-800 text-sm">{p.name}</div>
                                            <div className="text-xs text-blue-600 font-medium">{p.category}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-gray-800">
                                                ₹{(invoice?.customer?.hasCard && p.cardPrice ? p.cardPrice : p.sellingPrice).toFixed(2)}
                                            </div>
                                            <div className="text-xs text-gray-500">Stock: {p.stock}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto border rounded bg-gray-50 p-2">
                        {selectedNewItems.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400 text-sm">No items added yet</div>
                        ) : (
                            <div className="space-y-2">
                                {selectedNewItems.map((item, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded shadow-sm border flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-sm">{item.name}</div>
                                            <div className="text-gray-500 text-xs text-blue-600">₹{item.price.toFixed(2)} <span className="text-gray-400 font-normal ml-1">(+ {item.gstPercent}% GST)</span></div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button icon="pi pi-minus" size="small" severity="secondary" text rounded onClick={() => {
                                                const current = [...selectedNewItems];
                                                if (current[idx].quantity > 1) {
                                                    current[idx].quantity -= 1;
                                                    setSelectedNewItems(current);
                                                } else {
                                                    setSelectedNewItems(current.filter((_, i) => i !== idx));
                                                }
                                            }} />
                                            <span className="w-4 text-center text-sm font-bold">{item.quantity}</span>
                                            <Button icon="pi pi-plus" size="small" severity="secondary" text rounded onClick={() => {
                                                const current = [...selectedNewItems];
                                                current[idx].quantity += 1;
                                                setSelectedNewItems(current);
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-2 border-t mt-auto">
                        <Button label="Cancel" icon="pi pi-times" text onClick={() => setShowAddModal(false)} />
                        <Button label="Add Selected Items" icon="pi pi-plus" severity="success" loading={adding} onClick={handleAddNewItemsSubmit} className="ml-2" disabled={selectedNewItems.length === 0} />
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default BillingInvoiceDetailPage
