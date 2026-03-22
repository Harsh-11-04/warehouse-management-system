const mongoose = require("mongoose")

const Schema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
        unique: true
    },
    storeName: {
        type: String,
        trim: true,
        default: 'My Store'
    },
    storeAddress: {
        type: String,
        trim: true,
        default: ''
    },
    storePhone: {
        type: String,
        trim: true,
        default: ''
    },
    storeEmail: {
        type: String,
        trim: true,
        default: ''
    },
    gstNumber: {
        type: String,
        trim: true,
        default: ''
    },
    currencySymbol: {
        type: String,
        trim: true,
        default: '₹'
    },
    invoicePrefix: {
        type: String,
        trim: true,
        default: 'INV'
    },
    invoiceFooter: {
        type: String,
        trim: true,
        default: 'Thank you for your business!'
    },
    logoUrl: {
        type: String,
        trim: true,
        default: ''
    }
}, { timestamps: true })

const model = mongoose.model("BillingSettings", Schema)

module.exports = model
