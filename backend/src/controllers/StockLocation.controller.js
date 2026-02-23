const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const StockLocationService = require("../services/StockLocation.service")

class StockLocationController {
    static assignStock = CatchAsync(async (req, res) => {
        const res_obj = await StockLocationService.assignStock(req?.user, req.body)
        return res.status(httpStatus.CREATED).json(res_obj)
    })

    static transferStock = CatchAsync(async (req, res) => {
        const res_obj = await StockLocationService.transferStock(req?.user, req.body)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static pickStock = CatchAsync(async (req, res) => {
        const res_obj = await StockLocationService.pickStock(req?.user, req.body)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static receiveStock = CatchAsync(async (req, res) => {
        const res_obj = await StockLocationService.receiveStock(req?.user, req.body)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getStockByProduct = CatchAsync(async (req, res) => {
        const res_obj = await StockLocationService.getStockByProduct(req?.user, req.params.productId)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getAllStockLocations = CatchAsync(async (req, res) => {
        const res_obj = await StockLocationService.getAllStockLocations(req?.user, req.query?.page)
        return res.status(httpStatus.OK).json(res_obj)
    })
}

module.exports = StockLocationController
