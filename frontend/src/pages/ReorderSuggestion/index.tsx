import { useState } from 'react'
import { Dropdown } from 'primereact/dropdown'
import { Button } from 'primereact/button'
import { useGetReorderSuggestionsQuery, useUpdateSuggestionStatusMutation } from '../../provider/queries/ReorderSuggestion.query'
import { toast } from 'sonner'

const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Ordered', value: 'Ordered' },
    { label: 'Ignored', value: 'Ignored' },
]

const statusColors: Record<string, string> = {
    Pending: 'bg-amber-50 text-amber-700',
    Ordered: 'bg-green-50 text-green-700',
    Ignored: 'bg-gray-50 text-gray-500',
}

const ReorderSuggestionPage = () => {
    const [statusFilter, setStatusFilter] = useState('')
    const { data, isLoading, isError } = useGetReorderSuggestionsQuery()
    const [updateStatus, { isLoading: updating }] = useUpdateSuggestionStatusMutation()

    const suggestions = data || []
    const filteredSuggestions = statusFilter
        ? suggestions.filter((s: any) => s.status === statusFilter)
        : suggestions

    const onUpdateStatus = async (id: string, status: 'Ordered' | 'Ignored') => {
        try {
            const res: any = await updateStatus({ id, status })
            if (res.error) {
                toast.error(res.error?.data?.message || 'Update failed')
            } else {
                toast.success(res.data?.msg || `Suggestion marked as ${status}`)
            }
        } catch (e: any) {
            toast.error(e.message || 'Error occurred')
        }
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold">Reorder Suggestions</h1>
                <span className="text-xs text-gray-400">{filteredSuggestions.length} items</span>
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
                    <div className="p-6 text-center text-sm text-gray-400">Loading suggestions…</div>
                ) : isError ? (
                    <div className="p-6 text-center text-sm text-red-500">Failed to load reorder suggestions.</div>
                ) : filteredSuggestions.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-400">
                        No reorder suggestions found{statusFilter ? ` for ${statusFilter}` : ''}.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-left p-3 font-medium text-gray-600">Product</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Stock</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Threshold</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Status</th>
                                    <th className="text-left p-3 font-medium text-gray-600">Suggested Action</th>
                                    <th className="text-right p-3 font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                                {filteredSuggestions.map((s: any) => (
                                    <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-3">
                                            <div className="font-medium text-gray-800">{s.product?.name || 'Unknown'}</div>
                                            <div className="text-[10px] text-gray-400">{s.product?.sku}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className="text-red-500 font-medium">{s.currentQuantity}</span>
                                        </td>
                                        <td className="p-3 text-gray-500">{s.reorderThreshold}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[s.status] || 'bg-gray-100'}`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-500 italic">
                                            Reorder at least {s.suggestedQuantity} units
                                        </td>
                                        <td className="p-3 text-right">
                                            {s.status === 'Pending' && (
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        icon="pi pi-check"
                                                        size="small"
                                                        severity="success"
                                                        text
                                                        rounded
                                                        onClick={() => onUpdateStatus(s._id, 'Ordered')}
                                                        tooltip="Mark as Ordered"
                                                        loading={updating}
                                                    />
                                                    <Button
                                                        icon="pi pi-times"
                                                        size="small"
                                                        severity="danger"
                                                        text
                                                        rounded
                                                        onClick={() => onUpdateStatus(s._id, 'Ignored')}
                                                        tooltip="Ignore"
                                                        loading={updating}
                                                    />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ReorderSuggestionPage
