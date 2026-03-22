require("dotenv").config()

const mongoose = require("mongoose")
const { ConnectDB } = require("../config/db.config")
const SyncService = require("../services/Sync.service")

const workerStartedAt = new Date()

const structuredLog = (level, message, data = {}) => {
    const entry = {
        ts: new Date().toISOString(),
        level,
        worker: 'sync',
        msg: message,
        ...data
    }
    const output = JSON.stringify(entry)
    if (level === 'error') {
        console.error(output)
    } else {
        console.log(output)
    }
}

const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS) > 0
    ? Number(process.env.SYNC_INTERVAL_MS)
    : 5000

const SYNC_PULL_INTERVAL_MS = Number(process.env.SYNC_PULL_INTERVAL_MS) > 0
    ? Number(process.env.SYNC_PULL_INTERVAL_MS)
    : 60000

const SYNC_PULL_ENABLED = String(process.env.SYNC_PULL_ENABLED ?? "true").toLowerCase() !== "false"

let intervalHandle = null
let isCycleRunning = false
let lastCatalogPullAt = 0
let warnedWorkerDisabled = false
let warnedPushConfig = false
let warnedPullDisabled = false
let warnedPullUsers = false

const logPushResult = (result) => {
    if (!result) {
        return
    }

    if (result.skipped && result.reason) {
        if (result.reason === "Sync worker is disabled") {
            if (!warnedWorkerDisabled) {
                structuredLog('warn', 'worker is disabled, set SYNC_WORKER_ENABLED=true to enable')
                warnedWorkerDisabled = true
            }
            return
        }

        if (result.reason === "CLOUD_SYNC_URL is not configured") {
            if (!warnedPushConfig) {
                structuredLog('warn', 'CLOUD_SYNC_URL not configured, push sync waiting for cloud setup')
                warnedPushConfig = true
            }
            return
        }

        structuredLog('info', result.reason)
        return
    }

    warnedWorkerDisabled = false
    warnedPushConfig = false

    if (result.processed > 0 || result.failed > 0 || result.synced > 0) {
        structuredLog('info', 'push cycle complete', {
            batch: result.processed,
            synced: result.synced,
            failed: result.failed
        })
    }
}

const logPullResult = (result) => {
    if (!result) {
        return
    }

    if (result.skipped && result.reason) {
        if (result.reason === "No users available for catalog pull") {
            if (!warnedPullUsers) {
                structuredLog('warn', 'no sync-enabled users available for catalog pull yet')
                warnedPullUsers = true
            }
            return
        }

        structuredLog('info', result.reason)
        return
    }

    warnedPullUsers = false

    if (
        (result.appliedCount || 0) > 0
        || (result.createdCount || 0) > 0
        || (result.stockUpdatedCount || 0) > 0
        || (result.failureCount || 0) > 0
    ) {
        structuredLog('info', 'pull cycle complete', {
            users: result.usersProcessed || 0,
            applied: result.appliedCount || 0,
            created: result.createdCount || 0,
            stockUpdated: result.stockUpdatedCount || 0,
            failed: result.failureCount || 0
        })
    }
}

const runPushCycle = async () => {
    const result = await SyncService.processPendingBatch()
    logPushResult(result)
}

const runCatalogPullCycle = async () => {
    if (!SYNC_PULL_ENABLED) {
        if (!warnedPullDisabled) {
            structuredLog('warn', 'catalog pull is disabled, set SYNC_PULL_ENABLED=true to enable')
            warnedPullDisabled = true
        }
        return
    }

    warnedPullDisabled = false

    const now = Date.now()
    if (now - lastCatalogPullAt < SYNC_PULL_INTERVAL_MS) {
        return
    }

    lastCatalogPullAt = now
    const result = await SyncService.runCatalogPullCycle()
    logPullResult(result)
}

const runCycle = async () => {
    if (isCycleRunning) {
        return
    }

    isCycleRunning = true

    try {
        await runPushCycle()
        await runCatalogPullCycle()
    } catch (error) {
        structuredLog('error', 'cycle failed', { error: error?.message || String(error) })
    } finally {
        isCycleRunning = false
    }
}

const shutdown = async (signal) => {
    structuredLog('info', 'shutdown requested', { signal })

    if (intervalHandle) {
        clearInterval(intervalHandle)
    }

    try {
        await mongoose.connection.close()
    } catch (error) {
        structuredLog('error', 'failed to close MongoDB connection', {
            signal,
            error: error?.message || String(error)
        })
    } finally {
        process.exit(0)
    }
}

const start = async () => {
    try {
        await ConnectDB()
        structuredLog('info', 'worker started', {
            pushIntervalMs: SYNC_INTERVAL_MS,
            pullIntervalMs: SYNC_PULL_INTERVAL_MS,
            pullEnabled: SYNC_PULL_ENABLED,
            startedAt: workerStartedAt.toISOString()
        })

        await runCycle()
        intervalHandle = setInterval(runCycle, SYNC_INTERVAL_MS)
    } catch (error) {
        structuredLog('error', 'failed to start', { error: error?.message || String(error) })
        process.exit(1)
    }
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))

start()
