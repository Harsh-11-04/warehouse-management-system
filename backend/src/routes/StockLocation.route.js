const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const StockLocationController = require("../controllers/StockLocation.controller")
const StockLocationValidation = require("../validations/StockLocation.validation")
const Validation = require("../middlewares/Validation")
const router = express.Router()

router.use(Authentication)

// Stock operations - only authenticated warehouse roles can mutate stock
router.post("/assign", authorize('admin', 'manager', 'warehouse_staff'), StockLocationValidation.AssignStock, Validation, StockLocationController.assignStock)
router.post("/transfer", authorize('admin', 'manager', 'warehouse_staff'), StockLocationValidation.TransferStock, Validation, StockLocationController.transferStock)
router.post("/pick", authorize('admin', 'manager', 'warehouse_staff'), StockLocationValidation.PickStock, Validation, StockLocationController.pickStock)
router.post("/receive", authorize('admin', 'manager', 'warehouse_staff'), StockLocationValidation.ReceiveStock, Validation, StockLocationController.receiveStock)

// Queries - any authenticated user can view stock
router.get("/by-product/:productId", StockLocationValidation.Params_productId, Validation, StockLocationController.getStockByProduct)
router.get("/all", StockLocationController.getAllStockLocations)

module.exports = router
