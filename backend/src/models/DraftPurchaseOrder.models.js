const mongoose = require("mongoose")

const DraftPurchaseOrderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    reorderSuggestion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReorderSuggestion',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    suggestedQuantity: {
        type: Number,
        required: true,
        min: 1
    },
    approvedQuantity: {
        type: Number,
        default: null
    },
    supplier: {
        type: String,
        trim: true,
        default: ''
    },
    estimatedCost: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Draft', 'Pending_Approval', 'Approved', 'Rejected', 'Ordered'],
        default: 'Draft'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null
    },
    approvedAt: {
        type: Date,
        default: null
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    }
}, { timestamps: true })

DraftPurchaseOrderSchema.index({ user: 1, status: 1 })
DraftPurchaseOrderSchema.index({ reorderSuggestion: 1 })
DraftPurchaseOrderSchema.index({ product: 1 })

const model = mongoose.model("DraftPurchaseOrder", DraftPurchaseOrderSchema)
module.exports = model
