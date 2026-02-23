const { StockHistoryModel } = require("../models")

class StockHistoryService {
    static async log(params) {
        const {
            productId,
            fromLocationId = null,
            toLocationId = null,
            quantity,
            action,
            userId,
            reference = '',
            metadata = {}
        } = params
        await StockHistoryModel.create({
            product: productId,
            fromLocation: fromLocationId,
            toLocation: toLocationId,
            quantity,
            action,
            user: userId,
            reference,
            metadata
        })
    }
}

module.exports = StockHistoryService
