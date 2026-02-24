import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const ReportApi = createApi({
  reducerPath: 'ReportApi',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
  endpoints: (builder) => ({
    getDashboardStats: builder.query<any, void>({
      query: () => ({
        url: '/report/dashboard',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
    }),
    getWarehouseWiseStock: builder.query<any, void>({
      query: () => ({
        url: '/report/warehouse-wise',
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
    }),
    getMonthlyInventorySummary: builder.query<any, { months?: number } | void>({
      query: (args) => {
        const months = args?.months ?? 6
        return {
          url: `/report/monthly-inventory?months=${months}`,
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('token'),
          },
        }
      },
    }),
    getProductMovementHistory: builder.query<any, { productId: string; days?: number }>({
      query: ({ productId, days }) => ({
        url: `/report/product-movements/${productId}?days=${days ?? 30}`,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
    }),
  }),
})

export const {
  useGetDashboardStatsQuery,
  useGetWarehouseWiseStockQuery,
  useGetMonthlyInventorySummaryQuery,
  useGetProductMovementHistoryQuery,
} = ReportApi

