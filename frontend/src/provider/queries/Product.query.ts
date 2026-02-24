import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const ProductApi = createApi({
  reducerPath: 'ProductApi',
  baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
  tagTypes: ['Products'],
  endpoints: (builder) => ({
    getAllProducts: builder.query<
      any,
      { page?: number; query?: string; lowStock?: boolean } | void
    >({
      query: (args) => {
        const page = args?.page ?? 1
        const query = args?.query ?? ''
        const lowStock = args?.lowStock ? '&lowStock=true' : ''
        return {
          url: `/product/get-all?page=${page}&query=${encodeURIComponent(query)}${lowStock}`,
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('token'),
          },
        }
      },
      providesTags: ['Products'],
    }),
    getProductById: builder.query<any, string>({
      query: (id) => ({
        url: `/product/get/${id}`,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
    }),
    createProduct: builder.mutation<
      any,
      { name: string; sku: string; category: string; price: number; reorderThreshold?: number }
    >({
      query: (body) => ({
        url: '/product/create',
        method: 'POST',
        body,
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
      invalidatesTags: ['Products'],
    }),
    updateProduct: builder.mutation<
      any,
      { id: string; data: { name?: string; sku?: string; category?: string; price?: number; reorderThreshold?: number } }
    >({
      query: ({ id, data }) => ({
        url: `/product/update/${id}`,
        method: 'PATCH',
        body: data,
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
      invalidatesTags: ['Products'],
    }),
    deleteProduct: builder.mutation<any, string>({
      query: (id) => ({
        url: `/product/delete/${id}`,
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token'),
        },
      }),
      invalidatesTags: ['Products'],
    }),
  }),
})

export const {
  useGetAllProductsQuery,
  useLazyGetAllProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = ProductApi
