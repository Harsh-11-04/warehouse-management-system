import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface CloudSyncAuditRecord {
    _id: string
    shopId: string
    eventId: string
    sourceUserId: string
    deviceId: string
    entityType: string
    operation: string
    status: 'received' | 'processed' | 'failed' | 'duplicate' | 'ignored'
    error: string | null
    duplicateCount: number
    receivedAt: string
    processedAt: string | null
    createdAt: string
    updatedAt: string
}

export interface CloudSyncAuditResponse {
    records: CloudSyncAuditRecord[]
    total: number
    page: number
    totalPages: number
}

export interface CloudSyncAuditSummaryResponse {
    summary: {
        received: number
        processed: number
        failed: number
        duplicate: number
        ignored: number
    }
}

const withAuth = () => ({
    Authorization: 'Bearer ' + localStorage.getItem('token'),
})

export const CloudSyncAuditApi = createApi({
    reducerPath: 'CloudSyncAuditApi',
    baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
    tagTypes: ['CloudSyncAudit'],
    endpoints: (builder) => ({
        getCloudSyncAuditRecords: builder.query<
            CloudSyncAuditResponse,
            { page?: number; limit?: number; status?: string; entityType?: string; startDate?: string; endDate?: string }
        >({
            query: ({ page = 1, limit = 30, status, entityType, startDate, endDate } = {}) => {
                const params = new URLSearchParams()
                params.set('page', String(page))
                params.set('limit', String(limit))
                if (status) params.set('status', status)
                if (entityType) params.set('entityType', entityType)
                if (startDate) params.set('startDate', startDate)
                if (endDate) params.set('endDate', endDate)
                return {
                    url: `/cloud/sync-audit?${params.toString()}`,
                    headers: withAuth(),
                }
            },
            providesTags: ['CloudSyncAudit'],
        }),
        getCloudSyncAuditSummary: builder.query<CloudSyncAuditSummaryResponse, void>({
            query: () => ({
                url: '/cloud/sync-audit/summary',
                headers: withAuth(),
            }),
            providesTags: ['CloudSyncAudit'],
        }),
    }),
})

export const {
    useGetCloudSyncAuditRecordsQuery,
    useGetCloudSyncAuditSummaryQuery,
} = CloudSyncAuditApi
