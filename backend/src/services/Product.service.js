const httpStatus = require("http-status")
const { ProductModel, StockLocationModel } = require("../models")
const ApiError = require("../utils/ApiError")
const ActivityLogService = require("./ActivityLog.service")
const ReorderSuggestionService = require("./ReorderSuggestion.service")

class ProductService {

    static async syncTotalQuantity(productId, session = null) {
        const result = await StockLocationModel.aggregate([
            { $match: { product: productId } },
            { $group: { _id: "$product", total: { $sum: "$quantity" } } }
        ], { session })
        const totalQuantity = result.length > 0 ? result[0].total : 0
        const product = await ProductModel.findByIdAndUpdate(productId, { totalQuantity }, { new: true, session })

        if (product) {
            await this.processReorderCheck(product, session)
        }

        return totalQuantity
    }

    /**
     * Centralized reorder check logic.
     * Either creates a suggestion (if below threshold) or resolves existing ones (if above).
     */
    static async processReorderCheck(product, session = null) {
        if (!product) return;

        if (product.totalQuantity <= product.reorderThreshold) {
            await ReorderSuggestionService.createSuggestion(product.user, product._id, session)
        } else {
            // Automatically resolve pending suggestions if stock is now sufficient
            await ReorderSuggestionService.resolveAllPendingForProduct(product._id, session)
        }
    }

    static async createProduct(user, body) {
        const { name, sku, category, price, reorderThreshold } = body

        const checkExist = await ProductModel.findOne({ sku, user })
        if (checkExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Product with this SKU already exists")
        }

        const product = await ProductModel.create({ name, sku, category, price, reorderThreshold: reorderThreshold || 10, user })

        await ActivityLogService.log(user, 'Created Product', 'Product', product._id, `Product "${name}" (SKU: ${sku}) created`)

        return { msg: "Product Created Successfully" }
    }

    static async getAllProducts(user, page = 1, query = '', lowStock = false) {
        const limit = 10
        const skip = (Number(page) - 1) * limit

        const queries = {
            user,
            status: 'Active',
            $or: [
                { name: new RegExp(query, 'i') },
                { sku: new RegExp(query, 'i') },
                { category: new RegExp(query, 'i') }
            ]
        }

        // Low-stock filter: show products where totalQuantity <= reorderThreshold
        if (lowStock) {
            queries.$expr = { $lte: ['$totalQuantity', '$reorderThreshold'] }
        }

        const data = await ProductModel.find(queries)
            .select("name sku category price totalQuantity reorderThreshold status")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean()

        const totalProducts = await ProductModel.countDocuments(queries)
        const hasMore = skip + limit < totalProducts

        return { products: data, more: hasMore, total: totalProducts }
    }

    static async getProductById(user, id) {
        const product = await ProductModel.findOne({ _id: id, user })
        if (!product) {
            throw new ApiError(httpStatus.NOT_FOUND, "Product Not Found")
        }
        return { product }
    }

    static async updateProduct(user, body, id) {
        const { name, sku, category, price, reorderThreshold } = body

        let product = await ProductModel.findOne({ _id: id, user })
        if (!product) {
            throw new ApiError(httpStatus.NOT_FOUND, "Product Not Found")
        }

        if (sku && sku !== product.sku) {
            const existSku = await ProductModel.findOne({ sku, user })
            if (existSku) {
                throw new ApiError(httpStatus.BAD_REQUEST, "Another product already has this SKU")
            }
        }

        product = await ProductModel.findByIdAndUpdate(id, { name, sku, category, price, reorderThreshold }, { new: true })
        if (product) {
            await this.processReorderCheck(product)
        }

        return { msg: "Product Updated Successfully" }
    }

    static async deleteProduct(user, id) {
        const product = await ProductModel.findOne({ _id: id, user })
        if (!product) {
            throw new ApiError(httpStatus.NOT_FOUND, "Product Not Found")
        }

        // Soft-delete: set status to 'Inactive' to preserve audit trails
        await ProductModel.findByIdAndUpdate(id, { status: 'Inactive' })

        // Resolve suggestions for inactive products
        await ReorderSuggestionService.resolveAllPendingForProduct(id)

        await ActivityLogService.log(user, 'Deactivated Product', 'Product', id, `Product "${product.name}" deactivated`)

        return { msg: "Product Deactivated Successfully" }
    }

    static async getProductsForSearch(user) {
        const data = await ProductModel.find({ user }).select("name sku").lean()
        return { products: data }
    }
}

module.exports = ProductService
