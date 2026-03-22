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
    externalProductId: {
        type: String,
        required: true,
        trim: true
    },
    productName: {
        type: String,
        trim: true,
        default: ""
    },
    quantityDelta: {
        type: Number,
        required: true
    },
    movementType: {
        type: String,
        trim: true,
        default: "adjust"
    },
    refType: {
        type: String,
        trim: true,
        default: ""
    },
    refId: {
        type: String,
        trim: true,
        default: ""
    },
    refNumber: {
        type: String,
        trim: true,
        default: ""
    },
    sourceCreatedAt: {
        type: Date,
        default: null
    },
    syncedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true })

Schema.index({ shopId: 1, eventId: 1 }, { unique: true })
Schema.index({ shopId: 1, externalProductId: 1, sourceCreatedAt: -1 })
Schema.index({ shopId: 1, movementType: 1, sourceCreatedAt: -1 })

module.exports = mongoose.model("CloudInventoryMovement", Schema)
