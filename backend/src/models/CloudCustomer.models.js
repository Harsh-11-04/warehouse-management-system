const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CloudShop",
        required: true
    },
    externalCustomerId: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true,
        default: ""
    },
    email: {
        type: String,
        trim: true,
        default: ""
    },
    address: {
        type: String,
        trim: true,
        default: ""
    },
    gstNumber: {
        type: String,
        trim: true,
        default: ""
    },
    hasCard: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    sourceUpdatedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true })

Schema.index({ shopId: 1, externalCustomerId: 1 }, { unique: true })
Schema.index({ shopId: 1, phone: 1 })
Schema.index({ shopId: 1, name: "text", phone: "text" })

module.exports = mongoose.model("CloudCustomer", Schema)
