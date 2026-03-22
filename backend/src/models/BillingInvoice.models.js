const mongoose = require("mongoose")

const InvoiceItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BillingProduct',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    barcode: {
        type: String,
        default: ''
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
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
        required: true,
        min: 0
    },
    returnedQuantity: {
        type: Number,
        default: 0,
        min: 0
    },
    profit: {
        type: Number,
        default: 0
    }
}, { _id: false })

const Schema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BillingCustomer',
        default: null
    },
    customerName: {
        type: String,
        default: 'Walk-in'
    },
    customerPhone: {
        type: String,
        default: ''
    },
    items: {
        type: [InvoiceItemSchema],
        required: true,
        validate: [arr => arr.length > 0, "Invoice must have at least one item"]
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    totalGst: {
        type: Number,
        default: 0,
        min: 0
    },
    grandTotal: {
        type: Number,
        required: true,
        min: 0
    },
    totalProfit: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    discountType: {
        type: String,
        enum: ['flat', 'percent'],
        default: 'flat'
    },
    paymentMode: {
        type: String,
        enum: ['Cash', 'Online', 'UPI', 'Card'],
        default: 'Cash'
    },
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Unpaid'],
        default: 'Paid'
    },
    billedBy: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['completed', 'voided'],
        default: 'completed'
    },
    syncState: {
        type: String,
        enum: ['pending', 'synced', 'failed'],
        default: 'pending'
    },
    syncedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true })

Schema.index({ user: 1, createdAt: -1 })
Schema.index({ user: 1, invoiceNumber: 1 })
Schema.index({ user: 1, customerName: 'text', invoiceNumber: 'text' })
Schema.index({ user: 1, syncState: 1, createdAt: -1 })

const model = mongoose.model("BillingInvoice", Schema)

module.exports = model
