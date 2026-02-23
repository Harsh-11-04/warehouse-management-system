const express = require("express")
const Authentication = require("../middlewares/Authentication")
const StockLocationController = require("../controllers/StockLocation.controller")
const StockLocationValidation = require("../validations/StockLocation.validation")
const Validation = require("../middlewares/Validation")
const router = express.Router()

router.use(Authentication)

// Stock operations
router.post("/assign", StockLocationValidation.AssignStock, Validation, StockLocationController.assignStock)
router.post("/transfer", StockLocationValidation.TransferStock, Validation, StockLocationController.transferStock)
router.post("/pick", StockLocationValidation.PickStock, Validation, StockLocationController.pickStock)
router.post("/receive", StockLocationValidation.ReceiveStock, Validation, StockLocationController.receiveStock)

// Queries
router.get("/by-product/:productId", StockLocationValidation.Params_productId, Validation, StockLocationController.getStockByProduct)
router.get("/all", StockLocationController.getAllStockLocations)

module.exports = router
