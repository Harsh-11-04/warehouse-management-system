const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CloudShop",
        required: true
    },
    externalProductId: {
        type: String,
        required: true,
        trim: true
    },
    onHand: {
        type: Number,
        default: 0
    },
    reserved: {
        type: Number,
        default: 0
    },
    reorderLevel: {
        type: Number,
        default: 0
    },
    version: {
        type: Number,
        default: 1
    },
    sourceUpdatedAt: {
        type: Date,
        default: null
    },
    lastMovementAt: {
        type: Date,
        default: null
    }
}, { timestamps: true })

Schema.index({ shopId: 1, externalProductId: 1 }, { unique: true })
Schema.index({ shopId: 1, onHand: 1 })
Schema.index({ shopId: 1, reorderLevel: 1 })

module.exports = mongoose.model("CloudInventory", Schema)
