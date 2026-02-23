const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const ReportController = require("../controllers/Report.controller")
const router = express.Router()

router.use(Authentication)

// All report endpoints are admin-only
router.get("/inventory-valuation", authorize('admin'), ReportController.GetInventoryValuation)
router.get("/low-stock", authorize('admin'), ReportController.GetLowStockProducts)
router.get("/shipment-summary", authorize('admin'), ReportController.GetShipmentSummary)
router.get("/dashboard", ReportController.GetDashboardStats)

module.exports = router
