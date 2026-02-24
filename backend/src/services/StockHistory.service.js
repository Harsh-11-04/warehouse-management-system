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
            metadata = {},
            session = null
        } = params
        
        const historyData = {
            product: productId,
            fromLocation: fromLocationId,
            toLocation: toLocationId,
            quantity,
            action,
            user: userId,
            reference,
            metadata
        }

        if (session) {
            await StockHistoryModel.create([historyData], { session })
        } else {
            await StockHistoryModel.create(historyData)
        }
    }
}

module.exports = StockHistoryService
