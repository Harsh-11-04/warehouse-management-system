const express = require("express")
const router = express.Router()
const EnhancedStockLocationController = require("../controllers/StockLocation.enhanced.controller")
const { authMiddleware, staffOrAbove } = require("../middlewares/rbac.middleware")
const { validateStockOperation, validateStockTransfer, validatePagination } = require("../middlewares/validation.middleware")

router.use(authMiddleware)

router.post("/assign", staffOrAbove, validateStockOperation, EnhancedStockLocationController.assignStock)
router.post("/transfer", staffOrAbove, validateStockTransfer, EnhancedStockLocationController.transferStock)
router.post("/pick", staffOrAbove, validateStockOperation, EnhancedStockLocationController.pickStock)
router.post("/receive", staffOrAbove, validateStockOperation, EnhancedStockLocationController.receiveStock)
router.get("/product/:id", staffOrAbove, EnhancedStockLocationController.getStockByProduct)
router.get("/", staffOrAbove, validatePagination, EnhancedStockLocationController.getAllStockLocations)

// Bulk operations
router.post("/bulk-assign", staffOrAbove, EnhancedStockLocationController.bulkAssignStock)
router.post("/bulk-transfer", staffOrAbove, EnhancedStockLocationController.bulkTransferStock)

module.exports = router
