const { ReorderSuggestionModel } = require("../models");

class ReorderSuggestionService {
    /**
     * Create a reorder suggestion if one doesn't already exist for the product/user
     */
    static async createSuggestion(user, productId, suggestedQuantity = 50) {
        const existing = await ReorderSuggestionModel.findOne({
            product: productId,
            user,
            status: "Pending",
        });

        if (existing) {
            return existing;
        }

        return await ReorderSuggestionModel.create({
            product: productId,
            user,
            suggestedQuantity,
            status: "Pending",
        });
    }

    /**
     * Get all pending reorder suggestions for a user
     */
    static async getAllSuggestions(user) {
        return await ReorderSuggestionModel.find({ user, status: "Pending" })
            .populate("product", "name sku totalQuantity reorderThreshold price category")
            .sort({ createdAt: -1 })
            .lean();
    }

    /**
     * Update the status of a suggestion (e.g., mark as Ordered or Ignored)
     */
    static async updateSuggestionStatus(user, id, status) {
        const suggestion = await ReorderSuggestionModel.findOne({ _id: id, user });
        if (!suggestion) {
            throw new Error("Reorder suggestion not found");
        }

        suggestion.status = status;
        await suggestion.save();
        return suggestion;
    }
}

module.exports = ReorderSuggestionService;
