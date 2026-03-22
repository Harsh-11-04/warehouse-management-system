const axios = require("axios")
const crypto = require("crypto")
const mongoose = require("mongoose")
const BillingInvoice = require("../models/BillingInvoice.models")
const BillingProduct = require("../models/BillingProduct.models")
const { SyncOutboxModel, SyncStateModel } = require("../models")

const DEFAULT_BATCH_SIZE = 25
const DEFAULT_SYNC_TIMEOUT_MS = 8000
const DEFAULT_PROCESSING_TIMEOUT_MS = 2 * 60 * 1000
const DEFAULT_CATALOG_MAX_PAGES = 5
const RETRY_DELAYS_MS = [5000, 15000, 30000, 60000]
const MAX_RETRIES = Number(process.env.SYNC_MAX_RETRIES) > 0 ? Number(process.env.SYNC_MAX_RETRIES) : 10
const SYNC_ALLOW_DIRECT_PULL = String(process.env.SYNC_ALLOW_DIRECT_PULL ?? "true").toLowerCase() !== "false"

const cleanPatch = (patch = {}) => {
    return Object.entries(patch).reduce((acc, [key, value]) => {
        if (value !== undefined) {
            acc[key] = value
        }
        return acc
    }, {})
}

const normalizeStringValue = (value) => {
    if (value === null || value === undefined) {
        return null
    }

    if (typeof value === "string") {
        return value
    }

    if (typeof value?.toString === "function") {
        return value.toString()
    }

    return String(value)
}

const buildInvoiceSyncKey = (event) => {
    const userId = normalizeStringValue(event.user)
    const invoiceNumber = event?.metadata?.invoiceNumber
        || event?.payload?.refNumber
        || event?.payload?.billId
        || null

    if (!userId || !invoiceNumber) {
        return null
    }

    return {
        key: `${userId}:${invoiceNumber}`,
        userId,
        invoiceNumber
    }
}

class SyncService {
    static getRetryDelay(retryCount = 0) {
        if (retryCount <= 0) {
            return RETRY_DELAYS_MS[0]
        }

        return RETRY_DELAYS_MS[Math.min(retryCount - 1, RETRY_DELAYS_MS.length - 1)]
    }

    static buildWorkerConfig(overrides = {}) {
        const parsePositiveNumber = (value, fallback) => {
            const parsed = Number(value)
            return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
        }

        const enabledValue = overrides.enabled ?? process.env.SYNC_WORKER_ENABLED ?? "true"

        return {
            enabled: String(enabledValue).toLowerCase() !== "false",
            endpointUrl: overrides.endpointUrl || process.env.CLOUD_SYNC_URL || "",
            authToken: overrides.authToken || process.env.SYNC_AUTH_TOKEN || "",
            deviceId: overrides.deviceId || process.env.SYNC_DEVICE_ID || process.env.DEVICE_ID || "",
            batchSize: parsePositiveNumber(overrides.batchSize || process.env.SYNC_BATCH_SIZE, DEFAULT_BATCH_SIZE),
            timeoutMs: parsePositiveNumber(
                overrides.timeoutMs || process.env.SYNC_REQUEST_TIMEOUT_MS,
                DEFAULT_SYNC_TIMEOUT_MS
            ),
            processingTimeoutMs: parsePositiveNumber(
                overrides.processingTimeoutMs || process.env.SYNC_PROCESSING_TIMEOUT_MS,
                DEFAULT_PROCESSING_TIMEOUT_MS
            )
        }
    }

    static buildCatalogConfig(overrides = {}) {
        const parsePositiveNumber = (value, fallback) => {
            const parsed = Number(value)
            return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
        }

        return {
            endpointUrl: overrides.endpointUrl || process.env.CLOUD_CATALOG_URL || "",
            limit: parsePositiveNumber(overrides.limit || process.env.SYNC_CATALOG_LIMIT, 100),
            maxPages: parsePositiveNumber(
                overrides.maxPages || process.env.SYNC_CATALOG_MAX_PAGES,
                DEFAULT_CATALOG_MAX_PAGES
            ),
            timeoutMs: parsePositiveNumber(
                overrides.timeoutMs || process.env.SYNC_CATALOG_TIMEOUT_MS,
                DEFAULT_SYNC_TIMEOUT_MS
            )
        }
    }

