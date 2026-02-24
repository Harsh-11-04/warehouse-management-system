import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const ReorderSuggestionApi = createApi({
    reducerPath: 'ReorderSuggestionApi',
    baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
    tagTypes: ['ReorderSuggestion'],
    endpoints: (builder) => ({
        getReorderSuggestions: builder.query<any, void>({
            query: () => ({
                url: '/reorder-suggestions',
                method: 'GET',
                headers: {
                    Authorization: 'Bearer ' + localStorage.getItem('token'),
                },
            }),
            providesTags: ['ReorderSuggestion'],
        }),
        updateSuggestionStatus: builder.mutation<any, { id: string; status: 'Ordered' | 'Ignored' | 'Pending' }>({
            query: ({ id, status }) => ({
                url: `/reorder-suggestions/${id}/status`,
                method: 'PATCH',
                body: { status },
                headers: {
                    Authorization: 'Bearer ' + localStorage.getItem('token'),
                },
            }),
            invalidatesTags: ['ReorderSuggestion'],
        }),
    }),
})

export const { useGetReorderSuggestionsQuery, useUpdateSuggestionStatusMutation } = ReorderSuggestionApi
