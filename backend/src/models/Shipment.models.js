const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    type: {
        type: String,
        enum: ['Inbound', 'Outbound'],
        required: [true, "Shipment type is required"]
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, "Product is required"]
    },
    quantity: {
        type: Number,
        required: [true, "Quantity is required"],
        min: [1, "Quantity must be at least 1"]
    },
    status: {
        type: String,
        enum: ['Pending', 'In Transit', 'Delivered'],
        default: 'Pending'
    },
    handledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    }
}, { timestamps: true })

Schema.index({ user: 1, type: 1 })
Schema.index({ user: 1, status: 1 })
Schema.index({ product: 1 })
Schema.index({ user: 1, createdAt: -1 })

const model = mongoose.model("Shipment", Schema)

module.exports = model
