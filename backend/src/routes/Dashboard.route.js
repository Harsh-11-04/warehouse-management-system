const express = require("express")
const router = express.Router()
const DashboardController = require("../controllers/Dashboard.controller")
const { authMiddleware, managerOrAdmin, staffOrAbove } = require("../middlewares/rbac.middleware")

router.use(authMiddleware)

// Manager and Admin only
router.get("/kpis", managerOrAdmin, DashboardController.getDashboardKPIs)
router.get("/inventory-value", managerOrAdmin, DashboardController.getInventoryValue)
router.get("/daily-movements", managerOrAdmin, DashboardController.getDailyMovements)
router.get("/warehouse-utilization", managerOrAdmin, DashboardController.getWarehouseUtilization)
router.get("/fast-slow-moving", managerOrAdmin, DashboardController.getFastSlowMovingProducts)
router.get("/monthly-summary", managerOrAdmin, DashboardController.getMonthlyInventorySummary)

// All authenticated users (including staff)
router.get("/low-stock-alerts", staffOrAbove, DashboardController.getLowStockAlerts)

module.exports = router
