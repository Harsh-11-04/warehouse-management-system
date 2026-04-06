import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const BillingInvoiceApi = createApi({
    reducerPath: 'BillingInvoiceApi',
    baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
    tagTypes: ['BillingInvoices'],
    endpoints: (builder) => ({
        getAllBillingInvoices: builder.query<any, { page?: number; limit?: number; query?: string; startDate?: string; endDate?: string } | void>({
            query: (args) => {
                const params = new URLSearchParams()
                params.set('page', String(args?.page ?? 1))
                params.set('limit', String(args?.limit ?? 20))
                if (args?.query) params.set('query', args.query)
                if (args?.startDate) params.set('startDate', args.startDate)
                if (args?.endDate) params.set('endDate', args.endDate)
                return {
                    url: `/billing/invoices/get-all?${params.toString()}`,
                    headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
                }
            },
            providesTags: ['BillingInvoices'],
        }),
        getBillingDashboardStats: builder.query<any, void>({
            query: () => ({
                url: '/billing/invoices/dashboard-stats',
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            providesTags: ['BillingInvoices'],
        }),
        getBillingInvoiceById: builder.query<any, string>({
            query: (id) => ({
                url: `/billing/invoices/get/${id}`,
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            providesTags: ['BillingInvoices'],
        }),
        createBillingInvoice: builder.mutation<any, any>({
            query: (body) => ({
                url: '/billing/invoices/create',
                method: 'POST',
                body,
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            invalidatesTags: ['BillingInvoices'],
        }),
        updateBillingInvoicePayment: builder.mutation<any, { id: string; paymentMode: string; paymentStatus: string }>({
            query: ({ id, ...body }) => ({
                url: `/billing/invoices/update-payment/${id}`,
                method: 'PUT',
                body,
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            invalidatesTags: ['BillingInvoices'],
        }),
        returnBillingInvoiceItems: builder.mutation<any, { id: string; itemsToReturn: { productId: string, quantity: number }[] }>({
            query: ({ id, itemsToReturn }) => ({
                url: `/billing/invoices/return/${id}`,
                method: 'PUT',
                body: { itemsToReturn },
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            invalidatesTags: ['BillingInvoices'],
        }),
        addBillingInvoiceItems: builder.mutation<any, { id: string; itemsToAdd: any[] }>({
            query: ({ id, itemsToAdd }) => ({
                url: `/billing/invoices/add-items/${id}`,
                method: 'PUT',
                body: { itemsToAdd },
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            invalidatesTags: ['BillingInvoices'],
        }),
        getBillingReports: builder.query<any, { startDate: string; endDate: string }>({
            query: ({ startDate, endDate }) => ({
                url: `/billing/invoices/reports?startDate=${startDate}&endDate=${endDate}`,
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            providesTags: ['BillingInvoices'],
        }),
        getCustomerInvoices: builder.query<any, string>({
            query: (customerId) => ({
                url: `/billing/invoices/customer/${customerId}`,
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
        }),
        deleteBillingInvoice: builder.mutation<any, string>({
            query: (id) => ({
                url: `/billing/invoices/delete/${id}`,
                method: 'DELETE',
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            invalidatesTags: ['BillingInvoices'],
        }),
    }),
})

export const {
    useGetAllBillingInvoicesQuery,
    useGetBillingDashboardStatsQuery,
    useGetBillingInvoiceByIdQuery,
    useCreateBillingInvoiceMutation,
    useUpdateBillingInvoicePaymentMutation,
    useReturnBillingInvoiceItemsMutation,
    useAddBillingInvoiceItemsMutation,
    useGetBillingReportsQuery,
    useDeleteBillingInvoiceMutation,
    useLazyGetCustomerInvoicesQuery,
} = BillingInvoiceApi
