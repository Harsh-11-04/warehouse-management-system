const { ProductModel, ShipmentModel, StockLocationModel, WarehouseModel, StockHistoryModel, StorageLocationModel, ReorderSuggestionModel } = require("../models")
const mongoose = require('mongoose')

class ReportService {

    // Total inventory value (sum of quantity × price)
    static async getInventoryValuation(user) {
        let userId;
        try {
            userId = (typeof user === 'string') ? new mongoose.Types.ObjectId(user.trim()) : user
        } catch (e) {
            userId = user; // Fallback for standard queries, aggregate will likely fail
        }

        const result = await ProductModel.aggregate([
            { $match: { user: userId, status: 'Active' } },
            {
                $group: {
                    _id: null,
                    totalValue: { $sum: { $multiply: ['$totalQuantity', '$price'] } },
                    totalProducts: { $sum: 1 },
                    totalUnits: { $sum: '$totalQuantity' }
                }
            }
        ])

        const valuation = result.length > 0 ? result[0] : { totalValue: 0, totalProducts: 0, totalUnits: 0 }

        // Category breakdown
        const categoryBreakdown = await ProductModel.aggregate([
            { $match: { user: userId, status: 'Active' } },
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    totalValue: { $sum: { $multiply: ['$totalQuantity', '$price'] } },
                    totalUnits: { $sum: '$totalQuantity' }
                }
            },
            { $sort: { totalValue: -1 } }
        ])

        return { valuation, categoryBreakdown }
    }

    // Low-stock products (qty <= reorderThreshold)
    static async getLowStockProducts(user) {
        const products = await ProductModel.find({
            user,
            status: 'Active',
            $expr: { $lte: ['$totalQuantity', '$reorderThreshold'] }
        }).select('name sku category totalQuantity reorderThreshold price').sort({ totalQuantity: 1 }).lean()

        return { products, count: products.length }
    }

    // Shipment summaries
    static async getShipmentSummary(user, days = 30) {
        let userId;
        try {
            userId = (typeof user === 'string') ? new mongoose.Types.ObjectId(user.trim()) : user
        } catch (e) {
            userId = user;
        }

        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate() - days)

        const summary = await ShipmentModel.aggregate([
            { $match: { user: userId, createdAt: { $gte: dateFrom } } },
            {
                $group: {
                    _id: { type: '$type', status: '$status' },
                    count: { $sum: 1 },
                    totalQty: { $sum: '$quantity' }
                }
            }
        ])

        // Organize into readable format
        const inbound = { total: 0, pending: 0, inTransit: 0, delivered: 0, totalQty: 0 }
        const outbound = { total: 0, pending: 0, inTransit: 0, delivered: 0, totalQty: 0 }

        summary.forEach(item => {
            const target = item._id.type === 'Inbound' ? inbound : outbound
            target.total += item.count
            target.totalQty += item.totalQty
            if (item._id.status === 'Pending') target.pending += item.count
            if (item._id.status === 'In Transit') target.inTransit += item.count
            if (item._id.status === 'Delivered') target.delivered += item.count
        })

        return { inbound, outbound, period: `Last ${days} days` }
    }

    // Warehouse-wise stock summary
    static async getWarehouseWiseStock(user) {
        let userId
        try {
            userId = (typeof user === 'string') ? new mongoose.Types.ObjectId(user.trim()) : user
        } catch (e) {
            userId = user
        }
        const warehouses = await WarehouseModel.find({ user: userId, isActive: true })
        const result = []
        for (const wh of warehouses) {
            const locIds = await StorageLocationModel.find({ warehouse: wh._id }).distinct('_id')
            const agg = await StockLocationModel.aggregate([
                { $match: { location: { $in: locIds } } },
                { $group: { _id: null, totalQty: { $sum: '$quantity' }, productCount: { $addToSet: '$product' } } },
                { $project: { totalQty: 1, productCount: { $size: '$productCount' } } }
            ])
            const valAgg = await StockLocationModel.aggregate([
                { $match: { location: { $in: locIds } } },
                { $lookup: { from: 'products', localField: 'product', foreignField: '_id', as: 'prod' } },
                { $unwind: '$prod' },
                { $project: { value: { $multiply: ['$quantity', '$prod.price'] } } },
                { $group: { _id: null, totalValue: { $sum: '$value' } } }
            ])
            result.push({
                warehouseId: wh._id,
                warehouseName: wh.name,
                totalQuantity: agg[0]?.totalQty || 0,
                productCount: agg[0]?.productCount || 0,
                totalValue: valAgg[0]?.totalValue || 0
            })
        }
        return { warehouses: result }
    }

    // Monthly inventory summary
    static async getMonthlyInventorySummary(user, months = 6) {
        let userId
        try {
            userId = (typeof user === 'string') ? new mongoose.Types.ObjectId(user.trim()) : user
        } catch (e) {
            userId = user
        }
        const productIds = await ProductModel.find({ user: userId }).distinct('_id')
        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - months)
        const summary = await StockHistoryModel.aggregate([
            { $match: { product: { $in: productIds }, createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    receiveQty: { $sum: { $cond: [{ $in: ['$action', ['Receive', 'Assign', 'Shipment_Inbound']] }, '$quantity', 0] } },
                    outQty: { $sum: { $cond: [{ $in: ['$action', ['Pick', 'Shipment_Outbound']] }, '$quantity', 0] } },
                    transferCount: { $sum: { $cond: [{ $eq: ['$action', 'Transfer'] }, 1, 0] } }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ])
        return { summary, months }
    }

    // Dashboard overview stats with enhanced KPIs
    static async getDashboardStats(user) {
        let userId;
        try {
            userId = (typeof user === 'string') ? new mongoose.Types.ObjectId(user.trim()) : user
        } catch (e) {
            userId = user;
        }

        const valuationData = await this.getInventoryValuation(userId)
        const valuation = valuationData.valuation

        const lowStockCount = await ProductModel.countDocuments({
            user: userId,
            status: 'Active',
            $expr: { $lte: ['$totalQuantity', '$reorderThreshold'] }
        })

        const pendingReorderCount = await ReorderSuggestionModel.countDocuments({ user: userId, status: 'Pending' })

        const totalWarehouses = await WarehouseModel.countDocuments({ user: userId, isActive: true })

        const pendingShipments = await ShipmentModel.countDocuments({
            user: userId,
            status: { $in: ['Pending', 'In Transit'] }
        })

        const recentShipments = await ShipmentModel.find({ user: userId })
            .populate('product', 'name sku')
            .sort({ createdAt: -1 })
            .limit(5)

        // Daily inbound/outbound (last 7 days)
        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate() - 7)
        const dailyShipments = await ShipmentModel.aggregate([
            { $match: { user: userId, createdAt: { $gte: dateFrom } } },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        type: '$type'
                    },
                    count: { $sum: 1 },
                    totalQty: { $sum: '$quantity' }
                }
            },
            { $sort: { '_id.date': 1 } }
        ])

        // Fast vs slow moving (from StockHistory - Pick, Shipment_Outbound in last 30 days)
        const productIds = await ProductModel.find({ user: userId }).distinct('_id')
        const movementDateFrom = new Date()
        movementDateFrom.setDate(movementDateFrom.getDate() - 30)
        const movementAgg = await StockHistoryModel.aggregate([
            { $match: { product: { $in: productIds }, action: { $in: ['Pick', 'Shipment_Outbound'] }, createdAt: { $gte: movementDateFrom } } },
            { $group: { _id: '$product', totalMoved: { $sum: '$quantity' } } },
            { $sort: { totalMoved: -1 } }
        ])
        const sortedByMovement = movementAgg.map(m => m._id.toString())
        const fastMovingIds = sortedByMovement.slice(0, Math.ceil(sortedByMovement.length * 0.2))
        const slowMovingIds = sortedByMovement.slice(-Math.ceil(sortedByMovement.length * 0.2))
        const fastMovingProducts = await ProductModel.find({ _id: { $in: fastMovingIds } }).select('name sku totalQuantity').lean()
        const slowMovingProducts = await ProductModel.find({ _id: { $in: slowMovingIds } }).select('name sku totalQuantity').lean()

        // Warehouse utilization %
        const warehouses = await WarehouseModel.find({ user: userId, isActive: true }).select('_id name').lean()
        const utilization = []
        for (const wh of warehouses) {
            const locs = await StorageLocationModel.find({ warehouse: wh._id, isActive: true })
            const totalCapacity = locs.reduce((s, l) => s + (l.capacity || 100), 0)
            const stockAtWh = await StockLocationModel.aggregate([
                { $match: { location: { $in: locs.map(l => l._id) } } },
                { $group: { _id: null, qty: { $sum: '$quantity' } } }
            ])
            const usedQty = stockAtWh[0]?.qty || 0
            utilization.push({
                warehouseId: wh._id,
                warehouseName: wh.name,
                used: usedQty,
                capacity: totalCapacity,
                percent: totalCapacity > 0 ? Math.round((usedQty / totalCapacity) * 100) : 0
            })
        }

        return {
            totalProducts: valuation.totalProducts || 0,
            totalUnits: valuation.totalUnits || 0,
            totalValue: valuation.totalValue || 0,
            lowStockCount,
            pendingReorderCount,
            totalWarehouses,
            pendingShipments,
            recentShipments,
            dailyInboundOutbound: dailyShipments,
            fastMovingProducts,
            slowMovingProducts,
            warehouseUtilization: utilization
        }
    }
}

module.exports = ReportService
