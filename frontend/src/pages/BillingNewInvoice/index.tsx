import { useState, useRef, useEffect } from 'react'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { useCreateBillingInvoiceMutation } from '../../provider/queries/BillingInvoice.query'
import { useLazySearchBillingProductsQuery, useLazyGetBillingProductByBarcodeQuery } from '../../provider/queries/BillingProduct.query'
import { useLazySearchBillingCustomersQuery } from '../../provider/queries/BillingCustomer.query'

interface InvoiceItem {
    product: string
    name: string
    barcode: string
    quantity: number
    price: number
    sellingPrice: number
    cardPrice: number
    gstPercent: number
    gstAmount: number
    lineTotal: number
    stock: number
}

const BillingNewInvoicePage = () => {
    const navigate = useNavigate()
    const barcodeRef = useRef<HTMLInputElement>(null)
    const [barcodeInput, setBarcodeInput] = useState('')
    const [productSearch, setProductSearch] = useState('')
    const [customerSearch, setCustomerSearch] = useState('')
    const [items, setItems] = useState<InvoiceItem[]>([])
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [customerId, setCustomerId] = useState<string | null>(null)
    const [isCardCustomer, setIsCardCustomer] = useState(false)
    const [paymentMode, setPaymentMode] = useState('Cash')
    const [paymentStatus, setPaymentStatus] = useState('Paid')
    const [discount, setDiscount] = useState<number | ''>('')
    const [discountType, setDiscountType] = useState('flat')
    const [focusedProductIndex, setFocusedProductIndex] = useState(-1)
    const [focusedCustomerIndex, setFocusedCustomerIndex] = useState(-1)

    const [searchProducts, { data: productResults }] = useLazySearchBillingProductsQuery()
    const [getByBarcode] = useLazyGetBillingProductByBarcodeQuery()
    const [searchCustomers, { data: customerResults }] = useLazySearchBillingCustomersQuery()
    const [createInvoice, { isLoading: creating }] = useCreateBillingInvoiceMutation()

    useEffect(() => {
        barcodeRef.current?.focus()
    }, [])

    const getEffectivePrice = (product: any, useCard: boolean) => {
        if (useCard && product.cardPrice && product.cardPrice > 0) return product.cardPrice
        return product.sellingPrice
    }

    const addProductToInvoice = (product: any) => {
        const existing = items.find(i => i.product === product._id)
        if (existing) {
            setItems(items.map(i => {
                if (i.product === product._id) {
                    const qty = i.quantity + 1
                    const subtotal = i.price * qty
                    const gstAmt = (subtotal * i.gstPercent) / 100
                    return { ...i, quantity: qty, gstAmount: Math.round(gstAmt * 100) / 100, lineTotal: Math.round((subtotal + gstAmt) * 100) / 100 }
                }
                return i
            }))
        } else {
            const effectivePrice = getEffectivePrice(product, isCardCustomer)
            const subtotal = effectivePrice
            const gstAmt = (subtotal * (product.gstPercent || 0)) / 100
            setItems([...items, {
                product: product._id,
                name: product.name,
                barcode: product.barcode || '',
                quantity: 1,
                price: effectivePrice,
                sellingPrice: product.sellingPrice,
                cardPrice: product.cardPrice || 0,
                gstPercent: product.gstPercent || 0,
                gstAmount: Math.round(gstAmt * 100) / 100,
                lineTotal: Math.round((subtotal + gstAmt) * 100) / 100,
                stock: product.stock || 0,
            }])
        }
        setBarcodeInput('')
        setProductSearch('')
        barcodeRef.current?.focus()
    }

    const recalcItemsForCardStatus = (useCard: boolean) => {
        setItems(prev => prev.map(item => {
            const newPrice = useCard && item.cardPrice > 0 ? item.cardPrice : item.sellingPrice
            const subtotal = newPrice * item.quantity
            const gstAmt = (subtotal * item.gstPercent) / 100
            return {
                ...item,
                price: newPrice,
                gstAmount: Math.round(gstAmt * 100) / 100,
                lineTotal: Math.round((subtotal + gstAmt) * 100) / 100
            }
        }))
    }

    const handleBarcodeScan = async () => {
        if (!barcodeInput.trim()) return
        try {
            const result: any = await getByBarcode(barcodeInput.trim())
            if (result.data?.product) {
                addProductToInvoice(result.data.product)
            } else {
                toast.error('Product not found for this barcode')
            }
        } catch { toast.error('Barcode lookup failed') }
    }

    const handleBarcodeKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleBarcodeScan()
        }
    }

    const handleProductSearch = (query: string) => {
        setProductSearch(query)
        setFocusedProductIndex(-1)
        if (query.length >= 2) searchProducts(query)
    }

    const handleProductKeyDown = (e: React.KeyboardEvent) => {
        const results = productResults?.products || []
        if (!results.length || productSearch.length < 2) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setFocusedProductIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setFocusedProductIndex(prev => (prev > 0 ? prev - 1 : 0))
        } else if (e.key === 'Enter' && focusedProductIndex >= 0) {
            e.preventDefault()
            addProductToInvoice(results[focusedProductIndex])
            setFocusedProductIndex(-1)
        }
    }

    const handleCustomerSearch = (query: string) => {
        setCustomerSearch(query)
        setFocusedCustomerIndex(-1)
        if (!customerId) {
            setCustomerName(query)
        }
        if (query.length >= 2) searchCustomers(query)
    }

    const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
        const results = customerResults?.customers || []
        if (!results.length || customerSearch.length < 2) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setFocusedCustomerIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setFocusedCustomerIndex(prev => (prev > 0 ? prev - 1 : 0))
        } else if (e.key === 'Enter' && focusedCustomerIndex >= 0) {
            e.preventDefault()
            const c = results[focusedCustomerIndex]
            setCustomerId(c._id)
            setCustomerName(c.name)
            setCustomerPhone(c.phone)
            setCustomerSearch('')
            const hasCard = c.hasCard || false
            setIsCardCustomer(hasCard)
            recalcItemsForCardStatus(hasCard)
            setFocusedCustomerIndex(-1)
        }
    }

    const updateItemQuantity = (idx: number, qty: number) => {
        if (qty < 1) return
        setItems(items.map((item, i) => {
            if (i === idx) {
                const subtotal = item.price * qty
                const gstAmt = (subtotal * item.gstPercent) / 100
                return { ...item, quantity: qty, gstAmount: Math.round(gstAmt * 100) / 100, lineTotal: Math.round((subtotal + gstAmt) * 100) / 100 }
            }
            return item
        }))
    }

    const removeItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx))
    }

    const subtotal = items.reduce((sum, i) => sum + (i.price * i.quantity), 0)
    const totalGst = items.reduce((sum, i) => sum + i.gstAmount, 0)
    const rawTotal = Math.round((subtotal + totalGst) * 100) / 100

    let discountAmount = 0
    const discountNum = Number(discount) || 0
    if (discountType === 'percent') {
        discountAmount = Math.round((rawTotal * (discountNum / 100)) * 100) / 100
    } else {
        discountAmount = Math.min(discountNum, rawTotal)
    }
    const grandTotal = Math.max(0, Math.round((rawTotal - discountAmount) * 100) / 100)

    const handleCreateInvoice = async () => {
        if (!items.length) { toast.error('Add at least one item'); return }
        
        // If no customer ID is selected, phone is mandatory to create a new one
        if (!customerId && !customerPhone.trim()) {
            toast.error('Mobile number is mandatory for new customers')
            return
        }
        if (!customerId && !customerName.trim()) {
            toast.error('Customer name is mandatory for new customers')
            return
        }

        try {
            const payload = {
                items: items.map(i => ({
                    product: i.product, name: i.name, barcode: i.barcode,
                    quantity: i.quantity, price: i.price, gstPercent: i.gstPercent
                })),
                customer: customerId,
                customerName, customerPhone, paymentMode, paymentStatus,
                discount: discountNum, discountType
            }
            const res: any = await createInvoice(payload)
            if (res.error) { toast.error(res.error?.data?.message || 'Failed to create invoice'); return }
            toast.success(`Invoice ${res.data?.invoice?.invoiceNumber} created!`)
            navigate(`/billing/invoice/${res.data.invoice._id}`)
        } catch (e: any) { toast.error(e.message || 'Error') }
    }

    return (
        <div className="p-4 space-y-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Jattkart</h1>
                <p className="text-sm text-gray-500">The best you got for all your groceries — New Invoice</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
                {/* Left: Product Entry */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Barcode Scanner */}
                    <div className="bg-white rounded-xl border shadow-sm p-4">
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="block text-sm text-gray-600 mb-1">Scan Barcode</label>
                                <InputText
                                    ref={barcodeRef as any}
                                    value={barcodeInput}
                                    onChange={(e) => setBarcodeInput(e.target.value)}
                                    onKeyDown={handleBarcodeKeyDown}
                                    placeholder="Scan or type barcode..."
                                    className="w-full"
                                />
                            </div>
                            <Button icon="pi pi-search" onClick={handleBarcodeScan} />
                        </div>
                        {/* Product Search */}
                        <div className="mt-3">
                            <label className="block text-sm text-gray-600 mb-1">Or search product</label>
                            <InputText
                                value={productSearch}
                                onChange={(e) => handleProductSearch(e.target.value)}
                                onKeyDown={handleProductKeyDown}
                                placeholder="Search by name..."
                                className="w-full"
                            />
                            {productResults?.products?.length > 0 && productSearch.length >= 2 && (
                                <div className="mt-1 border rounded-lg bg-white shadow-lg max-h-48 overflow-auto">
                                    {productResults.products.map((p: any, idx: number) => (
                                        <button
                                            key={p._id}
                                            className={`w-full text-left px-3 py-2 border-b text-sm flex justify-between ${idx === focusedProductIndex ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                                            onClick={() => {
                                                addProductToInvoice(p)
                                                setFocusedProductIndex(-1)
                                            }}
                                        >
                                            <span>{p.name} {p.barcode && <span className="text-gray-400">({p.barcode})</span>}</span>
                                            <span className="text-gray-500">₹{p.sellingPrice} | Stock: {p.stock}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="bg-white rounded-xl border shadow-sm p-4">
                        <h2 className="text-sm font-semibold text-gray-700 mb-3">Invoice Items</h2>
                        <div className="overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left p-2 font-medium">#</th>
                                        <th className="text-left p-2 font-medium">Product</th>
                                        <th className="text-right p-2 font-medium">Price</th>
                                        <th className="text-center p-2 font-medium">Qty</th>
                                        <th className="text-right p-2 font-medium">GST%</th>
                                        <th className="text-right p-2 font-medium">GST Amt</th>
                                        <th className="text-right p-2 font-medium">Total</th>
                                        <th className="text-center p-2 font-medium">Stock</th>
                                        <th className="p-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length ? items.map((item, idx) => (
                                        <tr key={idx} className="border-t border-gray-100">
                                            <td className="p-2 text-gray-400">{idx + 1}</td>
                                            <td className="p-2 font-medium">{item.name}</td>
                                            <td className="p-2 text-right">₹{item.price.toLocaleString('en-IN')}</td>
                                            <td className="p-2 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200" onClick={() => updateItemQuantity(idx, item.quantity - 1)}>-</button>
                                                    <span className="w-8 text-center">{item.quantity}</span>
                                                    <button className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200" onClick={() => updateItemQuantity(idx, item.quantity + 1)}>+</button>
                                                </div>
                                            </td>
                                            <td className="p-2 text-right">{item.gstPercent}%</td>
                                            <td className="p-2 text-right">₹{item.gstAmount.toLocaleString('en-IN')}</td>
                                            <td className="p-2 text-right font-semibold">₹{item.lineTotal.toLocaleString('en-IN')}</td>
                                            <td className="p-2 text-center">
                                                <span className={`text-xs font-medium ${item.quantity > item.stock ? 'text-red-500' : 'text-green-600'}`}>
                                                    {item.stock}
                                                </span>
                                            </td>
                                            <td className="p-2">
                                                <Button icon="pi pi-times" rounded size="small" text severity="danger" onClick={() => removeItem(idx)} />
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={9} className="p-6 text-center text-gray-400">Scan or search products to add items</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right: Customer & Totals */}
                <div className="space-y-4">
                    {/* Customer */}
                    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-700">Customer</h2>
                            {isCardCustomer && (
                                <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 animate-pulse">💳 Card Pricing Active</span>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Search customer</label>
                            <InputText
                                value={customerSearch}
                                onChange={(e) => handleCustomerSearch(e.target.value)}
                                onKeyDown={handleCustomerKeyDown}
                                placeholder="Search by name or phone"
                                className="w-full"
                            />
                            {customerResults?.customers?.length > 0 && customerSearch.length >= 2 && (
                                <div className="mt-1 border rounded-lg bg-white shadow-lg max-h-32 overflow-auto">
                                    {customerResults.customers.map((c: any, idx: number) => (
                                        <button
                                            key={c._id}
                                            className={`w-full text-left px-3 py-2 border-b text-sm ${idx === focusedCustomerIndex ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                                            onClick={() => {
                                                setCustomerId(c._id)
                                                setCustomerName(c.name)
                                                setCustomerPhone(c.phone)
                                                setCustomerSearch('')
                                                const hasCard = c.hasCard || false
                                                setIsCardCustomer(hasCard)
                                                recalcItemsForCardStatus(hasCard)
                                                setFocusedCustomerIndex(-1)
                                            }}
                                        >
                                            {c.name} — {c.phone} {c.hasCard && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">CARD</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Customer Name {!customerId && <span className="text-red-500">*</span>}
                            </label>
                            <InputText value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                Phone {!customerId && <span className="text-red-500">*</span>}
                            </label>
                            <InputText value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full" />
                        </div>
                    </div>

                    {/* Payment & Totals */}
                    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
                        <h2 className="text-sm font-semibold text-gray-700">Payment</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Mode</label>
                                <Dropdown
                                    value={paymentMode}
                                    options={[{ label: 'Cash', value: 'Cash' }, { label: 'Online', value: 'Online' }]}
                                    onChange={(e) => setPaymentMode(e.value)}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Status</label>
                                <Dropdown
                                    value={paymentStatus}
                                    options={[{ label: 'Paid', value: 'Paid' }, { label: 'Unpaid', value: 'Unpaid' }]}
                                    onChange={(e) => setPaymentStatus(e.value)}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Discount Type</label>
                                <Dropdown
                                    value={discountType}
                                    options={[{ label: 'Flat (₹)', value: 'flat' }, { label: 'Percent (%)', value: 'percent' }]}
                                    onChange={(e) => {
                                        setDiscountType(e.value)
                                        setDiscount('') // reset discount when type changes
                                    }}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Discount Value</label>
                                <InputText
                                    type="number"
                                    min="0"
                                    value={discount as any}
                                    onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder={discountType === 'flat' ? '₹ 0.00' : '0 %'}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="border-t pt-3 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Subtotal:</span>
                                <span>₹{subtotal.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">GST:</span>
                                <span>₹{totalGst.toLocaleString('en-IN')}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-sm text-red-500">
                                    <span>Discount:</span>
                                    <span>- ₹{discountAmount.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                                <span>Grand Total:</span>
                                <span className="text-green-600">₹{grandTotal.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <Button
                            label="Create Invoice"
                            icon="pi pi-check"
                            onClick={handleCreateInvoice}
                            loading={creating}
                            disabled={!items.length}
                            className="w-full"
                            severity="success"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BillingNewInvoicePage
