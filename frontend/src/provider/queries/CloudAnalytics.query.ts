import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface CloudAnalyticsOverview {
    shop: {
        id: string
        name: string
        code: string
        timezone: string
        currency: string
    }
    lifetime: {
        revenue: number
        salesCount: number
    }
    today: {
        revenue: number
        salesCount: number
    }
    thisMonth: {
        revenue: number
        salesCount: number
    }
    inventory: {
        lowStockCount: number
    }
    lastCloudSyncAt: string | null
}

export interface DailyRevenueRow {
    date: string
    revenue: number
    taxTotal: number
    discountTotal: number
    salesCount: number
}

export interface MonthlyRevenueRow {
    month: string
    revenue: number
    taxTotal: number
    discountTotal: number
    salesCount: number
}

export interface BestSellerRow {
    externalProductId: string
    name: string
    barcode: string
    totalQuantity: number
    totalRevenue: number
    totalTax: number
    currentOnHand: number | null
    reorderLevel: number | null
    category: string
    currentSellingPrice: number | null
}

export interface InventoryAlertRow {
    externalProductId: string
    name: string
    barcode: string
    category: string
    active: boolean
    onHand: number
    reorderLevel: number
    shortage: number
    lastMovementAt: string | null
    updatedAt: string
}

export interface DailyRevenueResponse {
    days: number
    rows: DailyRevenueRow[]
}

export interface MonthlyRevenueResponse {
    months: number
    rows: MonthlyRevenueRow[]
}

export interface BestSellersResponse {
    days: number
    limit: number
    rows: BestSellerRow[]
}

export interface InventoryAlertsResponse {
    limit: number
    totalCount: number
    rows: InventoryAlertRow[]
}

const withAuth = () => ({
    Authorization: 'Bearer ' + localStorage.getItem('token'),
})

export const CloudAnalyticsApi = createApi({
    reducerPath: 'CloudAnalyticsApi',
    baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
    tagTypes: ['CloudAnalytics'],
    endpoints: (builder) => ({
        getCloudAnalyticsOverview: builder.query<CloudAnalyticsOverview, void>({
            query: () => ({
                url: '/cloud/analytics/overview',
                headers: withAuth(),
            }),
            providesTags: ['CloudAnalytics'],
        }),
        getCloudDailyRevenue: builder.query<DailyRevenueResponse, { days?: number } | void>({
            query: (args) => ({
                url: `/cloud/analytics/daily-revenue?days=${args?.days ?? 14}`,
                headers: withAuth(),
            }),
            providesTags: ['CloudAnalytics'],
        }),
        getCloudMonthlyRevenue: builder.query<MonthlyRevenueResponse, { months?: number } | void>({
            query: (args) => ({
                url: `/cloud/analytics/monthly-revenue?months=${args?.months ?? 6}`,
                headers: withAuth(),
            }),
            providesTags: ['CloudAnalytics'],
        }),
        getCloudBestSellers: builder.query<BestSellersResponse, { days?: number; limit?: number } | void>({
            query: (args) => ({
                url: `/cloud/analytics/best-sellers?days=${args?.days ?? 30}&limit=${args?.limit ?? 8}`,
                headers: withAuth(),
            }),
            providesTags: ['CloudAnalytics'],
        }),
        getCloudInventoryAlerts: builder.query<InventoryAlertsResponse, { limit?: number } | void>({
            query: (args) => ({
                url: `/cloud/analytics/inventory-alerts?limit=${args?.limit ?? 8}`,
                headers: withAuth(),
            }),
            providesTags: ['CloudAnalytics'],
        }),
    }),
})

export const {
    useGetCloudAnalyticsOverviewQuery,
    useGetCloudDailyRevenueQuery,
    useGetCloudMonthlyRevenueQuery,
    useGetCloudBestSellersQuery,
    useGetCloudInventoryAlertsQuery,
} = CloudAnalyticsApi
