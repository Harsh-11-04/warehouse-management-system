const CatchAsync = require("../utils/CatchAsync")
const SyncService = require("../services/Sync.service")
const { SyncOutboxModel, SyncStateModel } = require("../models")

class SyncController {
    static GetStatus = CatchAsync(async (req, res) => {
        const result = await SyncService.getStatus(req.user)
        res.status(200).json(result)
    })

    static PullCatalog = CatchAsync(async (req, res) => {
        const authHeader = req.headers.authorization || ''
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.split(' ')[1]
            : ''

        const requestedLimit = Number(req.body?.limit)
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
            ? Math.min(requestedLimit, 500)
            : undefined

        const result = await SyncService.pullCatalog(req.user, token, {
            limit,
            cursor: req.body?.cursor
        })

        res.status(200).json(result)
    })

    static RunOnce = CatchAsync(async (req, res) => {
        const requestedLimit = Number(req.body?.limit)
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
            ? Math.min(requestedLimit, 100)
            : undefined

        const result = await SyncService.processPendingBatch({
            user: req.user,
            batchSize: limit
        })

        res.status(200).json(result)
    })

    static RetryFailed = CatchAsync(async (req, res) => {
        const requestedLimit = Number(req.body?.limit)
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
            ? Math.min(requestedLimit, 250)
            : 100

        const result = await SyncService.requeueFailedEvents(req.user, limit)
        res.status(200).json(result)
    })

    static Health = CatchAsync(async (req, res) => {
        const [statusCounts, deadLetterCount, syncState] = await Promise.all([
            SyncOutboxModel.aggregate([
                { $match: { user: new (require('mongoose').Types.ObjectId)(req.user) } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            SyncOutboxModel.countDocuments({ user: req.user, status: 'dead_letter' }),
            SyncStateModel.findOne({ user: req.user }).select(
                'workerStatus isOnline lastPushSuccessAt lastPullSuccessAt lastWorkerHeartbeatAt lastError lastPushBatchSize lastPullBatchSize'
            ).lean()
        ])

        const counts = {}
        statusCounts.forEach((entry) => { counts[entry._id] = entry.count })

        const lastHeartbeat = syncState?.lastWorkerHeartbeatAt
            ? new Date(syncState.lastWorkerHeartbeatAt)
            : null
        const heartbeatAgeMs = lastHeartbeat ? Date.now() - lastHeartbeat.getTime() : null
        const isHealthy = syncState?.workerStatus !== 'error'
            && (heartbeatAgeMs === null || heartbeatAgeMs < 120000)
            && deadLetterCount === 0

        res.status(isHealthy ? 200 : 503).json({
            healthy: isHealthy,
            workerStatus: syncState?.workerStatus || 'unknown',
            isOnline: syncState?.isOnline ?? null,
            outbox: counts,
            deadLetterCount,
            lastPushSuccessAt: syncState?.lastPushSuccessAt || null,
            lastPullSuccessAt: syncState?.lastPullSuccessAt || null,
            lastWorkerHeartbeatAt: syncState?.lastWorkerHeartbeatAt || null,
            heartbeatAgeMs,
            lastPushBatchSize: syncState?.lastPushBatchSize ?? 0,
            lastPullBatchSize: syncState?.lastPullBatchSize ?? 0,
            lastError: syncState?.lastError || null
        })
    })
}

module.exports = SyncController
