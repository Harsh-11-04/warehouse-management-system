import { useState, useEffect } from 'react'
import { InputText } from 'primereact/inputtext'
import { Button } from 'primereact/button'
import { toast } from 'sonner'
import {
    useGetBillingSettingsQuery,
    useUpdateBillingSettingsMutation,
} from '../../provider/queries/BillingSettings.query'

const BillingSettingsPage = () => {
    const { data, isLoading } = useGetBillingSettingsQuery()
    const [updateSettings, { isLoading: saving }] = useUpdateBillingSettingsMutation()

    const [form, setForm] = useState({
        storeName: '', storeAddress: '', storePhone: '', storeEmail: '',
        gstNumber: '', currencySymbol: '₹', invoicePrefix: 'INV', invoiceFooter: 'Thank you for your business!', logoUrl: ''
    })

    useEffect(() => {
        if (data?.settings) {
            const s = data.settings
            setForm({
                storeName: s.storeName || '', storeAddress: s.storeAddress || '',
                storePhone: s.storePhone || '', storeEmail: s.storeEmail || '',
                gstNumber: s.gstNumber || '', currencySymbol: s.currencySymbol || '₹',
                invoicePrefix: s.invoicePrefix || 'INV', invoiceFooter: s.invoiceFooter || '',
                logoUrl: s.logoUrl || ''
            })
        }
    }, [data])

    const handleSave = async () => {
        try {
            const res: any = await updateSettings(form)
            if (res.error) { toast.error(res.error?.data?.message || 'Save failed'); return }
            toast.success('Settings saved successfully!')
        } catch (e: any) { toast.error(e.message) }
    }

    const Field = ({ label, field, placeholder, icon, textarea }: { label: string; field: keyof typeof form; placeholder: string; icon: string; textarea?: boolean }) => (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <i className={`${icon} text-sm`}></i> {label}
            </label>
            {textarea ? (
                <textarea
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    placeholder={placeholder}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl font-medium text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none resize-none"
                />
            ) : (
                <InputText
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full h-12 px-4 border-gray-200 rounded-xl font-medium"
                />
            )}
        </div>
    )

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center">
            <i className="pi pi-spin pi-spinner text-5xl text-indigo-500"></i>
        </div>
    )

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8 bg-gray-50/50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 tracking-tight">Jattkart</h1>
                    <p className="text-gray-500 mt-1">The best you got for all your groceries — Settings</p>
                </div>
                <Button
                    label="Save All Changes"
                    icon="pi pi-check"
                    loading={saving}
                    onClick={handleSave}
                    className="h-12 px-8 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 border-none shadow-md shadow-blue-200"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Store Information */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><i className="pi pi-building text-xl"></i></div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Store Information</h2>
                            <p className="text-xs text-gray-400">Your business details shown on invoices</p>
                        </div>
                    </div>
                    <Field label="Store Name" field="storeName" placeholder="My Awesome Store" icon="pi pi-shop" />
                    <Field label="Store Address" field="storeAddress" placeholder="123 Main St, City, State" icon="pi pi-map-marker" textarea />
                    <Field label="Phone Number" field="storePhone" placeholder="+91 98765 43210" icon="pi pi-phone" />
                    <Field label="Email Address" field="storeEmail" placeholder="billing@mystore.com" icon="pi pi-envelope" />
                </div>

                {/* Tax & Legal */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><i className="pi pi-id-card text-xl"></i></div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Tax & Legal</h2>
                            <p className="text-xs text-gray-400">GST and legal identification</p>
                        </div>
                    </div>
                    <Field label="GST Number" field="gstNumber" placeholder="22AAAAA0000A1Z5" icon="pi pi-hashtag" />
                    <Field label="Logo URL" field="logoUrl" placeholder="https://mystore.com/logo.png" icon="pi pi-image" />
                    {form.logoUrl && (
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <img src={form.logoUrl} alt="Store Logo" className="w-16 h-16 object-contain rounded-lg border" onError={(e: any) => { e.target.style.display = 'none' }} />
                            <p className="text-xs text-gray-400">Logo preview</p>
                        </div>
                    )}
                </div>

                {/* Invoice Configuration */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-xl bg-violet-50 text-violet-600"><i className="pi pi-file text-xl"></i></div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Invoice Configuration</h2>
                            <p className="text-xs text-gray-400">Customize invoice numbering and content</p>
                        </div>
                    </div>
                    <Field label="Invoice Prefix" field="invoicePrefix" placeholder="INV" icon="pi pi-list" />
                    <Field label="Invoice Footer Message" field="invoiceFooter" placeholder="Thank you for your business!" icon="pi pi-comment" textarea />
                </div>

                {/* Currency */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 rounded-xl bg-amber-50 text-amber-600"><i className="pi pi-money-bill text-xl"></i></div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Currency</h2>
                            <p className="text-xs text-gray-400">Set your preferred currency</p>
                        </div>
                    </div>
                    <Field label="Currency Symbol" field="currencySymbol" placeholder="₹" icon="pi pi-indian-rupee" />
                    <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                        <p className="text-sm text-amber-800 font-medium">Preview: <span className="font-black text-lg text-amber-700">{form.currencySymbol}1,000.00</span></p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BillingSettingsPage
