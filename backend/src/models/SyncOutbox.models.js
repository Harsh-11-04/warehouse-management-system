const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    eventId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    entityType: {
        type: String,
        required: true,
        trim: true
    },
    entityId: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    operation: {
        type: String,
        required: true,
        enum: ['create', 'update', 'delete', 'return', 'void', 'adjust']
    },
    sourceModule: {
        type: String,
        trim: true,
        default: 'system'
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'failed', 'synced', 'dead_letter'],
        default: 'pending'
    },
    retryCount: {
        type: Number,
        default: 0,
        min: 0
    },
    nextRetryAt: {
        type: Date,
        default: Date.now
    },
    lockedAt: {
        type: Date,
        default: null
    },
    syncedAt: {
        type: Date,
        default: null
    },
    lastError: {
        type: String,
        trim: true,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { timestamps: true })

Schema.index({ user: 1, status: 1, nextRetryAt: 1 })
Schema.index({ status: 1, nextRetryAt: 1, createdAt: 1 })
Schema.index({ status: 1, lockedAt: 1, createdAt: 1 })
Schema.index({ user: 1, entityType: 1, createdAt: -1 })
Schema.index({ user: 1, sourceModule: 1, createdAt: -1 })

const model = mongoose.model("SyncOutbox", Schema)

module.exports = model
