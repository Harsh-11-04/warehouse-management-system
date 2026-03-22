const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    ownerUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        unique: true
    },
    shopCode: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    timezone: {
        type: String,
        trim: true,
        default: "Asia/Kolkata"
    },
    currency: {
        type: String,
        trim: true,
        default: "INR"
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { timestamps: true })

Schema.index({ ownerUser: 1 }, { unique: true })
Schema.index({ shopCode: 1 }, { unique: true })
Schema.index({ status: 1, updatedAt: -1 })

module.exports = mongoose.model("CloudShop", Schema)
