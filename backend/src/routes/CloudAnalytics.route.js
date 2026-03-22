const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const CloudAnalyticsController = require("../controllers/CloudAnalytics.controller")

const router = express.Router()

router.use(Authentication)
router.use(authorize("admin", "manager"))

router.get("/overview", CloudAnalyticsController.Overview)
router.get("/daily-revenue", CloudAnalyticsController.DailyRevenue)
router.get("/monthly-revenue", CloudAnalyticsController.MonthlyRevenue)
router.get("/best-sellers", CloudAnalyticsController.BestSellers)
router.get("/inventory-alerts", CloudAnalyticsController.InventoryAlerts)

module.exports = router
