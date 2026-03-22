import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface SyncStatusResponse {
    summary: {
        pending: number
        processing: number
        failed: number
        synced: number
        dead_letter: number
    }
    syncState: {
        isOnline: boolean
        workerStatus: 'idle' | 'running' | 'paused' | 'error'
        lastPushAttemptAt: string | null
        lastPushSuccessAt: string | null
        lastPullAttemptAt: string | null
        lastPullSuccessAt: string | null
        lastWorkerHeartbeatAt: string | null
        catalogCursor: string
        lastError: string | null
    }
    lastSyncedEvent: {
        eventId: string
        entityType: string
        sourceModule: string
        syncedAt: string | null
        updatedAt: string | null
    } | null
    oldestPendingEvent: {
        eventId: string
        entityType: string
        sourceModule: string
        status: string
        retryCount: number
        createdAt: string
        nextRetryAt: string | null
    } | null
}

export interface PullCatalogResponse {
    ok: boolean
    skipped: boolean
    reason?: string
    error?: string
    cursor?: string
    hasMore?: boolean
    appliedCount?: number
    createdCount?: number
    stockUpdatedCount?: number
    stockSkippedCount?: number
    shop?: {
        id: string
        name: string
        code: string
    } | null
}

export interface RunSyncResponse {
    ok: boolean
    skipped: boolean
    reason?: string
    error?: string
    processed?: number
    synced?: number
    failed?: number
    pending?: number
}

const withAuth = () => ({
    Authorization: 'Bearer ' + localStorage.getItem('token'),
})

export const SyncApi = createApi({
    reducerPath: 'SyncApi',
    baseQuery: fetchBaseQuery({ baseUrl: import.meta.env.VITE_BACKEND_URL }),
    tagTypes: ['SyncStatus'],
    endpoints: (builder) => ({
        getSyncStatus: builder.query<SyncStatusResponse, void>({
            query: () => ({
                url: '/sync/status',
                headers: withAuth(),
            }),
            providesTags: ['SyncStatus'],
        }),
        pullCatalog: builder.mutation<PullCatalogResponse, { limit?: number; cursor?: string } | void>({
            query: (body) => ({
                url: '/sync/pull-catalog',
                method: 'POST',
                body,
                headers: withAuth(),
            }),
            invalidatesTags: ['SyncStatus'],
        }),
        runSyncOnce: builder.mutation<RunSyncResponse, { limit?: number } | void>({
            query: (body) => ({
                url: '/sync/run-once',
                method: 'POST',
                body,
                headers: withAuth(),
            }),
            invalidatesTags: ['SyncStatus'],
        }),
        retryFailedSync: builder.mutation<{ requeued: number }, { limit?: number } | void>({
            query: (body) => ({
                url: '/sync/retry-failed',
                method: 'POST',
                body,
                headers: withAuth(),
            }),
            invalidatesTags: ['SyncStatus'],
        }),
    }),
})

export const {
    useGetSyncStatusQuery,
    usePullCatalogMutation,
    useRunSyncOnceMutation,
    useRetryFailedSyncMutation,
} = SyncApi
