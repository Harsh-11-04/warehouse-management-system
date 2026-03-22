import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const BillingCustomerApi = createApi({
    reducerPath: 'BillingCustomerApi',
    baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
    tagTypes: ['BillingCustomers'],
    endpoints: (builder) => ({
        getAllBillingCustomers: builder.query<any, { page?: number; limit?: number; query?: string } | void>({
            query: (args) => ({
                url: `/billing/customers/get-all?page=${args?.page ?? 1}&limit=${args?.limit ?? 20}&query=${encodeURIComponent(args?.query ?? '')}`,
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            providesTags: ['BillingCustomers'],
        }),
        searchBillingCustomers: builder.query<any, string>({
            query: (q) => ({
                url: `/billing/customers/search?query=${encodeURIComponent(q)}`,
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
        }),
        createBillingCustomer: builder.mutation<any, { name: string; phone: string; email?: string; address?: string; gstNumber?: string }>({
            query: (body) => ({
                url: '/billing/customers/create',
                method: 'POST',
                body,
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            invalidatesTags: ['BillingCustomers'],
        }),
        updateBillingCustomer: builder.mutation<any, { id: string; data: any }>({
            query: ({ id, data }) => ({
                url: `/billing/customers/update/${id}`,
                method: 'PATCH',
                body: data,
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            invalidatesTags: ['BillingCustomers'],
        }),
        deleteBillingCustomer: builder.mutation<any, string>({
            query: (id) => ({
                url: `/billing/customers/delete/${id}`,
                method: 'DELETE',
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            invalidatesTags: ['BillingCustomers'],
        }),
    }),
})

export const {
    useGetAllBillingCustomersQuery,
    useLazySearchBillingCustomersQuery,
    useCreateBillingCustomerMutation,
    useUpdateBillingCustomerMutation,
    useDeleteBillingCustomerMutation,
} = BillingCustomerApi
