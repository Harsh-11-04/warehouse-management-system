const BillingProductService = require("../services/BillingProduct.service")
const ApiError = require("../utils/ApiError")

class BillingProductController {
    static async create(req, res, next) {
        try {
            const product = await BillingProductService.create(req.user, req.body)
            res.status(201).json({ msg: "Product created", product })
        } catch (error) {
            if (error.code === 11000) {
                return next(new ApiError(400, "Product with this barcode already exists"))
            }
            next(error)
        }
    }

    static async getAll(req, res, next) {
        try {
            const { page = 1, limit = 20, query = '', lowStock } = req.query
            const result = await BillingProductService.getAll(req.user, {
                page: Number(page), limit: Number(limit), query,
                lowStock: lowStock === 'true'
            })
            res.json(result)
        } catch (error) {
            next(error)
        }
    }

    static async search(req, res, next) {
        try {
            const { query = '' } = req.query
            const products = await BillingProductService.search(req.user, query)
            res.json({ products })
        } catch (error) {
            next(error)
        }
    }

    static async getByBarcode(req, res, next) {
        try {
            const product = await BillingProductService.getByBarcode(req.user, req.params.barcode)
            if (!product) throw new ApiError(404, "Product not found")
            res.json({ product })
        } catch (error) {
            next(error)
        }
    }

    static async getById(req, res, next) {
        try {
            const product = await BillingProductService.getById(req.user, req.params.id)
            if (!product) throw new ApiError(404, "Product not found")
            res.json({ product })
        } catch (error) {
            next(error)
        }
    }

    static async update(req, res, next) {
        try {
            const product = await BillingProductService.update(req.user, req.params.id, req.body)
            if (!product) throw new ApiError(404, "Product not found")
            res.json({ msg: "Product updated", product })
        } catch (error) {
            next(error)
        }
    }

    static async updateStock(req, res, next) {
        try {
            const { stock } = req.body
            if (stock === undefined || stock < 0) throw new ApiError(400, "Valid stock value required")
            const product = await BillingProductService.updateStock(req.user, req.params.id, stock)
            if (!product) throw new ApiError(404, "Product not found")
            res.json({ msg: "Stock updated", product })
        } catch (error) {
            next(error)
        }
    }

    static async delete(req, res, next) {
        try {
            const product = await BillingProductService.delete(req.user, req.params.id)
            if (!product) throw new ApiError(404, "Product not found")
            res.json({ msg: "Product deactivated", product })
        } catch (error) {
            next(error)
        }
    }

    static async getStockStats(req, res, next) {
        try {
            const stats = await BillingProductService.getStockStats(req.user)
            res.json(stats)
        } catch (error) {
            next(error)
        }
    }
}

module.exports = BillingProductController
