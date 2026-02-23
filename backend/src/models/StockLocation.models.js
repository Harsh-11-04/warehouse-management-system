const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StorageLocation',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        default: 0,
        min: [0, "Quantity cannot be negative"]
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    }
}, { timestamps: true })

Schema.index({ product: 1, location: 1 }, { unique: true })
Schema.index({ user: 1 })
Schema.index({ location: 1 })

const model = mongoose.model("StockLocation", Schema)

module.exports = model
