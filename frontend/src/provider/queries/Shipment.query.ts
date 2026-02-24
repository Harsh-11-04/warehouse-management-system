import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const ShipmentApi = createApi({
  reducerPath: 'ShipmentApi',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
  endpoints: () => ({}),
})

export const {} = ShipmentApi

