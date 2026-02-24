import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const StockLocationApi = createApi({
  reducerPath: 'StockLocationApi',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
  endpoints: () => ({}),
})

export const {} = StockLocationApi

