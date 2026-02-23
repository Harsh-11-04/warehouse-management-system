const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    name: {
        type: String,
        required: [true, "Product name is required"],
        trim: true
    },
    sku: {
        type: String,
        required: [true, "SKU is required"],
        trim: true
    },
    category: {
        type: String,
        trim: true,
        default: ''
    },
    price: {
        type: Number,
        required: [true, "Price is required"],
        default: 0
    },
    totalQuantity: {
        type: Number,
        default: 0,
        min: [0, "Total quantity cannot be negative"]
    },
    reorderThreshold: {
        type: Number,
        default: 10,
        min: 0
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, { timestamps: true })

Schema.index({ sku: 1, user: 1 }, { unique: true })
Schema.index({ user: 1, status: 1 })
Schema.index({ user: 1, createdAt: -1 })

const model = mongoose.model("Product", Schema)

module.exports = model
