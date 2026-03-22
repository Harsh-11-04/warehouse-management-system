import { useState } from 'react'
import { Dropdown } from 'primereact/dropdown'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { InputNumber } from 'primereact/inputnumber'
import { InputTextarea } from 'primereact/inputtextarea'
import { toast } from 'sonner'
import {
    useGetDraftPurchaseOrdersQuery,
    useUpdateDraftPurchaseOrderMutation,
    useSubmitForApprovalMutation,
    useApproveDraftPOMutation,
    useRejectDraftPOMutation,
    useMarkAsOrderedMutation,
} from '../../provider/queries/PurchaseOrder.query'
import { useSelector } from 'react-redux'
import { UserSlicePath } from '../../provider/slice/user.slice'

const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Draft', value: 'Draft' },
    { label: 'Pending Approval', value: 'Pending_Approval' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Rejected', value: 'Rejected' },
    { label: 'Ordered', value: 'Ordered' },
]

const statusColors: Record<string, string> = {
    Draft: 'bg-blue-50 text-blue-700',
    Pending_Approval: 'bg-amber-50 text-amber-700',
    Approved: 'bg-green-50 text-green-700',
    Rejected: 'bg-red-50 text-red-700',
    Ordered: 'bg-purple-50 text-purple-700',
}

const PurchaseOrdersPage = () => {
    const [statusFilter, setStatusFilter] = useState('')
    const user = useSelector(UserSlicePath) as { role?: string } | null
    const isManager = ['admin', 'manager'].includes(user?.role || '')

    const { data, isLoading, isError } = useGetDraftPurchaseOrdersQuery(
        statusFilter ? { status: statusFilter } : {}
    )
    const [submitForApproval, { isLoading: submitting }] = useSubmitForApprovalMutation()
    const [approvePO, { isLoading: approving }] = useApproveDraftPOMutation()
    const [rejectPO, { isLoading: rejecting }] = useRejectDraftPOMutation()
    const [markOrdered, { isLoading: ordering }] = useMarkAsOrderedMutation()
    const [updatePO] = useUpdateDraftPurchaseOrderMutation()

    const [editDialog, setEditDialog] = useState(false)
    const [rejectDialog, setRejectDialog] = useState(false)
    const [selectedPO, setSelectedPO] = useState<any>(null)
    const [editForm, setEditForm] = useState({ supplier: '', approvedQuantity: 0, estimatedCost: 0, notes: '' })
    const [rejectReason, setRejectReason] = useState('')

    const purchaseOrders = data?.draftPurchaseOrders || []

    const handleSubmit = async (id: string) => {
        try {
            const res: any = await submitForApproval(id)
            if (res.error) toast.error(res.error?.data?.message || 'Submit failed')
            else toast.success('Submitted for approval')
        } catch (e: any) { toast.error(e.message) }
    }

    const handleApprove = async (id: string) => {
        try {
            const res: any = await approvePO(id)
            if (res.error) toast.error(res.error?.data?.message || 'Approval failed')
            else toast.success('Purchase order approved!')
        } catch (e: any) { toast.error(e.message) }
    }

    const handleReject = async () => {
        if (!selectedPO) return
        try {
            const res: any = await rejectPO({ id: selectedPO._id, reason: rejectReason })
            if (res.error) toast.error(res.error?.data?.message || 'Rejection failed')
            else toast.success('Purchase order rejected')
            setRejectDialog(false)
            setRejectReason('')
        } catch (e: any) { toast.error(e.message) }
    }

    const handleMarkOrdered = async (id: string) => {
        try {
            const res: any = await markOrdered(id)
            if (res.error) toast.error(res.error?.data?.message || 'Failed')
            else toast.success('Marked as ordered!')
        } catch (e: any) { toast.error(e.message) }
    }

    const openEdit = (po: any) => {
        setSelectedPO(po)
        setEditForm({
            supplier: po.supplier || '',
            approvedQuantity: po.approvedQuantity || po.suggestedQuantity,
            estimatedCost: po.estimatedCost || 0,
            notes: po.notes || ''
        })
        setEditDialog(true)
    }

    const handleSaveEdit = async () => {
        if (!selectedPO) return
        try {
            const res: any = await updatePO({ id: selectedPO._id, updates: editForm })
            if (res.error) toast.error(res.error?.data?.message || 'Update failed')
            else toast.success('Purchase order updated')
            setEditDialog(false)
        } catch (e: any) { toast.error(e.message) }
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold">Purchase Orders</h1>
                <span className="text-xs text-gray-400">{purchaseOrders.length} orders</span>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
                <Dropdown
                    value={statusFilter}
                    options={statusOptions}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(e) => setStatusFilter(e.value)}
                    placeholder="Filter by status"
                    className="w-full md:w-52"
                />
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-6 text-center text-sm text-gray-400">Loading purchase orders…</div>
                ) : isError ? (
                    <div className="p-6 text-center text-sm text-red-500">Failed to load purchase orders.</div>
                ) : purchaseOrders.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-400">
                        No purchase orders found{statusFilter ? ` for ${statusFilter.replace('_', ' ')}` : ''}.
                        <br />
                        <span className="text-[10px]">Create one from the Reorder Suggestions page.</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left p-3 font-medium text-gray-600">Product</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Suggested Qty</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Approved Qty</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Supplier</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Est. Cost</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Status</th>
                                    <th className="text-right p-3 font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {purchaseOrders.map((po: any) => (
                                    <tr key={po._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-3">
                                            <div className="font-medium text-gray-800">{po.product?.name || 'Unknown'}</div>
                                            <div className="text-[10px] text-gray-400">{po.product?.sku}</div>
                                        </td>
                                        <td className="p-3 text-gray-500">{po.suggestedQuantity}</td>
                                        <td className="p-3 font-medium">{po.approvedQuantity || '—'}</td>
                                        <td className="p-3 text-gray-500">{po.supplier || '—'}</td>
                                        <td className="p-3 text-gray-500">
                                            {po.estimatedCost ? `₹${po.estimatedCost.toLocaleString('en-IN')}` : '—'}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[po.status] || 'bg-gray-100'}`}>
                                                {po.status?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                {po.status === 'Draft' && (
                                                    <>
                                                        <Button
                                                            icon="pi pi-pencil"
                                                            size="small"
                                                            severity="info"
                                                            text rounded
                                                            onClick={() => openEdit(po)}
                                                            tooltip="Edit"
                                                        />
                                                        <Button
                                                            icon="pi pi-send"
                                                            size="small"
                                                            severity="warning"
                                                            text rounded
                                                            onClick={() => handleSubmit(po._id)}
                                                            loading={submitting}
                                                            tooltip="Submit for Approval"
                                                        />
                                                    </>
                                                )}
                                                {po.status === 'Pending_Approval' && isManager && (
                                                    <>
                                                        <Button
                                                            icon="pi pi-check"
                                                            size="small"
                                                            severity="success"
                                                            text rounded
                                                            onClick={() => handleApprove(po._id)}
                                                            loading={approving}
                                                            tooltip="Approve"
                                                        />
                                                        <Button
                                                            icon="pi pi-times"
                                                            size="small"
                                                            severity="danger"
                                                            text rounded
                                                            onClick={() => { setSelectedPO(po); setRejectDialog(true) }}
                                                            tooltip="Reject"
                                                        />
                                                    </>
                                                )}
                                                {po.status === 'Approved' && (
                                                    <Button
                                                        icon="pi pi-shopping-cart"
                                                        size="small"
                                                        severity="help"
                                                        text rounded
                                                        onClick={() => handleMarkOrdered(po._id)}
                                                        loading={ordering}
                                                        tooltip="Mark as Ordered"
                                                    />
                                                )}
                                                {po.status === 'Rejected' && po.notes && (
                                                    <span className="text-[10px] text-red-400 italic max-w-[120px] truncate" title={po.notes}>
                                                        {po.notes}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog
                header="Edit Purchase Order"
                visible={editDialog}
                onHide={() => setEditDialog(false)}
                className="w-full max-w-md"
            >
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Supplier</label>
                        <InputText
                            value={editForm.supplier}
                            onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                            className="w-full"
                            placeholder="Vendor name"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Approved Quantity</label>
                        <InputNumber
                            value={editForm.approvedQuantity}
                            onValueChange={(e) => setEditForm({ ...editForm, approvedQuantity: e.value || 0 })}
                            className="w-full"
                            min={1}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Estimated Cost (₹)</label>
                        <InputNumber
                            value={editForm.estimatedCost}
                            onValueChange={(e) => setEditForm({ ...editForm, estimatedCost: e.value || 0 })}
                            className="w-full"
                            min={0}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
                        <InputTextarea
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            className="w-full"
                            rows={2}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button label="Cancel" severity="secondary" text onClick={() => setEditDialog(false)} />
                        <Button label="Save" icon="pi pi-check" onClick={handleSaveEdit} />
                    </div>
                </div>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog
                header="Reject Purchase Order"
                visible={rejectDialog}
                onHide={() => setRejectDialog(false)}
                className="w-full max-w-sm"
            >
                <div className="space-y-3">
                    <label className="text-xs font-medium text-gray-600 block">Reason for rejection</label>
                    <InputTextarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full"
                        rows={3}
                        placeholder="Enter reason..."
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button label="Cancel" severity="secondary" text onClick={() => setRejectDialog(false)} />
                        <Button label="Reject" severity="danger" icon="pi pi-times" onClick={handleReject} loading={rejecting} />
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default PurchaseOrdersPage
