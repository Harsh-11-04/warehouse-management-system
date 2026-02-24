const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const DashboardService = require("../services/Dashboard.service")

class DashboardController {
    static getDashboardKPIs = CatchAsync(async (req, res) => {
        const res_obj = await DashboardService.getDashboardKPIs(req?.user)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getInventoryValue = CatchAsync(async (req, res) => {
        const res_obj = await DashboardService.getInventoryValue(req?.user)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getLowStockAlerts = CatchAsync(async (req, res) => {
        const res_obj = await DashboardService.getLowStockAlerts(req?.user)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getDailyMovements = CatchAsync(async (req, res) => {
        const res_obj = await DashboardService.getDailyMovements(req?.user)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getWarehouseUtilization = CatchAsync(async (req, res) => {
        const res_obj = await DashboardService.getWarehouseUtilization(req?.user)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getFastSlowMovingProducts = CatchAsync(async (req, res) => {
        const res_obj = await DashboardService.getFastSlowMovingProducts(req?.user)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getMonthlyInventorySummary = CatchAsync(async (req, res) => {
        const res_obj = await DashboardService.getMonthlyInventorySummary(req?.user)
        return res.status(httpStatus.OK).json(res_obj)
    })
}

module.exports = DashboardController
