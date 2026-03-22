import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const BillingSettingsApi = createApi({
    reducerPath: 'billingSettingsApi',
    baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
    tagTypes: ['BillingSettings'],
    endpoints: (builder) => ({
        getBillingSettings: builder.query<any, void>({
            query: () => ({
                url: '/billing/settings/get',
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            providesTags: ['BillingSettings'],
        }),
        updateBillingSettings: builder.mutation<any, any>({
            query: (body) => ({
                url: '/billing/settings/update',
                method: 'PUT',
                body,
                headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
            }),
            invalidatesTags: ['BillingSettings'],
        }),
    }),
})

export const {
    useGetBillingSettingsQuery,
    useUpdateBillingSettingsMutation,
} = BillingSettingsApi

export default BillingSettingsApi
