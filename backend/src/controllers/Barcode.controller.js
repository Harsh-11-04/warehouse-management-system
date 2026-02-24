const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const { StockLocationModel, StorageLocationModel, ProductModel } = require("../models")
const ApiError = require("../utils/ApiError")

class BarcodeController {
    static getLocationByQR = CatchAsync(async (req, res) => {
        const { qrData } = req.body

        if (!qrData) {
            throw new ApiError(httpStatus.BAD_REQUEST, "QR data is required")
        }

        const location = await StorageLocationModel.findOne({ 
            user: req.user,
            $or: [
                { qrCode: qrData },
                { rack: qrData },
                { bin: qrData }
            ]
        })
            .populate('warehouse', 'name')
            .lean()

        if (!location) {
            throw new ApiError(httpStatus.NOT_FOUND, "Location not found")
        }

        const stocks = await StockLocationModel.find({ 
            location: location._id,
            user: req.user 
        })
            .populate('product', 'name sku totalQuantity')
            .lean()

        return res.status(httpStatus.OK).json({
            location,
            stocks
        })
    })

    static getProductByBarcode = CatchAsync(async (req, res) => {
        const { barcode } = req.body

        if (!barcode) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Barcode is required")
        }

        const product = await ProductModel.findOne({ 
            user: req.user,
            $or: [
                { sku: barcode },
                { barcode: barcode }
            ]
        })
            .lean()

        if (!product) {
            throw new ApiError(httpStatus.NOT_FOUND, "Product not found")
        }

        const stocks = await StockLocationModel.find({ 
            product: product._id,
            user: req.user 
        })
            .populate({
                path: 'location',
                select: 'rack bin warehouse',
                populate: {
                    path: 'warehouse',
                    select: 'name'
                }
            })
            .lean()

        return res.status(httpStatus.OK).json({
            product,
            stocks
        })
    })

    static generateLocationQR = CatchAsync(async (req, res) => {
        const { locationId } = req.params

        const location = await StorageLocationModel.findOne({ 
            _id: locationId,
            user: req.user 
        })
            .populate('warehouse', 'name')
            .lean()

        if (!location) {
            throw new ApiError(httpStatus.NOT_FOUND, "Location not found")
        }

        const qrData = `${location.warehouse.name}-${location.rack}-${location.bin}`

        await StorageLocationModel.findByIdAndUpdate(locationId, { qrCode: qrData })

        return res.status(httpStatus.OK).json({
            qrData,
            location
        })
    })

    static generateProductBarcode = CatchAsync(async (req, res) => {
        const { productId } = req.params

        const product = await ProductModel.findOne({ 
            _id: productId,
            user: req.user 
        })
            .lean()

        if (!product) {
            throw new ApiError(httpStatus.NOT_FOUND, "Product not found")
        }

        const barcodeData = product.sku

        await ProductModel.findByIdAndUpdate(productId, { barcode: barcodeData })

        return res.status(httpStatus.OK).json({
            barcode: barcodeData,
            product
        })
    })
}

module.exports = BarcodeController
