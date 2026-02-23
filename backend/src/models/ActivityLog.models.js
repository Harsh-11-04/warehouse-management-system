const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    action: {
        type: String,
        required: [true, "Action is required"],
        trim: true
    },
    entity: {
        type: String,
        required: [true, "Entity type is required"],
        enum: ['Product', 'Warehouse', 'StorageLocation', 'StockLocation', 'Shipment', 'User']
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId
    },
    details: {
        type: String,
        trim: true,
        default: ''
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    }
}, { timestamps: true })

Schema.index({ user: 1, createdAt: -1 })
Schema.index({ entity: 1, entityId: 1 })

const model = mongoose.model("ActivityLog", Schema)

module.exports = model
