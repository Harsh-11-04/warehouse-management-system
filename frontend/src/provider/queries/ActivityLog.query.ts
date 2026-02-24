import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const ActivityLogApi = createApi({
  reducerPath: 'ActivityLogApi',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
  endpoints: (builder) => ({
    getActivityLogs: builder.query<any, { page?: number; entity?: string }>({
      query: ({ page = 1, entity = '' }) => ({
        url: `/activity-log/get-all?page=${page}${entity ? `&entity=${entity}` : ''}`,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
    }),
  }),
})

export const { useGetActivityLogsQuery } = ActivityLogApi
