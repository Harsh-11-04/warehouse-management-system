const { ReorderSuggestionModel } = require("../models");
const ActivityLogService = require("./ActivityLog.service");

class ReorderSuggestionService {
    /**
     * Create a reorder suggestion if one doesn't already exist for the product
     */
    static async createSuggestion(user, productId, session = null, suggestedQuantity = 50) {
        const existing = await ReorderSuggestionModel.findOne({
            product: productId,
            status: "Pending",
        }).session(session || null);

        if (existing) {
            return existing;
        }

        const suggestionData = {
            product: productId,
            user,
            suggestedQuantity,
            status: "Pending",
        };

        let suggestion;
        if (session) {
            [suggestion] = await ReorderSuggestionModel.create([suggestionData], { session });
        } else {
            suggestion = await ReorderSuggestionModel.create(suggestionData);
        }

        await ActivityLogService.log(
            user,
            "Auto Reorder Suggestion",
            "ReorderSuggestion",
            suggestion._id,
            `Suggested reorder of ${suggestedQuantity} units for product ${productId}`
        );
        return suggestion;
    }

    /**
     * Resolve all pending suggestions for a product when stock is replenished
     */
    static async resolveAllPendingForProduct(productId, session = null) {
        await ReorderSuggestionModel.updateMany(
            { product: productId, status: "Pending" },
            { $set: { status: "Resolved" } }
        ).session(session || null);
    }

    /**
     * Get all reorder suggestions, optionally filtered by status
     */
    static async getAllSuggestions(status = '') {
        const query = {};
        if (status) {
            query.status = status;
        }
        return await ReorderSuggestionModel.find(query)
            .populate("product", "name sku totalQuantity reorderThreshold price category")
            .sort({ createdAt: -1 })
            .lean();
    }

    /**
     * Update the status of a suggestion (e.g., mark as Ordered or Ignored)
     */
    static async updateSuggestionStatus(user, id, status) {
        const suggestion = await ReorderSuggestionModel.findOne({ _id: id });
        if (!suggestion) {
            throw new Error("Reorder suggestion not found");
        }

        suggestion.status = status;
        await suggestion.save();
        return suggestion;
    }
}

module.exports = ReorderSuggestionService;
