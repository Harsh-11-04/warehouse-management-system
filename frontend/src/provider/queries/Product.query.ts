import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const ProductApi = createApi({
  reducerPath: 'ProductApi',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
  endpoints: () => ({}),
})

export const {} = ProductApi

