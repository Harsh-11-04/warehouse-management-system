const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const WarehouseService = require("../services/Warehouse.service")

class WarehouseController {
    static createWarehouse = CatchAsync(async (req, res) => {
        const res_obj = await WarehouseService.createWarehouse(req?.user, req.body)
        return res.status(httpStatus.CREATED).json(res_obj)
    })

    static getAllWarehouses = CatchAsync(async (req, res) => {
        const res_obj = await WarehouseService.getAllWarehouses(req?.user, req.query?.page, req.query?.query)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getWarehouseById = CatchAsync(async (req, res) => {
        const res_obj = await WarehouseService.getWarehouseById(req?.user, req.params.id)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static updateWarehouse = CatchAsync(async (req, res) => {
        const res_obj = await WarehouseService.updateWarehouse(req?.user, req.body, req.params.id)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static deleteWarehouse = CatchAsync(async (req, res) => {
        const res_obj = await WarehouseService.deleteWarehouse(req?.user, req.params.id)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static createLocation = CatchAsync(async (req, res) => {
        const res_obj = await WarehouseService.createLocation(req?.user, req.body)
        return res.status(httpStatus.CREATED).json(res_obj)
    })

    static getLocations = CatchAsync(async (req, res) => {
        const res_obj = await WarehouseService.getLocations(req?.user, req.params.warehouseId)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static deleteLocation = CatchAsync(async (req, res) => {
        const res_obj = await WarehouseService.deleteLocation(req?.user, req.params.id)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getWarehouseStockReport = CatchAsync(async (req, res) => {
        const res_obj = await WarehouseService.getWarehouseStockReport(req?.user, req.params.warehouseId)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getAllWarehousesForSearch = CatchAsync(async (req, res) => {
        const res_obj = await WarehouseService.getAllWarehousesForSearch(req?.user)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getLocationByScan = CatchAsync(async (req, res) => {
        const res_obj = await WarehouseService.getLocationByScan(req?.user, req.params.locationId)
        return res.status(httpStatus.OK).json(res_obj)
    })
}

module.exports = WarehouseController
