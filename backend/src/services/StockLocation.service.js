const httpStatus = require("http-status")
const { StockLocationModel, ProductModel, StorageLocationModel } = require("../models")
const ApiError = require("../utils/ApiError")
const ProductService = require("./Product.service")
const StockHistoryService = require("./StockHistory.service")
const mongoose = require("mongoose")

class StockLocationService {

    static async assignStock(user, body) {
        const { productId, locationId, quantity } = body
        const assignQty = Number(quantity)

        if (assignQty <= 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Quantity must be greater than 0")
        }

        const product = await ProductModel.findOne({ _id: productId, user })
        if (!product) {
            throw new ApiError(httpStatus.NOT_FOUND, "Product Not Found")
        }

        const location = await StorageLocationModel.findOne({ _id: locationId, user })
        if (!location) {
            throw new ApiError(httpStatus.NOT_FOUND, "Storage Location Not Found")
        }

        const existing = await StockLocationModel.findOne({ product: productId, location: locationId })
        if (existing) {
            existing.quantity += assignQty
            await existing.save()
        } else {
            await StockLocationModel.create({
                product: productId,
                location: locationId,
                quantity: assignQty,
                user
            })
        }

        await ProductService.syncTotalQuantity(new mongoose.Types.ObjectId(productId))

        await StockHistoryService.log({
            productId,
            toLocationId: locationId,
            quantity: assignQty,
            action: 'Assign',
            userId: user,
            reference: `Assigned ${assignQty} units`
        })

        return { msg: "Stock Assigned Successfully" }
    }

    static async transferStock(user, body) {
        const { fromLocationId, toLocationId, productId, quantity } = body
        const transferQty = Number(quantity)

        if (transferQty <= 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Quantity must be greater than 0")
        }

        if (fromLocationId === toLocationId) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Source and destination locations must be different")
        }

        const [toLocation, fromStock] = await Promise.all([
            StorageLocationModel.findOne({ _id: toLocationId, user }),
            StockLocationModel.findOne({
                product: productId,
                location: fromLocationId,
                user
            })
        ])

        if (!toLocation) {
            throw new ApiError(httpStatus.NOT_FOUND, "Destination location not found or access denied")
        }

        if (!fromStock) {
            throw new ApiError(httpStatus.NOT_FOUND, "No stock found at source location")
        }

        if (fromStock.quantity < transferQty) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient stock. Available: ${fromStock.quantity}`)
        }

        fromStock.quantity -= transferQty
        await fromStock.save()

        if (fromStock.quantity === 0) {
            await StockLocationModel.findByIdAndDelete(fromStock._id)
        }

        const toStock = await StockLocationModel.findOne({
            product: productId,
            location: toLocationId,
            user
        })

        if (toStock) {
            toStock.quantity += transferQty
            await toStock.save()
        } else {
            await StockLocationModel.create({
                product: productId,
                location: toLocationId,
                quantity: transferQty,
                user
            })
        }

        await ProductService.syncTotalQuantity(new mongoose.Types.ObjectId(productId))

        await StockHistoryService.log({
            productId,
            fromLocationId,
            toLocationId,
            quantity: transferQty,
            action: 'Transfer',
            userId: user,
            reference: `Transferred ${transferQty} units`
        })

        return { msg: "Stock Transferred Successfully" }
    }

    static async pickStock(user, body) {
        const { productId, locationId, quantity } = body
        const pickQty = Number(quantity)

        if (pickQty <= 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Quantity must be greater than 0")
        }

        const stock = await StockLocationModel.findOne({
            product: productId,
            location: locationId,
            user
        })

        if (!stock) {
            throw new ApiError(httpStatus.NOT_FOUND, "No stock found at this location")
        }

        if (stock.quantity < pickQty) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient stock. Available: ${stock.quantity}`)
        }

        stock.quantity -= pickQty
        await stock.save()

        if (stock.quantity === 0) {
            await StockLocationModel.findByIdAndDelete(stock._id)
        }

        await ProductService.syncTotalQuantity(new mongoose.Types.ObjectId(productId))

        await StockHistoryService.log({
            productId,
            fromLocationId: locationId,
            quantity: pickQty,
            action: 'Pick',
            userId: user,
            reference: `Picked ${pickQty} items`
        })

        return { msg: `Picked ${pickQty} items successfully` }
    }

    static async receiveStock(user, body) {
        const { productId, locationId, quantity } = body
        const receiveQty = Number(quantity)

        if (receiveQty <= 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Quantity must be greater than 0")
        }

        const [product, location] = await Promise.all([
            ProductModel.findOne({ _id: productId, user }),
            StorageLocationModel.findOne({ _id: locationId, user })
        ])

        if (!product) {
            throw new ApiError(httpStatus.NOT_FOUND, "Product Not Found")
        }

        if (!location) {
            throw new ApiError(httpStatus.NOT_FOUND, "Storage Location Not Found")
        }

        const existing = await StockLocationModel.findOne({ product: productId, location: locationId })
        if (existing) {
            existing.quantity += receiveQty
            await existing.save()
        } else {
            await StockLocationModel.create({
                product: productId,
                location: locationId,
                quantity: receiveQty,
                user
            })
        }

        await ProductService.syncTotalQuantity(new mongoose.Types.ObjectId(productId))

        await StockHistoryService.log({
            productId,
            toLocationId: locationId,
            quantity: receiveQty,
            action: 'Receive',
            userId: user,
            reference: `Received ${receiveQty} units`
        })

        return { msg: `Received ${receiveQty} items successfully` }
    }

    static async getStockByProduct(user, productId) {
        const product = await ProductModel.findOne({ _id: productId, user })
        if (!product) {
            throw new ApiError(httpStatus.NOT_FOUND, "Product Not Found")
        }

        const stocks = await StockLocationModel.find({ product: productId, user })
            .populate({
                path: 'location',
                select: 'rack bin warehouse',
                populate: {
                    path: 'warehouse',
                    select: 'name'
                }
            })
            .select("quantity location")

        return {
            product: {
                _id: product._id,
                name: product.name,
                sku: product.sku,
                totalQuantity: product.totalQuantity
            },
            stocks
        }
    }

    static async getAllStockLocations(user, page = 1) {
        const limit = 20
        const skip = (Number(page) - 1) * limit

        const data = await StockLocationModel.find({ user })
            .populate("product", "name sku")
            .populate({
                path: 'location',
                select: 'rack bin warehouse',
                populate: { path: 'warehouse', select: 'name' }
            })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean()

        const total = await StockLocationModel.countDocuments({ user })
        const hasMore = skip + limit < total

        return { stocks: data, more: hasMore }
    }
}

module.exports = StockLocationService
