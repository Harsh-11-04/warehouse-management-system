import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const ShipmentApi = createApi({
  reducerPath: 'ShipmentApi',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
  tagTypes: ['Shipments'],
  endpoints: (builder) => ({
    getAllShipments: builder.query<
      any,
      { page?: number; query?: string; type?: 'Inbound' | 'Outbound' } | void
    >({
      query: (args) => {
        const page = args?.page ?? 1
        const query = args?.query ?? ''
        const type = args?.type ?? ''
        const qs = new URLSearchParams()
        qs.set('page', String(page))
        if (query) qs.set('query', query)
        if (type) qs.set('type', type)
        return {
          url: `/shipment/get-all?${qs.toString()}`,
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('token'),
          },
        }
      },
      providesTags: ['Shipments'],
    }),
    getShipmentById: builder.query<any, string>({
      query: (id) => ({
        url: `/shipment/get/${id}`,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
    }),
    createShipment: builder.mutation<
      any,
      { type: 'Inbound' | 'Outbound'; productId: string; quantity: number; notes?: string }
    >({
      query: (body) => ({
        url: '/shipment/create',
        method: 'POST',
        body,
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
      invalidatesTags: ['Shipments'],
    }),
    updateShipmentStatus: builder.mutation<
      any,
      { id: string; status: 'Pending' | 'In Transit' | 'Delivered' }
    >({
      query: ({ id, status }) => ({
        url: `/shipment/status/${id}`,
        method: 'PATCH',
        body: { status },
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
      invalidatesTags: ['Shipments'],
    }),
    deleteShipment: builder.mutation<any, string>({
      query: (id) => ({
        url: `/shipment/delete/${id}`,
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
      invalidatesTags: ['Shipments'],
    }),
  }),
})

export const {
  useGetAllShipmentsQuery,
  useLazyGetAllShipmentsQuery,
  useGetShipmentByIdQuery,
  useCreateShipmentMutation,
  useUpdateShipmentStatusMutation,
  useDeleteShipmentMutation,
} = ShipmentApi
