const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const ReportController = require("../controllers/Report.controller")
const router = express.Router()

router.use(Authentication)

// All admin/manager report endpoints (except dashboard)
router.get("/inventory-valuation", authorize('admin', 'manager'), ReportController.GetInventoryValuation)
router.get("/low-stock", authorize('admin', 'manager'), ReportController.GetLowStockProducts)
router.get("/shipment-summary", authorize('admin', 'manager'), ReportController.GetShipmentSummary)
router.get("/warehouse-wise", authorize('admin', 'manager'), ReportController.GetWarehouseWiseStock)
router.get("/monthly-inventory", authorize('admin', 'manager'), ReportController.GetMonthlyInventorySummary)
router.get("/product-movements/:productId", authorize('admin', 'manager'), ReportController.GetProductMovementHistory)
router.get("/dashboard", ReportController.GetDashboardStats)

// CSV Export endpoints
router.get("/export/warehouse-stock", authorize('admin', 'manager'), ReportController.ExportWarehouseStockCSV)
router.get("/export/low-stock", authorize('admin', 'manager'), ReportController.ExportLowStockCSV)
router.get("/export/product-movements", authorize('admin', 'manager'), ReportController.ExportProductMovementCSV)

module.exports = router
