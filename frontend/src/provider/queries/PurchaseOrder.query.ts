import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const PurchaseOrderApi = createApi({
    reducerPath: 'PurchaseOrderApi',
    baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
    tagTypes: ['PurchaseOrder'],
    endpoints: (builder) => ({
        getDraftPurchaseOrders: builder.query<any, { status?: string }>({
            query: ({ status } = {}) => ({
                url: '/draft-purchase-orders',
                method: 'GET',
                params: status ? { status } : {},
                headers: {
                    Authorization: 'Bearer ' + localStorage.getItem('token'),
                },
            }),
            providesTags: ['PurchaseOrder'],
        }),
        createDraftPurchaseOrder: builder.mutation<any, { reorderSuggestionId: string; approvedQuantity?: number; supplier?: string; estimatedCost?: number }>({
            query: (body) => ({
                url: '/draft-purchase-orders',
                method: 'POST',
                body,
                headers: {
                    Authorization: 'Bearer ' + localStorage.getItem('token'),
                },
            }),
            invalidatesTags: ['PurchaseOrder'],
        }),
        updateDraftPurchaseOrder: builder.mutation<any, { id: string; updates: any }>({
            query: ({ id, updates }) => ({
                url: `/draft-purchase-orders/${id}`,
                method: 'PUT',
                body: updates,
                headers: {
                    Authorization: 'Bearer ' + localStorage.getItem('token'),
                },
            }),
            invalidatesTags: ['PurchaseOrder'],
        }),
        submitForApproval: builder.mutation<any, string>({
            query: (id) => ({
                url: `/draft-purchase-orders/${id}/submit`,
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + localStorage.getItem('token'),
                },
            }),
            invalidatesTags: ['PurchaseOrder'],
        }),
        approveDraftPO: builder.mutation<any, string>({
            query: (id) => ({
                url: `/draft-purchase-orders/${id}/approve`,
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + localStorage.getItem('token'),
                },
            }),
            invalidatesTags: ['PurchaseOrder'],
        }),
        rejectDraftPO: builder.mutation<any, { id: string; reason: string }>({
            query: ({ id, reason }) => ({
                url: `/draft-purchase-orders/${id}/reject`,
                method: 'POST',
                body: { reason },
                headers: {
                    Authorization: 'Bearer ' + localStorage.getItem('token'),
                },
            }),
            invalidatesTags: ['PurchaseOrder'],
        }),
        markAsOrdered: builder.mutation<any, string>({
            query: (id) => ({
                url: `/draft-purchase-orders/${id}/mark-ordered`,
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + localStorage.getItem('token'),
                },
            }),
            invalidatesTags: ['PurchaseOrder'],
        }),
    }),
})

export const {
    useGetDraftPurchaseOrdersQuery,
    useCreateDraftPurchaseOrderMutation,
    useUpdateDraftPurchaseOrderMutation,
    useSubmitForApprovalMutation,
    useApproveDraftPOMutation,
    useRejectDraftPOMutation,
    useMarkAsOrderedMutation,
} = PurchaseOrderApi
