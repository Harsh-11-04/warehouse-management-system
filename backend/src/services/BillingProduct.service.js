const BillingProduct = require("../models/BillingProduct.models")
const ActivityLogService = require("./ActivityLog.service")
const SyncService = require("./Sync.service")
const ShopUtils = require("../utils/ShopUtils")
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const normalizePagination = (page = 1, limit = 20, maxLimit = 100) => {
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1)
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), maxLimit)
    return { page: safePage, limit: safeLimit }
}

class BillingProductService {
    static async create(userId, data) {
        const product = await BillingProduct.create({ ...data, user: userId })
        await ActivityLogService.log(userId, 'CREATE', 'BillingProduct', product._id, `Created product: ${product.name}`)

        await SyncService.enqueue(userId, {
            entityType: 'product',
            entityId: product._id,
            operation: 'create',
            sourceModule: 'billing',
            payload: {
                productId: product._id,
                name: product.name,
                barcode: product.barcode || '',
                category: product.category || '',
                purchasePrice: product.purchasePrice || 0,
                mrp: product.mrp || 0,
                sellingPrice: product.sellingPrice || 0,
                cardPrice: product.cardPrice || 0,
                gstPercent: product.gstPercent || 0,
                stock: product.stock || 0,
                lowStockThreshold: product.lowStockThreshold || 0,
                isActive: product.isActive !== false,
                updatedAt: product.updatedAt || new Date()
            },
            metadata: { localOnly: true, syncVersion: 1 }
        })

        return product
    }

    static async getAll(userId, { page = 1, limit = 20, query = '', lowStock = false }) {
        const pagination = normalizePagination(page, limit)
        const userIds = await ShopUtils.getShopUserIds(userId)
        const filter = { user: { $in: userIds }, isActive: true }
        const escapedQuery = query ? escapeRegex(query.trim()) : ''
        if (escapedQuery) {
            filter.$or = [
                { name: { $regex: escapedQuery, $options: 'i' } },
                { barcode: { $regex: escapedQuery, $options: 'i' } },
                { category: { $regex: escapedQuery, $options: 'i' } }
            ]
        }
        if (lowStock) {
            filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] }
        }
        const skip = (pagination.page - 1) * pagination.limit
        const [products, total] = await Promise.all([
            BillingProduct.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pagination.limit),
            BillingProduct.countDocuments(filter)
        ])
        return { products, total, page: pagination.page, totalPages: Math.ceil(total / pagination.limit) || 1 }
    }

    static async getById(userId, id) {
        const userIds = await ShopUtils.getShopUserIds(userId)
        return BillingProduct.findOne({ _id: id, user: { $in: userIds } })
    }

    static async getByBarcode(userId, barcode) {
        const userIds = await ShopUtils.getShopUserIds(userId)
        return BillingProduct.findOne({ barcode, user: { $in: userIds }, isActive: true })
    }

    static async search(userId, query) {
        const userIds = await ShopUtils.getShopUserIds(userId)
        const filter = { user: { $in: userIds }, isActive: true }
        const escapedQuery = query ? escapeRegex(query.trim()) : ''
        if (escapedQuery) {
            filter.$or = [
                { name: { $regex: escapedQuery, $options: 'i' } },
                { barcode: { $regex: escapedQuery, $options: 'i' } }
            ]
        }
        return BillingProduct.find(filter).limit(10).select('name barcode mrp sellingPrice cardPrice gstPercent stock')
    }

    static async update(userId, id, data) {
        const userIds = await ShopUtils.getShopUserIds(userId)
        const product = await BillingProduct.findOneAndUpdate(
            { _id: id, user: { $in: userIds } },
            { $set: data },
            { new: true, runValidators: true }
        )
        if (product) {
            await ActivityLogService.log(userId, 'UPDATE', 'BillingProduct', id, `Updated product details: ${product.name}`)

            await SyncService.enqueue(userId, {
                entityType: 'product',
                entityId: product._id,
                operation: 'update',
                sourceModule: 'billing',
                payload: {
                    productId: product._id,
                    name: product.name,
                    barcode: product.barcode || '',
                    category: product.category || '',
                    purchasePrice: product.purchasePrice || 0,
                    mrp: product.mrp || 0,
                    sellingPrice: product.sellingPrice || 0,
                    cardPrice: product.cardPrice || 0,
                    gstPercent: product.gstPercent || 0,
                    stock: product.stock || 0,
                    lowStockThreshold: product.lowStockThreshold || 0,
                    isActive: product.isActive !== false,
                    updatedAt: product.updatedAt || new Date()
                },
                metadata: { localOnly: true, syncVersion: 1 }
            })
        }
        return product
    }

    static async updateStock(userId, id, stock) {
        const userIds = await ShopUtils.getShopUserIds(userId)
        const previousProduct = await BillingProduct.findOne({ _id: id, user: { $in: userIds } }).select('stock name')
        const previousStock = previousProduct ? previousProduct.stock : 0

        const product = await BillingProduct.findOneAndUpdate(
            { _id: id, user: { $in: userIds } },
            { $set: { stock } },
            { new: true }
        )
        if (product) {
            await ActivityLogService.log(userId, 'UPDATE_STOCK', 'BillingProduct', id, `Manually updated stock to ${stock} for: ${product.name}`)

            const quantityDelta = stock - previousStock
            await SyncService.enqueue(userId, {
                entityType: 'inventory_movement',
                entityId: product._id,
                operation: 'adjust',
                sourceModule: 'billing',
                payload: {
                    productId: product._id.toString(),
                    productName: product.name,
                    quantityDelta,
                    previousStock,
                    newStock: stock,
                    movementType: 'adjustment',
                    refType: 'ManualStockUpdate',
                    refId: product._id.toString(),
                    createdAt: new Date()
                },
                metadata: { localOnly: true, syncVersion: 1 }
            })
        }
        return product
    }

    static async delete(userId, id) {
        const userIds = await ShopUtils.getShopUserIds(userId)
        const product = await BillingProduct.findOneAndUpdate(
            { _id: id, user: { $in: userIds } },
            { $set: { isActive: false } },
            { new: true }
        )
        if (product) {
            await ActivityLogService.log(userId, 'DELETE', 'BillingProduct', id, `Soft deleted product: ${product.name}`)

            await SyncService.enqueue(userId, {
                entityType: 'product',
                entityId: product._id,
                operation: 'delete',
                sourceModule: 'billing',
                payload: {
                    productId: product._id,
                    name: product.name,
                    isActive: false,
                    updatedAt: product.updatedAt || new Date()
                },
                metadata: { localOnly: true, syncVersion: 1 }
            })
        }
        return product
    }

    static async getStockStats(userId) {
        const userIds = await ShopUtils.getShopUserIds(userId)
        const [totalResult, lowResult, outResult] = await Promise.all([
            BillingProduct.countDocuments({ user: { $in: userIds }, isActive: true }),
            BillingProduct.countDocuments({
                user: { $in: userIds },
                isActive: true,
                $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] }
            }),
            BillingProduct.countDocuments({ user: { $in: userIds }, isActive: true, stock: 0 })
        ])
        return { total: totalResult, lowStock: lowResult, outOfStock: outResult }
    }
}

module.exports = BillingProductService
