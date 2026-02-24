import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const ActivityLogApi = createApi({
  reducerPath: 'ActivityLogApi',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
  endpoints: () => ({}),
})

export const {} = ActivityLogApi