    static isConnectivityError(error) {
        return Boolean(
            !error?.response
            || error?.code === "ECONNABORTED"
            || error?.code === "ECONNREFUSED"
            || error?.code === "ENOTFOUND"
            || error?.code === "ETIMEDOUT"
            || error?.message?.includes("Network Error")
        )
    }

    static async updateState(user, patch, options = {}) {
        const updatePatch = cleanPatch(patch)

        return SyncStateModel.findOneAndUpdate(
            { user },
            {
                $setOnInsert: { user },
                $set: updatePatch
            },
            {
                upsert: true,
                new: true,
                ...(options.session ? { session: options.session } : {})
            }
        )
    }

    static async updateStateForUsers(users, patch) {
        const userIds = [...new Set((users || []).map((user) => normalizeStringValue(user)).filter(Boolean))]

        if (!userIds.length) {
            return
        }

        await Promise.all(userIds.map((userId) => this.updateState(userId, patch)))
    }

    static async touchState(user, options = {}) {
        return this.updateState(user, { workerStatus: "idle" }, options)
    }

    static async enqueue(user, data, options = {}) {
        const [event] = await this.enqueueMany(user, [data], options)
        return event
    }

    static async enqueueMany(user, records, options = {}) {
        const events = records.map((data) => ({
            eventId: data.eventId || crypto.randomUUID(),
            user,
            entityType: data.entityType,
            entityId: data.entityId || null,
            operation: data.operation,
            sourceModule: data.sourceModule || "system",
            payload: data.payload,
            metadata: data.metadata || {}
        }))

        const createOptions = options.session ? { session: options.session } : undefined
        const createdEvents = createOptions
            ? await SyncOutboxModel.create(events, createOptions)
            : await SyncOutboxModel.create(events)

        if (options.touchState !== false) {
            await this.touchState(user, options)
        }

        // Reset invoice syncState to 'pending' for any invoice-related events
        const invoiceNumbers = [...new Set(
            events
                .filter((e) => e.metadata?.invoiceNumber)
                .map((e) => e.metadata.invoiceNumber)
        )]
        if (invoiceNumbers.length) {
            await BillingInvoice.updateMany(
                { user, invoiceNumber: { $in: invoiceNumbers }, syncState: { $ne: 'pending' } },
                { $set: { syncState: 'pending' } },
                options.session ? { session: options.session } : {}
            )
        }

        return createdEvents
    }

    static async hasPendingInventoryMovement(user, productId) {
        if (!productId) {
            return false
        }

        const pendingEvent = await SyncOutboxModel.findOne({
            user,
            entityType: "inventory_movement",
            status: { $in: ["pending", "failed", "processing"] },
            "payload.productId": normalizeStringValue(productId)
        }).select("_id")

        return Boolean(pendingEvent)
    }

    static async upsertCatalogProducts(user, products = []) {
        let appliedCount = 0
        let createdCount = 0
        let stockUpdatedCount = 0
        let stockSkippedCount = 0

        for (const product of products) {
            const cloudSourceId = normalizeStringValue(product.externalProductId)
            if (!cloudSourceId) {
                continue
            }

            const orFilters = [{ cloudSourceId }]
            if (product.barcode) {
                orFilters.push({ barcode: product.barcode })
            }

            let localProduct = await BillingProduct.findOne({
                user,
                $or: orFilters
            })

            const isNew = !localProduct
            if (!localProduct) {
                localProduct = new BillingProduct({
                    user
                })
            }

            localProduct.cloudSourceId = cloudSourceId
            localProduct.barcode = product.barcode || localProduct.barcode || ""
            localProduct.name = product.name || localProduct.name || "Unnamed Product"
            localProduct.category = product.category || ""
            localProduct.purchasePrice = Number(product.purchasePrice) || 0
            localProduct.mrp = Number(product.mrp) || 0
            localProduct.sellingPrice = Number(product.sellingPrice) || 0
            localProduct.cardPrice = Number(product.cardPrice) || 0
            localProduct.gstPercent = Number(product.gstPercent) || 0
            localProduct.lowStockThreshold = Number(product.reorderLevel) || 0
            localProduct.isActive = product.active !== false
            localProduct.cloudVersion = Number(product.cloudVersion) || localProduct.cloudVersion || 0
            localProduct.sourceUpdatedAt = product.sourceUpdatedAt || product.changedAt || new Date()

            const shouldProtectLocalStock = !isNew && await this.hasPendingInventoryMovement(user, localProduct._id)
            if (!shouldProtectLocalStock) {
                localProduct.stock = Number(product.stock) || 0
                stockUpdatedCount += 1
            } else {
                stockSkippedCount += 1
            }

            await localProduct.save()

            appliedCount += 1
            if (isNew) {
                createdCount += 1
            }
        }

        return {
            appliedCount,
            createdCount,
            stockUpdatedCount,
            stockSkippedCount
        }
    }

