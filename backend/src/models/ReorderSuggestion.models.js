const mongoose = require("mongoose");

const reorderSuggestionSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        suggestedQuantity: {
            type: Number,
            required: true,
            min: 1,
        },
        status: {
            type: String,
            enum: ["Pending", "Ordered", "Ignored"],
            default: "Pending",
        },
        draftPurchaseOrder: {
            vendor: { type: String, trim: true, default: '' },
            quantity: { type: Number, min: 1, default: null },
            notes: { type: String, trim: true, default: '' }
        }
    },
    { timestamps: true }
);

// Index for quick lookups by user and status
reorderSuggestionSchema.index({ user: 1, status: 1 });
// Unique pending suggestion per product per user
reorderSuggestionSchema.index({ product: 1, user: 1, status: 1 }, { unique: true, partialFilterExpression: { status: "Pending" } });

const ReorderSuggestion = mongoose.model("ReorderSuggestion", reorderSuggestionSchema);

module.exports = ReorderSuggestion;
