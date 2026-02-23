const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    fromLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'StorageLocation', default: null },
    toLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'StorageLocation', default: null },
    quantity: { type: Number, required: true, min: 0 },
    action: {
        type: String,
        required: true,
        enum: ['Receive', 'Pick', 'Transfer', 'Assign', 'Shipment_Inbound', 'Shipment_Outbound', 'Adjustment']
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    reference: { type: String, trim: true, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true })

Schema.index({ product: 1, createdAt: -1 })
Schema.index({ user: 1, createdAt: -1 })
Schema.index({ action: 1, createdAt: -1 })

module.exports = mongoose.model("StockHistory", Schema)
