const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        unique: true
    },
    isOnline: {
        type: Boolean,
        default: true
    },
    workerStatus: {
        type: String,
        enum: ['idle', 'running', 'paused', 'error'],
        default: 'idle'
    },
    lastPushAttemptAt: {
        type: Date,
        default: null
    },
    lastPushSuccessAt: {
        type: Date,
        default: null
    },
    lastPullAttemptAt: {
        type: Date,
        default: null
    },
    lastPullSuccessAt: {
        type: Date,
        default: null
    },
    lastWorkerHeartbeatAt: {
        type: Date,
        default: null
    },
    catalogCursor: {
        type: String,
        trim: true,
        default: ''
    },
    lastError: {
        type: String,
        trim: true,
        default: null
    },
    lastPushBatchSize: {
        type: Number,
        default: 0
    },
    lastPullBatchSize: {
        type: Number,
        default: 0
    }
}, { timestamps: true })

Schema.index({ workerStatus: 1, updatedAt: -1 })

const model = mongoose.model("SyncState", Schema)

module.exports = model
