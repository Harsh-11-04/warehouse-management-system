const BillingProduct = require("../models/BillingProduct.models")
const ActivityLogService = require("./ActivityLog.service")
const SyncService = require("./Sync.service")

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
        const filter = { user: userId, isActive: true }
        if (query) {
            filter.$or = [
                { name: { $regex: query, $options: 'i' } },
                { barcode: { $regex: query, $options: 'i' } },
                { category: { $regex: query, $options: 'i' } }
            ]
        }
        if (lowStock) {
            filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] }
        }
        const skip = (page - 1) * limit
        const [products, total] = await Promise.all([
            BillingProduct.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            BillingProduct.countDocuments(filter)
        ])
        return { products, total, page, totalPages: Math.ceil(total / limit) }
    }

    static async getById(userId, id) {
        return BillingProduct.findOne({ _id: id, user: userId })
    }

    static async getByBarcode(userId, barcode) {
        return BillingProduct.findOne({ barcode, user: userId, isActive: true })
    }

    static async search(userId, query) {
        const filter = { user: userId, isActive: true }
        if (query) {
            filter.$or = [
                { name: { $regex: query, $options: 'i' } },
                { barcode: { $regex: query, $options: 'i' } }
            ]
        }
        return BillingProduct.find(filter).limit(10).select('name barcode mrp sellingPrice cardPrice gstPercent stock')
    }

    static async update(userId, id, data) {
        const product = await BillingProduct.findOneAndUpdate(
            { _id: id, user: userId },
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
        const previousProduct = await BillingProduct.findOne({ _id: id, user: userId }).select('stock name')
        const previousStock = previousProduct ? previousProduct.stock : 0

        const product = await BillingProduct.findOneAndUpdate(
            { _id: id, user: userId },
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
        const product = await BillingProduct.findOneAndUpdate(
            { _id: id, user: userId },
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
        const [totalResult, lowResult, outResult] = await Promise.all([
            BillingProduct.countDocuments({ user: userId, isActive: true }),
            BillingProduct.countDocuments({
                user: userId,
                isActive: true,
                $expr: { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] }
            }),
            BillingProduct.countDocuments({ user: userId, isActive: true, stock: 0 })
        ])
        return { total: totalResult, lowStock: lowResult, outOfStock: outResult }
    }
}

module.exports = BillingProductService
