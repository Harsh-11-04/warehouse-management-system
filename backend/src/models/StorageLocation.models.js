const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    warehouse: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: true
    },
    rack: {
        type: String,
        required: [true, "Rack is required"],
        trim: true
    },
    bin: {
        type: String,
        required: [true, "Bin is required"],
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    zone: {
        type: String,
        trim: true,
        default: 'General'
    },
    capacity: {
        type: Number,
        default: 100,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

Schema.index({ warehouse: 1, rack: 1, bin: 1 }, { unique: true })

const model = mongoose.model("StorageLocation", Schema)

module.exports = model
