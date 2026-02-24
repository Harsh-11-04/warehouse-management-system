const httpStatus = require("http-status")
const mongoose = require("mongoose")
const { ProductModel, StockLocationModel, StockHistoryModel, WarehouseModel, StorageLocationModel } = require("../models")
const ApiError = require("../utils/ApiError")

class DashboardService {

    static async getInventoryValue(user) {
        const userObjectId = new mongoose.Types.ObjectId(user)
        const result = await ProductModel.aggregate([
            { $match: { user: userObjectId, status: 'Active' } },
            {
                $group: {
                    _id: null,
                    totalValue: { $sum: { $multiply: ['$totalQuantity', '$price'] } },
                    totalProducts: { $sum: 1 },
                    totalStock: { $sum: '$totalQuantity' }
                }
            }
        ])

        return {
            totalInventoryValue: result[0]?.totalValue || 0,
            totalProducts: result[0]?.totalProducts || 0,
            totalStock: result[0]?.totalStock || 0
        }
    }

    static async getLowStockAlerts(user) {
        const userObjectId = new mongoose.Types.ObjectId(user)
        const lowStockProducts = await ProductModel.find({
            user: userObjectId,
            status: 'Active',
            $expr: { $lte: ['$totalQuantity', '$reorderThreshold'] }
        })
            .select('name sku totalQuantity reorderThreshold price')
            .lean()

        return {
            lowStockCount: lowStockProducts.length,
            lowStockProducts
        }
    }

    static async getDailyMovements(user) {
        const userObjectId = new mongoose.Types.ObjectId(user)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const [inbound, outbound] = await Promise.all([
            StockHistoryModel.aggregate([
                {
                    $match: {
                        user: userObjectId,
                        createdAt: { $gte: today, $lt: tomorrow },
                        action: { $in: ['Receive', 'Assign', 'Shipment_Inbound'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalQuantity: { $sum: '$quantity' },
                        transactions: { $sum: 1 }
                    }
                }
            ]),
            StockHistoryModel.aggregate([
                {
                    $match: {
                        user: userObjectId,
                        createdAt: { $gte: today, $lt: tomorrow },
                        action: { $in: ['Pick', 'Shipment_Outbound'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalQuantity: { $sum: '$quantity' },
                        transactions: { $sum: 1 }
                    }
                }
            ])
        ])

        return {
            inbound: {
                quantity: inbound[0]?.totalQuantity || 0,
                transactions: inbound[0]?.transactions || 0
            },
            outbound: {
                quantity: outbound[0]?.totalQuantity || 0,
                transactions: outbound[0]?.transactions || 0
            }
        }
    }

    static async getWarehouseUtilization(user) {
        const userObjectId = new mongoose.Types.ObjectId(user)
        const warehouses = await WarehouseModel.find({ user: userObjectId }).lean()
        const utilizationData = []

        for (const warehouse of warehouses) {
            const storageLocations = await StorageLocationModel.find({ warehouse: warehouse._id })
            const totalLocations = storageLocations.length

            const occupiedLocations = await StockLocationModel.aggregate([
                {
                    $lookup: {
                        from: 'storagelocations',
                        localField: 'location',
                        foreignField: '_id',
                        as: 'storageInfo'
                    }
                },
                {
                    $match: {
                        user: userObjectId,
                        'storageInfo.warehouse': warehouse._id,
                        quantity: { $gt: 0 }
                    }
                },
                {
                    $count: 'occupied'
                }
            ])

            const utilizationRate = totalLocations > 0 
                ? ((occupiedLocations[0]?.occupied || 0) / totalLocations) * 100 
                : 0

            utilizationData.push({
                warehouseName: warehouse.name,
                totalLocations,
                occupiedLocations: occupiedLocations[0]?.occupied || 0,
                utilizationRate: Math.round(utilizationRate * 100) / 100
            })
        }

        return utilizationData
    }

    static async getFastSlowMovingProducts(user) {
        const userObjectId = new mongoose.Types.ObjectId(user)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const productMovements = await StockHistoryModel.aggregate([
            {
                $match: {
                    user: userObjectId,
                    createdAt: { $gte: thirtyDaysAgo },
                    action: { $in: ['Pick', 'Shipment_Outbound'] }
                }
            },
            {
                $group: {
                    _id: '$product',
                    totalQuantity: { $sum: '$quantity' },
                    movements: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            {
                $unwind: '$productInfo'
            },
            {
                $project: {
                    productName: '$productInfo.name',
                    sku: '$productInfo.sku',
                    totalQuantity: 1,
                    movements: 1,
                    currentStock: '$productInfo.totalQuantity'
                }
            },
            {
                $sort: { totalQuantity: -1 }
            }
        ])

        const totalProducts = productMovements.length
        const fastMovingThreshold = Math.ceil(totalProducts * 0.2)

        return {
            fastMoving: productMovements.slice(0, fastMovingThreshold),
            slowMoving: productMovements.slice(-fastMovingThreshold).reverse(),
            noMovement: await ProductModel.find({
                user: userObjectId,
                status: 'Active',
                _id: { $nin: productMovements.map(p => p._id) }
            }).select('name sku totalQuantity').lean()
        }
    }

    static async getMonthlyInventorySummary(user) {
        const userObjectId = new mongoose.Types.ObjectId(user)
        const sixMonthsAgo = new Date()
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
        sixMonthsAgo.setDate(1)

        const monthlyData = await StockHistoryModel.aggregate([
            {
                $match: {
                    user: userObjectId,
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    inbound: {
                        $sum: {
                            $cond: [
                                { $in: ['$action', ['Receive', 'Assign', 'Shipment_Inbound']] },
                                '$quantity',
                                0
                            ]
                        }
                    },
                    outbound: {
                        $sum: {
                            $cond: [
                                { $in: ['$action', ['Pick', 'Shipment_Outbound']] },
                                '$quantity',
                                0
                            ]
                        }
                    },
                    transactions: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            }
        ])

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        return monthlyData.map(data => ({
            month: `${monthNames[data._id.month - 1]} ${data._id.year}`,
            inbound: data.inbound,
            outbound: data.outbound,
            netMovement: data.inbound - data.outbound,
            transactions: data.transactions
        }))
    }

    static async getDashboardKPIs(user) {
        const [
            inventoryValue,
            lowStockAlerts,
            dailyMovements,
            warehouseUtilization,
            fastSlowMoving,
            monthlySummary
        ] = await Promise.all([
            this.getInventoryValue(user),
            this.getLowStockAlerts(user),
            this.getDailyMovements(user),
            this.getWarehouseUtilization(user),
            this.getFastSlowMovingProducts(user),
            this.getMonthlyInventorySummary(user)
        ])

        return {
            inventoryValue,
            lowStockAlerts,
            dailyMovements,
            warehouseUtilization,
            fastSlowMoving,
            monthlySummary
        }
    }
}

module.exports = DashboardService