    static async applyCatalogPayload(user, payload, options = {}) {
        const result = await this.upsertCatalogProducts(user, payload.products || [])
        const nextCursor = payload.cursor || options.cursor || ""

        await this.updateState(user, {
            isOnline: true,
            lastPullSuccessAt: new Date(),
            lastWorkerHeartbeatAt: new Date(),
            catalogCursor: nextCursor,
            lastError: null
        })

        return {
            ok: true,
            skipped: false,
            cursor: nextCursor,
            hasMore: Boolean(payload.hasMore),
            shop: payload.shop || null,
            ...result
        }
    }

    static async syncCatalogWithFetcher(user, fetchPage, options = {}) {
        const config = this.buildCatalogConfig(options)
        const syncState = await SyncStateModel.findOne({ user }).select("catalogCursor")

        let cursor = options.cursor || syncState?.catalogCursor || ""
        let hasMore = false
        let shop = null
        let appliedCount = 0
        let createdCount = 0
        let stockUpdatedCount = 0
        let stockSkippedCount = 0

        for (let page = 0; page < config.maxPages; page += 1) {
            const payload = await fetchPage(cursor, config)
            const applied = await this.applyCatalogPayload(user, payload, { cursor })

            appliedCount += applied.appliedCount || 0
            createdCount += applied.createdCount || 0
            stockUpdatedCount += applied.stockUpdatedCount || 0
            stockSkippedCount += applied.stockSkippedCount || 0
            cursor = applied.cursor || cursor
            hasMore = Boolean(applied.hasMore)
            shop = applied.shop || shop

            if (!hasMore || !(payload.products || []).length) {
                break
            }
        }

        return {
            ok: true,
            skipped: false,
            cursor,
            hasMore,
            shop,
            appliedCount,
            createdCount,
            stockUpdatedCount,
            stockSkippedCount
        }
    }

    static async pullCatalogDirect(user, options = {}) {
        const CloudCatalogService = require("./CloudCatalog.service")

        return this.syncCatalogWithFetcher(
            user,
            async (cursor, config) => CloudCatalogService.getChanges(user, {
                cursor,
                limit: config.limit
            }),
            options
        )
    }

