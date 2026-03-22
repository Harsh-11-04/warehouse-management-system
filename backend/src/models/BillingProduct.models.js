const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    barcode: {
        type: String,
        trim: true,
        default: ''
    },
    cloudSourceId: {
        type: String,
        trim: true
    },
    name: {
        type: String,
        required: [true, "Product name is required"],
        trim: true
    },
    category: {
        type: String,
        trim: true,
        default: ''
    },
    purchasePrice: {
        type: Number,
        default: 0,
        min: 0
    },
    mrp: {
        type: Number,
        default: 0,
        min: 0
    },
    sellingPrice: {
        type: Number,
        required: [true, "Selling price is required"],
        min: 0
    },
    cardPrice: {
        type: Number,
        default: 0,
        min: 0
    },
    gstPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    lowStockThreshold: {
        type: Number,
        default: 5,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    cloudVersion: {
        type: Number,
        default: 0,
        min: 0
    },
    sourceUpdatedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true })

Schema.index({ barcode: 1, user: 1 })
Schema.index(
    { user: 1, cloudSourceId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            cloudSourceId: { $type: 'string' }
        }
    }
)
Schema.index({ user: 1, isActive: 1 })
Schema.index({ user: 1, name: 'text' })

const model = mongoose.model("BillingProduct", Schema)

module.exports = model
