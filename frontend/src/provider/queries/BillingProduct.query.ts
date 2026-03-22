import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const BillingProductApi = createApi({
    reducerPath: 'BillingProductApi',
    baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
    tagTypes: ['BillingProducts'],
    endpoints: (builder) => ({
        getAllBillingProducts: builder.query<any, { page?: number; limit?: number; query?: string; lowStock?: boolean } | void>({
            query: (args) => {
                const p = args?.page ?? 1
                const q = args?.query ?? ''
                const ls = args?.lowStock ? '&lowStock=true' : ''
                return {
                    url: `/billing/products/get-all?page=${p}&limit=${args?.limit ?? 20}&query=${encodeURIComponent(q)}${ls}`,
                    headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
                }
            },
            providesTags: ['BillingProducts'],
        }),
        searchBillingProducts: builder.query<any, string>({
            query: (q) => ({
                url: `/billing/products/search?query=${encodeURIComponent(q)}`,
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
        }),
        getBillingProductByBarcode: builder.query<any, string>({
            query: (barcode) => ({
                url: `/billing/products/barcode/${encodeURIComponent(barcode)}`,
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
        }),
        getStockStats: builder.query<any, void>({
            query: () => ({
                url: '/billing/products/stock-stats',
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            providesTags: ['BillingProducts'],
        }),
        createBillingProduct: builder.mutation<any, any>({
            query: (body) => ({
                url: '/billing/products/create',
                method: 'POST',
                body,
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            invalidatesTags: ['BillingProducts'],
        }),
        updateBillingProduct: builder.mutation<any, { id: string; data: any }>({
            query: ({ id, data }) => ({
                url: `/billing/products/update/${id}`,
                method: 'PATCH',
                body: data,
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            invalidatesTags: ['BillingProducts'],
        }),
        updateBillingProductStock: builder.mutation<any, { id: string; stock: number }>({
            query: ({ id, stock }) => ({
                url: `/billing/products/update-stock/${id}`,
                method: 'PATCH',
                body: { stock },
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            invalidatesTags: ['BillingProducts'],
        }),
        deleteBillingProduct: builder.mutation<any, string>({
            query: (id) => ({
                url: `/billing/products/delete/${id}`,
                method: 'DELETE',
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            invalidatesTags: ['BillingProducts'],
        }),
    }),
})

export const {
    useGetAllBillingProductsQuery,
    useLazySearchBillingProductsQuery,
    useLazyGetBillingProductByBarcodeQuery,
    useGetStockStatsQuery,
    useCreateBillingProductMutation,
    useUpdateBillingProductMutation,
    useUpdateBillingProductStockMutation,
    useDeleteBillingProductMutation,
} = BillingProductApi
