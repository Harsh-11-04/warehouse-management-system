const mongoose = require("mongoose")

const PaymentSchema = new mongoose.Schema({
    mode: {
        type: String,
        trim: true,
        default: ""
    },
    amount: {
        type: Number,
        default: 0
    },
    reference: {
        type: String,
        trim: true,
        default: ""
    }
}, { _id: false })

const ItemSchema = new mongoose.Schema({
    externalProductId: {
        type: String,
        trim: true,
        default: ""
    },
    name: {
        type: String,
        trim: true,
        default: ""
    },
    barcode: {
        type: String,
        trim: true,
        default: ""
    },
    quantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        default: 0
    },
    gstPercent: {
        type: Number,
        default: 0
    },
    gstAmount: {
        type: Number,
        default: 0
    },
    lineTotal: {
        type: Number,
        default: 0
    }
}, { _id: false })

const Schema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CloudShop",
        required: true
    },
    eventId: {
        type: String,
        required: true,
        trim: true
    },
    sourceUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    deviceId: {
        type: String,
        trim: true,
        default: ""
    },
    externalBillId: {
        type: String,
        required: true,
        trim: true
    },
    localInvoiceId: {
        type: String,
        trim: true,
        default: ""
    },
    customer: {
        customerId: {
            type: String,
            trim: true,
            default: ""
        },
        name: {
            type: String,
            trim: true,
            default: "Walk-in"
        },
        phone: {
            type: String,
            trim: true,
            default: ""
        }
    },
    items: {
        type: [ItemSchema],
        default: []
    },
    subtotal: {
        type: Number,
        default: 0
    },
    taxTotal: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    discountType: {
        type: String,
        enum: ["flat", "percent", ""],
        default: "flat"
    },
    grandTotal: {
        type: Number,
        default: 0
    },
    payments: {
        type: [PaymentSchema],
        default: []
    },
    paymentMode: {
        type: String,
        trim: true,
        default: ""
    },
    paymentStatus: {
        type: String,
        trim: true,
        default: ""
    },
    billedBy: {
        type: String,
        trim: true,
        default: ""
    },
    status: {
        type: String,
        enum: ["completed", "void", "returned"],
        default: "completed"
    },
    sourceCreatedAt: {
        type: Date,
        default: null
    },
    syncedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true })

Schema.index({ shopId: 1, eventId: 1 }, { unique: true })
Schema.index({ shopId: 1, externalBillId: 1 }, { unique: true })
Schema.index({ shopId: 1, sourceCreatedAt: -1 })
Schema.index({ shopId: 1, paymentMode: 1, sourceCreatedAt: -1 })

module.exports = mongoose.model("CloudSale", Schema)
