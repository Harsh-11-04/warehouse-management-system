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

    static GetWarehouseWiseStock = CatchAsync(async (req, res) => {
        const result = await ReportService.getWarehouseWiseStock(req.user)
        res.status(200).json(result)
    })

    static GetMonthlyInventorySummary = CatchAsync(async (req, res) => {
        const months = parseInt(req.query.months) || 6
        const result = await ReportService.getMonthlyInventorySummary(req.user, months)
        res.status(200).json(result)
    })

    static GetProductMovementHistory = CatchAsync(async (req, res) => {
        const { productId } = req.params
        const days = parseInt(req.query.days) || 30
        const result = await ReportService.getProductMovementHistory(req.user, productId, days)
        res.status(200).json(result)
    })

    static ExportWarehouseStockCSV = CatchAsync(async (req, res) => {
        const { warehouseId } = req.query
        const csvData = await ReportService.getWarehouseStockReportCSV(req.user, warehouseId)
        
        res.setHeader('Content-Type', csvData.mimeType)
        res.setHeader('Content-Disposition', `attachment; filename="${csvData.filename}"`)
        res.send(csvData.data)
    })

    static ExportLowStockCSV = CatchAsync(async (req, res) => {
        const csvData = await ReportService.getLowStockReportCSV(req.user)
        
        res.setHeader('Content-Type', csvData.mimeType)
        res.setHeader('Content-Disposition', `attachment; filename="${csvData.filename}"`)
        res.send(csvData.data)
    })

    static ExportProductMovementCSV = CatchAsync(async (req, res) => {
        const { productId } = req.query
        const days = parseInt(req.query.days) || 30
        const csvData = await ReportService.getProductMovementCSV(req.user, productId, days)
        
        res.setHeader('Content-Type', csvData.mimeType)
        res.setHeader('Content-Disposition', `attachment; filename="${csvData.filename}"`)
        res.send(csvData.data)
    })
}

module.exports = ReportController
