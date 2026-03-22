const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CloudShop",
        required: true
    },
    eventId: {
        type: String,
        required: true,
        trim: true
    },
    sourceUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    deviceId: {
        type: String,
        trim: true,
        default: ""
    },
    entityType: {
        type: String,
        required: true,
        trim: true
    },
    operation: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["received", "processed", "failed", "duplicate", "ignored"],
        default: "received"
    },
    error: {
        type: String,
        trim: true,
        default: null
    },
    duplicateCount: {
        type: Number,
        default: 0
    },
    payloadSnapshot: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    receivedAt: {
        type: Date,
        default: Date.now
    },
    processedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true })

Schema.index({ shopId: 1, eventId: 1 }, { unique: true })
Schema.index({ shopId: 1, status: 1, updatedAt: -1 })
Schema.index({ shopId: 1, entityType: 1, receivedAt: -1 })

module.exports = mongoose.model("CloudSyncAudit", Schema)