    static async pullCatalogViaHttp(user, authToken, options = {}) {
        if (!authToken) {
            throw new Error("Missing auth token for catalog pull")
        }

        const config = this.buildCatalogConfig(options)
        if (!config.endpointUrl) {
            throw new Error("CLOUD_CATALOG_URL is not configured")
        }

        return this.syncCatalogWithFetcher(
            user,
            async (cursor, runtimeConfig) => {
                const response = await axios.get(runtimeConfig.endpointUrl, {
                    params: {
                        cursor,
                        limit: runtimeConfig.limit
                    },
                    timeout: runtimeConfig.timeoutMs,
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                        "x-source-user": normalizeStringValue(user) || ""
                    }
                })

                return response.data || {}
            },
            options
        )
    }

    static async pullCatalog(user, authToken, options = {}) {
        const config = this.buildCatalogConfig(options)
        const pullAttemptTime = new Date()

        await this.updateState(user, {
            lastPullAttemptAt: pullAttemptTime,
            lastWorkerHeartbeatAt: pullAttemptTime,
            lastError: null
        })

        try {
            if (config.endpointUrl && authToken) {
                return await this.pullCatalogViaHttp(user, authToken, options)
            }

            if (SYNC_ALLOW_DIRECT_PULL && options.allowInternalFallback !== false) {
                return await this.pullCatalogDirect(user, options)
            }

            const reason = !authToken
                ? "Missing auth token for catalog pull"
                : "CLOUD_CATALOG_URL is not configured"

            await this.updateState(user, {
                lastError: reason
            })

            return {
                ok: false,
                skipped: true,
                reason
            }
        } catch (error) {
            const errorMessage = error?.response?.data?.message
                || error?.message
                || "Catalog pull failed"

            await this.updateState(user, {
                isOnline: !this.isConnectivityError(error),
                lastError: errorMessage
            })

            return {
                ok: false,
                skipped: false,
                error: errorMessage
            }
        }
    }

    static async getCatalogPullUsers() {
        const users = await SyncStateModel.distinct("user")
        return [...new Set(users.map((user) => normalizeStringValue(user)).filter(Boolean))]
    }

    static async runCatalogPullCycle(options = {}) {
        const users = options.user
            ? [normalizeStringValue(options.user)].filter(Boolean)
            : await this.getCatalogPullUsers()

        if (!users.length) {
            return {
                ok: true,
                skipped: true,
                reason: "No users available for catalog pull"
            }
        }

        // Use SYNC_AUTH_TOKEN as the worker/service token for HTTP catalog pull
        const workerAuthToken = process.env.SYNC_AUTH_TOKEN || ""

        let appliedCount = 0
        let createdCount = 0
        let stockUpdatedCount = 0
        let stockSkippedCount = 0
        let successCount = 0
        const failedUsers = []

        for (const user of users) {
            // Route through pullCatalog() which respects SYNC_ALLOW_DIRECT_PULL gate
            const result = await this.pullCatalog(user, workerAuthToken, {
                ...options,
                allowInternalFallback: true
            })

            const userPullCount = (result.appliedCount || 0)

            if (result.ok) {
                successCount += 1
                appliedCount += result.appliedCount || 0
                createdCount += result.createdCount || 0
                stockUpdatedCount += result.stockUpdatedCount || 0
                stockSkippedCount += result.stockSkippedCount || 0
            } else {
                failedUsers.push({
                    user,
                    error: result.error || result.reason || "Catalog pull failed"
                })
            }

            // Persist per-user pull batch size
            await this.updateState(user, {
                lastPullBatchSize: userPullCount,
                lastWorkerHeartbeatAt: new Date()
            })
        }

        return {
            ok: failedUsers.length === 0,
            skipped: false,
            usersProcessed: users.length,
            successCount,
            failureCount: failedUsers.length,
            appliedCount,
            createdCount,
            stockUpdatedCount,
            stockSkippedCount,
            failedUsers
        }
    }

    static buildClaimFilter({ user, now = new Date(), processingTimeoutMs = DEFAULT_PROCESSING_TIMEOUT_MS }) {
        const staleLockTime = new Date(now.getTime() - processingTimeoutMs)
        const filter = {
            $or: [
                { status: "pending", nextRetryAt: { $lte: now } },
                { status: "failed", nextRetryAt: { $lte: now } },
                { status: "processing", lockedAt: { $lte: staleLockTime } }
            ]
        }

        if (user) {
            filter.user = user
        }

        return filter
    }

    static async claimPendingBatch({ user = null, limit = DEFAULT_BATCH_SIZE, processingTimeoutMs = DEFAULT_PROCESSING_TIMEOUT_MS } = {}) {
        const now = new Date()
        const claimedEvents = []

        for (let index = 0; index < limit; index += 1) {
            const event = await SyncOutboxModel.findOneAndUpdate(
                this.buildClaimFilter({ user, now, processingTimeoutMs }),
                {
                    $set: {
                        status: "processing",
                        lockedAt: now,
                        lastError: null
                    }
                },
                {
                    sort: { nextRetryAt: 1, createdAt: 1 },
                    new: true
                }
            )

            if (!event) {
                break
            }

            claimedEvents.push(event)
        }

        return claimedEvents
    }

    static serializeEvent(event) {
        return {
            eventId: event.eventId,
            userId: normalizeStringValue(event.user),
            entityType: event.entityType,
            entityId: normalizeStringValue(event.entityId),
            operation: event.operation,
            sourceModule: event.sourceModule,
            payload: event.payload,
            metadata: event.metadata || {},
            createdAt: event.createdAt,
            updatedAt: event.updatedAt
        }
    }

    static normalizeCloudResponse(data) {
        const ackedEventIds = Array.isArray(data?.ackedEventIds)
            ? data.ackedEventIds.map((eventId) => String(eventId))
            : []

        const failedEvents = Array.isArray(data?.failedEvents)
            ? data.failedEvents
                .filter((entry) => entry?.eventId)
                .map((entry) => ({
                    eventId: String(entry.eventId),
                    error: entry.error || entry.reason || "Cloud sync failed for this event"
                }))
            : []

        return {
            ackedEventIds,
            failedEvents
        }
    }

    static async pushBatchToCloud(events, config) {
        const headers = {}
        if (config.authToken) {
            headers.Authorization = `Bearer ${config.authToken}`
        }
        if (config.deviceId) {
            headers["x-device-id"] = config.deviceId
        }

        const response = await axios.post(
            config.endpointUrl,
            {
                deviceId: config.deviceId || null,
                events: events.map((event) => this.serializeEvent(event))
            },
            {
                timeout: config.timeoutMs,
                headers
            }
        )

        return this.normalizeCloudResponse(response.data)
    }

    static async markEventsSynced(eventIds, syncedAt = new Date()) {
        const normalizedIds = [...new Set((eventIds || []).map((eventId) => String(eventId)).filter(Boolean))]
        if (!normalizedIds.length) {
            return []
        }

        const events = await SyncOutboxModel.find({ eventId: { $in: normalizedIds } })
            .select("eventId user entityType entityId metadata payload")
            .lean()

        if (!events.length) {
            return []
        }

        await SyncOutboxModel.updateMany(
            { eventId: { $in: normalizedIds } },
            {
                $set: {
                    status: "synced",
                    syncedAt,
                    lockedAt: null,
                    lastError: null
                }
            }
        )

        await this.refreshInvoiceSyncStates(events)
        return events
    }

    static async markEventsFailed(events, errorByEventId = {}) {
        const normalizedEvents = (events || [])
            .map((event) => {
                if (!event?.eventId) {
                    return null
                }

                const retryCount = Number(event.retryCount) || 0
                const newRetryCount = retryCount + 1
                const isDeadLetter = newRetryCount >= MAX_RETRIES
                const nextRetryAt = isDeadLetter
                    ? null
                    : new Date(Date.now() + this.getRetryDelay(newRetryCount))

                return {
                    eventId: String(event.eventId),
                    user: event.user,
                    entityType: event.entityType,
                    entityId: event.entityId,
                    metadata: event.metadata || {},
                    payload: event.payload || {},
                    update: {
                        status: isDeadLetter ? "dead_letter" : "failed",
                        retryCount: newRetryCount,
                        nextRetryAt,
                        lockedAt: null,
                        lastError: errorByEventId[String(event.eventId)] || "Cloud sync failed"
                    }
                }
            })
            .filter(Boolean)

        if (!normalizedEvents.length) {
            return []
        }

        await SyncOutboxModel.bulkWrite(
            normalizedEvents.map((event) => ({
                updateOne: {
                    filter: { eventId: event.eventId },
                    update: {
                        $set: event.update
                    }
                }
            }))
        )

        const deadLetterCount = normalizedEvents.filter((e) => e.update.status === "dead_letter").length
        if (deadLetterCount > 0) {
            console.log(`[sync] ${deadLetterCount} event(s) moved to dead_letter after ${MAX_RETRIES} retries`)
        }

        await this.refreshInvoiceSyncStates(normalizedEvents)
        return normalizedEvents
    }

    static async requeueFailedEvents(user, limit = 100) {
        // Only requeue failed events, not dead_letter — those are terminal
        const failedEvents = await SyncOutboxModel.find({ user, status: "failed" })
            .sort({ nextRetryAt: 1, createdAt: 1 })
            .limit(limit)
            .select("eventId user entityType entityId metadata payload")

        if (!failedEvents.length) {
            await this.updateState(user, {
                workerStatus: "idle",
                lastError: null,
                lastWorkerHeartbeatAt: new Date()
            })
            return { requeued: 0 }
        }

        await SyncOutboxModel.updateMany(
            { eventId: { $in: failedEvents.map((event) => event.eventId) } },
            {
                $set: {
                    status: "pending",
                    nextRetryAt: new Date(),
                    lockedAt: null,
                    lastError: null
                }
            }
        )

        await this.refreshInvoiceSyncStates(failedEvents)
        await this.updateState(user, {
            workerStatus: "idle",
            lastError: null,
            lastWorkerHeartbeatAt: new Date()
        })

        return { requeued: failedEvents.length }
    }

    static async refreshInvoiceSyncStates(events) {
        const invoiceTargets = new Map()

        ;(events || []).forEach((event) => {
            const syncKey = buildInvoiceSyncKey(event)
            if (!syncKey) {
                return
            }

            invoiceTargets.set(syncKey.key, syncKey)
        })

        if (!invoiceTargets.size) {
            return
        }

        for (const target of invoiceTargets.values()) {
            const relatedEvents = await SyncOutboxModel.find({
                user: target.userId,
                "metadata.invoiceNumber": target.invoiceNumber
            })
                .select("status syncedAt")
                .lean()

            if (!relatedEvents.length) {
                continue
            }

            const allSynced = relatedEvents.every((event) => event.status === "synced")
            const hasFailed = relatedEvents.some((event) => event.status === "failed" || event.status === "dead_letter")
            const latestSyncedAt = relatedEvents
                .map((event) => event.syncedAt)
                .filter(Boolean)
                .sort((left, right) => new Date(right) - new Date(left))[0] || null

            let nextState = "pending"
            let syncedAt = null

            if (allSynced) {
                nextState = "synced"
                syncedAt = latestSyncedAt
            } else if (hasFailed) {
                nextState = "failed"
            }

            await BillingInvoice.findOneAndUpdate(
                { user: target.userId, invoiceNumber: target.invoiceNumber },
                {
                    $set: {
                        syncState: nextState,
                        syncedAt
                    }
                }
            )
        }
    }

    static async processPendingBatch(options = {}) {
        const config = this.buildWorkerConfig(options)

        if (!config.enabled) {
            return {
                ok: true,
                skipped: true,
                reason: "Sync worker is disabled"
            }
        }

        if (!config.endpointUrl) {
            return {
                ok: false,
                skipped: true,
                reason: "CLOUD_SYNC_URL is not configured"
            }
        }

        const claimedEvents = await this.claimPendingBatch({
            user: options.user || null,
            limit: config.batchSize,
            processingTimeoutMs: config.processingTimeoutMs
        })

        const claimedUserIds = [...new Set(claimedEvents.map((event) => normalizeStringValue(event.user)).filter(Boolean))]
        const heartbeatTime = new Date()

        if (!claimedEvents.length) {
            if (options.user) {
                await this.updateState(options.user, {
                    workerStatus: "idle",
                    lastWorkerHeartbeatAt: heartbeatTime
                })
            }

            return {
                ok: true,
                skipped: false,
                processed: 0,
                synced: 0,
                failed: 0,
                pending: 0
            }
        }

        await this.updateStateForUsers(claimedUserIds, {
            workerStatus: "running",
            isOnline: true,
            lastPushAttemptAt: heartbeatTime,
            lastWorkerHeartbeatAt: heartbeatTime,
            lastError: null
        })

        try {
            const { ackedEventIds, failedEvents } = await this.pushBatchToCloud(claimedEvents, config)

            const ackedSet = new Set(ackedEventIds)
            const failedMap = failedEvents.reduce((acc, entry) => {
                acc[String(entry.eventId)] = entry.error
                return acc
            }, {})

            const unresolvedFailures = claimedEvents
                .filter((event) => !ackedSet.has(String(event.eventId)) && !failedMap[String(event.eventId)])
                .reduce((acc, event) => {
                    acc[String(event.eventId)] = "Cloud response did not acknowledge this event"
                    return acc
                }, {})

            const combinedFailures = { ...failedMap, ...unresolvedFailures }
            const failedItems = claimedEvents.filter((event) => combinedFailures[String(event.eventId)])

            if (ackedEventIds.length) {
                await this.markEventsSynced(ackedEventIds, new Date())
            }

            if (failedItems.length) {
                await this.markEventsFailed(failedItems, combinedFailures)
            }

            // Persist per-user push batch sizes
            for (const userId of claimedUserIds) {
                const userBatchCount = claimedEvents.filter(
                    (e) => normalizeStringValue(e.user) === userId
                ).length
                await this.updateState(userId, {
                    lastPushBatchSize: userBatchCount
                })
            }

            await this.updateStateForUsers(claimedUserIds, {
                workerStatus: "idle",
                isOnline: true,
                lastPushSuccessAt: new Date(),
                lastWorkerHeartbeatAt: new Date(),
                lastError: failedItems.length
                    ? `${failedItems.length} event(s) need retry`
                    : null
            })

            return {
                ok: true,
                skipped: false,
                processed: claimedEvents.length,
                synced: ackedEventIds.length,
                failed: failedItems.length,
                pending: Math.max(claimedEvents.length - ackedEventIds.length - failedItems.length, 0)
            }
        } catch (error) {
            const errorMessage = error?.response?.data?.message
                || error?.message
                || "Cloud sync failed"

            await this.markEventsFailed(
                claimedEvents,
                claimedEvents.reduce((acc, event) => {
                    acc[String(event.eventId)] = errorMessage
                    return acc
                }, {})
            )

            await this.updateStateForUsers(claimedUserIds, {
                workerStatus: "error",
                isOnline: !this.isConnectivityError(error),
                lastWorkerHeartbeatAt: new Date(),
                lastError: errorMessage
            })

            return {
                ok: false,
                skipped: false,
                processed: claimedEvents.length,
                synced: 0,
                failed: claimedEvents.length,
                pending: 0,
                error: errorMessage
            }
        }
    }

    static async getStatus(user) {
        const userObjectId = new mongoose.Types.ObjectId(user)

        const [counts, lastSyncedEvent, oldestPendingEvent, syncState] = await Promise.all([
            SyncOutboxModel.aggregate([
                { $match: { user: userObjectId } },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 }
                    }
                }
            ]),
            SyncOutboxModel.findOne({ user, status: "synced" })
                .sort({ syncedAt: -1, updatedAt: -1 })
                .select("eventId entityType sourceModule syncedAt updatedAt"),
            SyncOutboxModel.findOne({ user, status: { $in: ["pending", "failed", "processing"] } })
                .sort({ createdAt: 1 })
                .select("eventId entityType sourceModule status retryCount createdAt nextRetryAt"),
            SyncStateModel.findOne({ user }).select("-__v -createdAt")
        ])

        const summary = {
            pending: 0,
            processing: 0,
            failed: 0,
            synced: 0,
            dead_letter: 0
        }

        counts.forEach((entry) => {
            if (summary.hasOwnProperty(entry._id)) {
                summary[entry._id] = entry.count
            }
        })

        return {
            summary,
            syncState: syncState || {
                isOnline: true,
                workerStatus: "idle",
                lastPushAttemptAt: null,
                lastPushSuccessAt: null,
                lastPullAttemptAt: null,
                lastPullSuccessAt: null,
                lastWorkerHeartbeatAt: null,
                catalogCursor: "",
                lastError: null
            },
            lastSyncedEvent,
            oldestPendingEvent
        }
    }
}

module.exports = SyncService
