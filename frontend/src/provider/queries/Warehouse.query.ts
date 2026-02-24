import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const WarehouseApi = createApi({
  reducerPath: 'WarehouseApi',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
  endpoints: (builder) => ({
    getWarehouses: builder.query<any, { page?: number; query?: string } | void>({
      query: (args) => {
        const page = args?.page ?? 1
        const query = args?.query ?? ''
        return {
          url: `/warehouse/get-all?page=${page}&query=${encodeURIComponent(query)}`,
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('token'),
          },
        }
      },
    }),
    getLocationsByWarehouse: builder.query<any, string>({
      query: (warehouseId) => ({
        url: `/warehouse/locations/${warehouseId}`,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
    }),
    getLocationByScan: builder.query<any, string>({
      query: (locationId) => ({
        url: `/warehouse/location-by-scan/${locationId}`,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
    }),
  }),
})

export const {
  useGetWarehousesQuery,
  useLazyGetWarehousesQuery,
  useGetLocationsByWarehouseQuery,
  useLazyGetLocationsByWarehouseQuery,
  useGetLocationByScanQuery,
  useLazyGetLocationByScanQuery,
} = WarehouseApi
