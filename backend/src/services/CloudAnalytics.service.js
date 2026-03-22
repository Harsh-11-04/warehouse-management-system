const mongoose = require("mongoose")
const CloudSyncService = require("./CloudSync.service")
const {
    CloudSaleModel,
    CloudInventoryModel,
    CloudProductModel,
    CloudSyncAuditModel
} = require("../models")

const DEFAULT_DAYS = 30
const DEFAULT_MONTHS = 12
const DEFAULT_LIMIT = 10

const clampNumber = (value, fallback, min, max) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
        return fallback
    }

    return Math.min(Math.max(parsed, min), max)
}

const getDateParts = (date, timeZone, options) => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        ...options
    })

    return formatter.formatToParts(date).reduce((acc, part) => {
        if (part.type !== "literal") {
            acc[part.type] = part.value
        }
        return acc
    }, {})
}

const formatDayKey = (date, timeZone) => {
    const parts = getDateParts(date, timeZone, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    })

    return `${parts.year}-${parts.month}-${parts.day}`
}

const formatMonthKey = (date, timeZone) => {
    const parts = getDateParts(date, timeZone, {
        year: "numeric",
        month: "2-digit"
    })

    return `${parts.year}-${parts.month}`
}

class CloudAnalyticsService {
    static async getShopContext(userId) {
        const shop = await CloudSyncService.ensureShopForUser(userId)

        return {
            shop,
            shopId: new mongoose.Types.ObjectId(shop._id),
            timeZone: shop.timezone || "Asia/Kolkata"
        }
    }

