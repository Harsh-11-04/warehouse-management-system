const express = require("express")
const router = express.Router()
const StockHistoryController = require("../controllers/StockHistory.controller")
const { authMiddleware, staffOrAbove, managerOrAdmin } = require("../middlewares/rbac.middleware")

router.use(authMiddleware)

router.get("/history", staffOrAbove, StockHistoryController.getStockHistory)
router.get("/product/:productId/movements", staffOrAbove, StockHistoryController.getProductMovementHistory)
router.get("/audit-trail", managerOrAdmin, StockHistoryController.getAuditTrail)

module.exports = router
