const CloudSyncService = require("./CloudSync.service")
const {
    CloudProductModel,
    CloudInventoryModel
} = require("../models")

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

const normalizeDate = (value) => {
    if (!value) {
        return null
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

const normalizeLimit = (value) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_LIMIT
    }

    return Math.min(parsed, MAX_LIMIT)
}

class CloudCatalogService {
    static async getChanges(userId, { cursor = "", limit } = {}) {
        const { shop, shopId } = await CloudSyncService.getShopContext(userId)
        const sinceDate = normalizeDate(cursor)
        const pageLimit = normalizeLimit(limit)

        const productFilter = { shopId }
        const inventoryFilter = { shopId }

        if (sinceDate) {
            productFilter.updatedAt = { $gt: sinceDate }
            inventoryFilter.updatedAt = { $gt: sinceDate }
        }

        const [productChanges, inventoryChanges] = await Promise.all([
            CloudProductModel.find(productFilter)
                .sort({ updatedAt: 1 })
                .limit(pageLimit * 2)
                .lean(),
            CloudInventoryModel.find(inventoryFilter)
                .sort({ updatedAt: 1 })
                .limit(pageLimit * 2)
                .lean()
        ])

        const productIds = new Set()
        productChanges.forEach((product) => productIds.add(product.externalProductId))
        inventoryChanges.forEach((inventory) => productIds.add(inventory.externalProductId))

        if (!productIds.size) {
            return {
                shop: {
                    id: shop._id,
                    name: shop.name,
                    code: shop.shopCode
                },
                cursor: cursor || "",
                hasMore: false,
                products: []
            }
        }

        const [allProducts, allInventories] = await Promise.all([
            CloudProductModel.find({
                shopId,
                externalProductId: { $in: [...productIds] }
            }).lean(),
            CloudInventoryModel.find({
                shopId,
                externalProductId: { $in: [...productIds] }
            }).lean()
        ])

        const productMap = new Map(allProducts.map((product) => [product.externalProductId, product]))
        const inventoryMap = new Map(allInventories.map((inventory) => [inventory.externalProductId, inventory]))

        const combined = [...productIds].map((externalProductId) => {
            const product = productMap.get(externalProductId) || null
            const inventory = inventoryMap.get(externalProductId) || null
            const changedAt = new Date(
                Math.max(
                    product?.updatedAt ? new Date(product.updatedAt).getTime() : 0,
                    inventory?.updatedAt ? new Date(inventory.updatedAt).getTime() : 0
                )
            )

            return {
                externalProductId,
                barcode: product?.barcode || "",
                name: product?.name || "Unnamed Product",
                category: product?.category || "",
                purchasePrice: product?.purchasePrice || 0,
                mrp: product?.mrp || 0,
                sellingPrice: product?.sellingPrice || 0,
                cardPrice: product?.cardPrice || 0,
                gstPercent: product?.gstPercent || 0,
                active: product?.active !== false,
                cloudVersion: product?.cloudVersion || 1,
                stock: inventory?.onHand || 0,
                reorderLevel: inventory?.reorderLevel || 0,
                changedAt,
                sourceUpdatedAt: product?.sourceUpdatedAt || inventory?.sourceUpdatedAt || changedAt
            }
        })
            .sort((left, right) => left.changedAt.getTime() - right.changedAt.getTime())

        const sliced = combined.slice(0, pageLimit)
        const nextCursor = sliced.length
            ? sliced[sliced.length - 1].changedAt.toISOString()
            : (cursor || "")

        return {
            shop: {
                id: shop._id,
                name: shop.name,
                code: shop.shopCode
            },
            cursor: nextCursor,
            hasMore: combined.length > pageLimit,
            products: sliced.map((item) => ({
                externalProductId: item.externalProductId,
                barcode: item.barcode,
                name: item.name,
                category: item.category,
                purchasePrice: item.purchasePrice,
                mrp: item.mrp,
                sellingPrice: item.sellingPrice,
                cardPrice: item.cardPrice,
                gstPercent: item.gstPercent,
                active: item.active,
                cloudVersion: item.cloudVersion,
                stock: item.stock,
                reorderLevel: item.reorderLevel,
                sourceUpdatedAt: item.sourceUpdatedAt,
                changedAt: item.changedAt
            }))
        }
    }
}

module.exports = CloudCatalogService