    static async getOverview(userId) {
        const { shop, shopId, timeZone } = await this.getShopContext(userId)
        const todayKey = formatDayKey(new Date(), timeZone)
        const monthKey = formatMonthKey(new Date(), timeZone)

        const [lifetimeSummary, todaySummary, monthSummary, lowStockCount, lastProcessedSync] = await Promise.all([
            CloudSaleModel.aggregate([
                { $match: { shopId } },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: "$grandTotal" },
                        salesCount: { $sum: 1 }
                    }
                }
            ]),
            CloudSaleModel.aggregate([
                { $match: { shopId } },
                {
                    $addFields: {
                        dayKey: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$sourceCreatedAt",
                                timezone: timeZone
                            }
                        }
                    }
                },
                { $match: { dayKey: todayKey } },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: "$grandTotal" },
                        salesCount: { $sum: 1 }
                    }
                }
            ]),
            CloudSaleModel.aggregate([
                { $match: { shopId } },
                {
                    $addFields: {
                        monthKey: {
                            $dateToString: {
                                format: "%Y-%m",
                                date: "$sourceCreatedAt",
                                timezone: timeZone
                            }
                        }
                    }
                },
                { $match: { monthKey } },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: "$grandTotal" },
                        salesCount: { $sum: 1 }
                    }
                }
            ]),
            CloudInventoryModel.countDocuments({
                shopId,
                reorderLevel: { $gt: 0 },
                $expr: { $lte: ["$onHand", "$reorderLevel"] }
            }),
            CloudSyncAuditModel.findOne({
                shopId,
                status: { $in: ["processed", "duplicate", "ignored"] }
            })
                .sort({ processedAt: -1, updatedAt: -1 })
                .select("processedAt updatedAt entityType")
                .lean()
        ])

        return {
            shop: {
                id: shop._id,
                name: shop.name,
                code: shop.shopCode,
                timezone: timeZone,
                currency: shop.currency || "INR"
            },
            lifetime: {
                revenue: lifetimeSummary[0]?.revenue || 0,
                salesCount: lifetimeSummary[0]?.salesCount || 0
            },
            today: {
                revenue: todaySummary[0]?.revenue || 0,
                salesCount: todaySummary[0]?.salesCount || 0
            },
            thisMonth: {
                revenue: monthSummary[0]?.revenue || 0,
                salesCount: monthSummary[0]?.salesCount || 0
            },
            inventory: {
                lowStockCount
            },
            lastCloudSyncAt: lastProcessedSync?.processedAt || lastProcessedSync?.updatedAt || null
        }
    }

    static async getDailyRevenue(userId, options = {}) {
        const days = clampNumber(options.days, DEFAULT_DAYS, 1, 365)
        const { shopId, timeZone } = await this.getShopContext(userId)
        const startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        startDate.setDate(startDate.getDate() - (days - 1))

        const rows = await CloudSaleModel.aggregate([
            {
                $match: {
                    shopId,
                    sourceCreatedAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$sourceCreatedAt",
                            timezone: timeZone
                        }
                    },
                    revenue: { $sum: "$grandTotal" },
                    taxTotal: { $sum: "$taxTotal" },
                    discountTotal: { $sum: "$discount" },
                    salesCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    revenue: 1,
                    taxTotal: 1,
                    discountTotal: 1,
                    salesCount: 1
                }
            }
        ])

        return {
            days,
            rows
        }
    }

    static async getMonthlyRevenue(userId, options = {}) {
        const months = clampNumber(options.months, DEFAULT_MONTHS, 1, 36)
        const { shopId, timeZone } = await this.getShopContext(userId)
        const startDate = new Date()
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
        startDate.setMonth(startDate.getMonth() - (months - 1))

        const rows = await CloudSaleModel.aggregate([
            {
                $match: {
                    shopId,
                    sourceCreatedAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m",
                            date: "$sourceCreatedAt",
                            timezone: timeZone
                        }
                    },
                    revenue: { $sum: "$grandTotal" },
                    taxTotal: { $sum: "$taxTotal" },
                    discountTotal: { $sum: "$discount" },
                    salesCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    month: "$_id",
                    revenue: 1,
                    taxTotal: 1,
                    discountTotal: 1,
                    salesCount: 1
                }
            }
        ])

        return {
            months,
            rows
        }
    }

    static async getBestSellers(userId, options = {}) {
        const days = clampNumber(options.days, DEFAULT_DAYS, 1, 365)
        const limit = clampNumber(options.limit, DEFAULT_LIMIT, 1, 100)
        const { shopId } = await this.getShopContext(userId)
        const startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        startDate.setDate(startDate.getDate() - (days - 1))

        const rows = await CloudSaleModel.aggregate([
            {
                $match: {
                    shopId,
                    sourceCreatedAt: { $gte: startDate }
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: {
                        externalProductId: "$items.externalProductId",
                        name: "$items.name"
                    },
                    totalQuantity: { $sum: "$items.quantity" },
                    totalRevenue: { $sum: "$items.lineTotal" },
                    totalTax: { $sum: "$items.gstAmount" },
                    barcode: { $first: "$items.barcode" }
                }
            },
            { $sort: { totalQuantity: -1, totalRevenue: -1 } },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    externalProductId: "$_id.externalProductId",
                    name: "$_id.name",
                    barcode: "$barcode",
                    totalQuantity: 1,
                    totalRevenue: 1,
                    totalTax: 1
                }
            }
        ])

        const productIds = rows
            .map((row) => row.externalProductId)
            .filter(Boolean)

        const [inventories, products] = await Promise.all([
            productIds.length
                ? CloudInventoryModel.find({
                    shopId,
                    externalProductId: { $in: productIds }
                })
                    .select("externalProductId onHand reorderLevel")
                    .lean()
                : [],
            productIds.length
                ? CloudProductModel.find({
                    shopId,
                    externalProductId: { $in: productIds }
                })
                    .select("externalProductId category sellingPrice")
                    .lean()
                : []
        ])

        const inventoryMap = new Map(inventories.map((item) => [item.externalProductId, item]))
        const productMap = new Map(products.map((item) => [item.externalProductId, item]))

        return {
            days,
            limit,
            rows: rows.map((row) => ({
                ...row,
                currentOnHand: inventoryMap.get(row.externalProductId)?.onHand ?? null,
                reorderLevel: inventoryMap.get(row.externalProductId)?.reorderLevel ?? null,
                category: productMap.get(row.externalProductId)?.category || "",
                currentSellingPrice: productMap.get(row.externalProductId)?.sellingPrice ?? null
            }))
        }
    }

    static async getInventoryAlerts(userId, options = {}) {
        const limit = clampNumber(options.limit, 25, 1, 200)
        const { shopId } = await this.getShopContext(userId)

        const rows = await CloudInventoryModel.aggregate([
            {
                $match: {
                    shopId,
                    reorderLevel: { $gt: 0 },
                    $expr: { $lte: ["$onHand", "$reorderLevel"] }
                }
            },
            {
                $lookup: {
                    from: "cloudproducts",
                    let: { productId: "$externalProductId", shopId: "$shopId" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$shopId", "$$shopId"] },
                                        { $eq: ["$externalProductId", "$$productId"] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                name: 1,
                                barcode: 1,
                                category: 1,
                                active: 1
                            }
                        }
                    ],
                    as: "product"
                }
            },
            {
                $addFields: {
                    product: { $arrayElemAt: ["$product", 0] }
                }
            },
            {
                $project: {
                    _id: 0,
                    externalProductId: 1,
                    name: { $ifNull: ["$product.name", "Unnamed Product"] },
                    barcode: { $ifNull: ["$product.barcode", ""] },
                    category: { $ifNull: ["$product.category", ""] },
                    active: { $ifNull: ["$product.active", true] },
                    onHand: 1,
                    reorderLevel: 1,
                    shortage: { $subtract: ["$reorderLevel", "$onHand"] },
                    lastMovementAt: 1,
                    updatedAt: 1
                }
            },
            { $sort: { onHand: 1, shortage: -1, updatedAt: -1 } },
            { $limit: limit }
        ])

        const totalCount = await CloudInventoryModel.countDocuments({
            shopId,
            reorderLevel: { $gt: 0 },
            $expr: { $lte: ["$onHand", "$reorderLevel"] }
        })

        return {
            limit,
            totalCount,
            rows
        }
    }
}

module.exports = CloudAnalyticsService
