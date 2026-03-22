const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    name: {
        type: String,
        required: [true, "Customer name is required"],
        trim: true
    },
    phone: {
        type: String,
        required: [true, "Phone number is required"],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    address: {
        type: String,
        trim: true,
        default: ''
    },
    gstNumber: {
        type: String,
        trim: true,
        default: ''
    },
    hasCard: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

Schema.index({ phone: 1, user: 1 }, { unique: true })
Schema.index({ user: 1, isActive: 1 })
Schema.index({ user: 1, name: 'text', phone: 'text' })

const model = mongoose.model("BillingCustomer", Schema)

module.exports = model
