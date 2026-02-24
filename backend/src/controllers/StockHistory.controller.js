const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const { StockHistoryModel } = require("../models")
const ApiError = require("../utils/ApiError")

class StockHistoryController {
    static getStockHistory = CatchAsync(async (req, res) => {
        const { page = 1, productId, action, startDate, endDate } = req.query
        const limit = 20
        const skip = (Number(page) - 1) * limit

        const query = { user: req.user }

        if (productId) {
            query.product = productId
        }

        if (action) {
            query.action = action
        }

        if (startDate || endDate) {
            query.createdAt = {}
            if (startDate) {
                query.createdAt.$gte = new Date(startDate)
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate)
            }
        }

        const history = await StockHistoryModel.find(query)
            .populate('product', 'name sku')
            .populate('fromLocation', 'rack bin warehouse')
            .populate('toLocation', 'rack bin warehouse')
            .populate('fromLocation.warehouse', 'name')
            .populate('toLocation.warehouse', 'name')
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()

        const total = await StockHistoryModel.countDocuments(query)
        const hasMore = skip + limit < total

        return res.status(httpStatus.OK).json({
            history,
            pagination: {
                current: Number(page),
                hasMore,
                total
            }
        })
    })

    static getProductMovementHistory = CatchAsync(async (req, res) => {
        const { productId } = req.params
        const { startDate, endDate } = req.query

        const query = { 
            user: req.user,
            product: productId
        }

        if (startDate || endDate) {
            query.createdAt = {}
            if (startDate) {
                query.createdAt.$gte = new Date(startDate)
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate)
            }
        }

        const movements = await StockHistoryModel.find(query)
            .populate('fromLocation', 'rack bin warehouse')
            .populate('toLocation', 'rack bin warehouse')
            .populate('fromLocation.warehouse', 'name')
            .populate('toLocation.warehouse', 'name')
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .lean()

        const summary = await StockHistoryModel.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$action',
                    totalQuantity: { $sum: '$quantity' },
                    count: { $sum: 1 }
                }
            }
        ])

        return res.status(httpStatus.OK).json({
            movements,
            summary
        })
    })

    static getAuditTrail = CatchAsync(async (req, res) => {
        const { page = 1, userId, action } = req.query
        const limit = 50
        const skip = (Number(page) - 1) * limit

        const query = { user: req.user }

        if (userId) {
            query.user = userId
        }

        if (action) {
            query.action = action
        }

        const auditTrail = await StockHistoryModel.find(query)
            .populate('product', 'name sku')
            .populate('fromLocation', 'rack bin warehouse')
            .populate('toLocation', 'rack bin warehouse')
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()

        const total = await StockHistoryModel.countDocuments(query)
        const hasMore = skip + limit < total

        return res.status(httpStatus.OK).json({
            auditTrail,
            pagination: {
                current: Number(page),
                hasMore,
                total
            }
        })
    })
}

module.exports = StockHistoryController
