const CatchAsync = require("../utils/CatchAsync")
const ReportService = require("../services/Report.service")
const ApiError = require("../utils/ApiError")

class ReportController {

    static GetInventoryValuation = CatchAsync(async (req, res) => {
        const result = await ReportService.getInventoryValuation(req.user)
        res.status(200).json(result)
    })

    static GetLowStockProducts = CatchAsync(async (req, res) => {
        const result = await ReportService.getLowStockProducts(req.user)
        res.status(200).json(result)
    })

    static GetShipmentSummary = CatchAsync(async (req, res) => {
        const days = parseInt(req.query.days) || 30
        const result = await ReportService.getShipmentSummary(req.user, days)
        res.status(200).json(result)
    })

    static GetDashboardStats = CatchAsync(async (req, res) => {
        const result = await ReportService.getDashboardStats(req.user)
        res.status(200).json(result)
    })
}

module.exports = ReportController
