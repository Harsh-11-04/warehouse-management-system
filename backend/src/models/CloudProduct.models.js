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
    sku: {
        type: String,
        trim: true,
        default: ""
    },
    barcode: {
        type: String,
        trim: true,
        default: ""
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        trim: true,
        default: ""
    },
    purchasePrice: {
        type: Number,
        default: 0
    },
    mrp: {
        type: Number,
        default: 0
    },
    sellingPrice: {
        type: Number,
        default: 0
    },
    cardPrice: {
        type: Number,
        default: 0
    },
    gstPercent: {
        type: Number,
        default: 0
    },
    active: {
        type: Boolean,
        default: true
    },
    cloudVersion: {
        type: Number,
        default: 1
    },
    sourceUpdatedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true })

Schema.index({ shopId: 1, externalProductId: 1 }, { unique: true })
Schema.index({ shopId: 1, barcode: 1 })
Schema.index({ shopId: 1, active: 1, updatedAt: -1 })
Schema.index({ shopId: 1, name: "text" })

module.exports = mongoose.model("CloudProduct", Schema)
