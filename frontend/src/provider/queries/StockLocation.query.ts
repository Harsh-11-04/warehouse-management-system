import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const StockLocationApi = createApi({
  reducerPath: 'StockLocationApi',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
  endpoints: (builder) => ({
    assignStock: builder.mutation<any, { productId: string; locationId: string; quantity: number }>(
      {
        query: (body) => ({
          url: '/stock/assign',
          method: 'POST',
          body,
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('token'),
          },
        }),
      },
    ),
    transferStock: builder.mutation<
      any,
      { fromLocationId: string; toLocationId: string; productId: string; quantity: number }
    >({
      query: (body) => ({
        url: '/stock/transfer',
        method: 'POST',
        body,
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
    }),
    pickStock: builder.mutation<any, { productId: string; locationId: string; quantity: number }>({
      query: (body) => ({
        url: '/stock/pick',
        method: 'POST',
        body,
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
    }),
    receiveStock: builder.mutation<any, { productId: string; locationId: string; quantity: number }>({
      query: (body) => ({
        url: '/stock/receive',
        method: 'POST',
        body,
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
    }),
    getStockByProduct: builder.query<any, string>({
      query: (productId) => ({
        url: `/stock/by-product/${productId}`,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
    }),
    getAllStockLocations: builder.query<any, { page?: number } | void>({
      query: (args) => {
        const page = args?.page ?? 1
        return {
          url: `/stock/all?page=${page}`,
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('token'),
          },
        }
      },
    }),
  }),
})

export const {
  useAssignStockMutation,
  useTransferStockMutation,
  usePickStockMutation,
  useReceiveStockMutation,
  useGetStockByProductQuery,
  useLazyGetStockByProductQuery,
  useGetAllStockLocationsQuery,
} = StockLocationApi
