const httpStatus = require("http-status")
const { WarehouseModel, StorageLocationModel, StockLocationModel, ProductModel } = require("../models")
const ApiError = require("../utils/ApiError")

class WarehouseService {

    static async createWarehouse(user, body) {
        const { name, address } = body

        const checkExist = await WarehouseModel.findOne({ name, user })
        if (checkExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Warehouse with this name already exists")
        }

        await WarehouseModel.create({ name, address, user })

        return { msg: "Warehouse Created Successfully" }
    }

    static async getAllWarehouses(user, page = 1, query = '') {
        const limit = 10
        const skip = (Number(page) - 1) * limit

        const queries = {
            user,
            $or: [
                { name: new RegExp(query, 'i') },
                { address: new RegExp(query, 'i') }
            ]
        }

        const data = await WarehouseModel.find(queries)
            .select("name address isActive")
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })

        const total = await WarehouseModel.countDocuments(queries)
        const hasMore = skip + limit < total

        return { warehouses: data, more: hasMore }
    }

    static async getWarehouseById(user, id) {
        const warehouse = await WarehouseModel.findOne({ _id: id, user })
        if (!warehouse) {
            throw new ApiError(httpStatus.NOT_FOUND, "Warehouse Not Found")
        }
        return { warehouse }
    }

    static async updateWarehouse(user, body, id) {
        const { name, address } = body

        const warehouse = await WarehouseModel.findOne({ _id: id, user })
        if (!warehouse) {
            throw new ApiError(httpStatus.NOT_FOUND, "Warehouse Not Found")
        }

        await WarehouseModel.findByIdAndUpdate(id, { name, address })

        return { msg: "Warehouse Updated Successfully" }
    }

    static async deleteWarehouse(user, id) {
        const warehouse = await WarehouseModel.findOneAndDelete({ _id: id, user })
        if (!warehouse) {
            throw new ApiError(httpStatus.NOT_FOUND, "Warehouse Not Found")
        }

        const locations = await StorageLocationModel.find({ warehouse: id })
        const locationIds = locations.map(l => l._id)

        await StockLocationModel.deleteMany({ location: { $in: locationIds } })
        await StorageLocationModel.deleteMany({ warehouse: id })

        return { msg: "Warehouse Deleted Successfully" }
    }

    static async createLocation(user, body) {
        const { warehouseId, rack, bin } = body

        const warehouse = await WarehouseModel.findOne({ _id: warehouseId, user })
        if (!warehouse) {
            throw new ApiError(httpStatus.NOT_FOUND, "Warehouse Not Found")
        }

        const checkExist = await StorageLocationModel.findOne({ warehouse: warehouseId, rack, bin })
        if (checkExist) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Location (rack/bin) already exists in this warehouse")
        }

        await StorageLocationModel.create({ warehouse: warehouseId, rack, bin, user })

        return { msg: "Storage Location Created Successfully" }
    }

    static async getLocations(user, warehouseId) {
        const warehouse = await WarehouseModel.findOne({ _id: warehouseId, user })
        if (!warehouse) {
            throw new ApiError(httpStatus.NOT_FOUND, "Warehouse Not Found")
        }

        const locations = await StorageLocationModel.find({ warehouse: warehouseId })
            .select("rack bin isActive")
            .sort({ rack: 1, bin: 1 })

        return { locations, warehouse: warehouse.name }
    }

    static async deleteLocation(user, id) {
        const location = await StorageLocationModel.findOneAndDelete({ _id: id, user })
        if (!location) {
            throw new ApiError(httpStatus.NOT_FOUND, "Storage Location Not Found")
        }

        await StockLocationModel.deleteMany({ location: id })

        return { msg: "Storage Location Deleted Successfully" }
    }

    static async getWarehouseStockReport(user, warehouseId) {
        const warehouse = await WarehouseModel.findOne({ _id: warehouseId, user })
        if (!warehouse) {
            throw new ApiError(httpStatus.NOT_FOUND, "Warehouse Not Found")
        }

        const locationIds = await StorageLocationModel.find({ warehouse: warehouseId }).select("_id")
        const ids = locationIds.map(l => l._id)

        const report = await StockLocationModel.aggregate([
            { $match: { location: { $in: ids } } },
            {
                $lookup: {
                    from: "products",
                    localField: "product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $lookup: {
                    from: "storagelocations",
                    localField: "location",
                    foreignField: "_id",
                    as: "locationInfo"
                }
            },
            { $unwind: "$locationInfo" },
            {
                $project: {
                    productName: "$productInfo.name",
                    productSku: "$productInfo.sku",
                    rack: "$locationInfo.rack",
                    bin: "$locationInfo.bin",
                    quantity: 1
                }
            },
            { $sort: { productName: 1, rack: 1, bin: 1 } }
        ])

        return { report, warehouseName: warehouse.name }
    }

    static async getAllWarehousesForSearch(user) {
        const data = await WarehouseModel.find({ user, isActive: true }).select("name")
        return { warehouses: data }
    }

    static async getLocationByScan(user, locationId) {
        const location = await StorageLocationModel.findOne({ _id: locationId, user })
            .populate('warehouse', 'name')
        if (!location) {
            throw new ApiError(httpStatus.NOT_FOUND, "Location Not Found")
        }

        const stocks = await StockLocationModel.find({ location: locationId, user })
            .populate('product', 'name sku price')

        return { location, stocks }
    }
}

module.exports = WarehouseService
