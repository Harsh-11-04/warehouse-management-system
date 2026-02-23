const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    name: {
        type: String,
        required: [true, "Warehouse name is required"],
        trim: true
    },
    address: {
        type: String,
        required: [true, "Address is required"],
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

const model = mongoose.model("Warehouse", Schema)

module.exports = model
