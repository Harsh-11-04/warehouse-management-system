const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const WarehouseController = require("../controllers/Warehouse.controller")
const WarehouseValidation = require("../validations/Warehouse.validation")
const Validation = require("../middlewares/Validation")
const router = express.Router()

router.use(Authentication)

// Warehouse CRUD
router.get("/get-all", WarehouseValidation.query_page, Validation, WarehouseController.getAllWarehouses)
router.get("/get-search", WarehouseController.getAllWarehousesForSearch)
router.get("/get/:id", WarehouseValidation.Params_id, Validation, WarehouseController.getWarehouseById)
router.post("/create", authorize('admin'), WarehouseValidation.CreateWarehouse, Validation, WarehouseController.createWarehouse)
router.patch("/update/:id", authorize('admin'), WarehouseValidation.Params_id, Validation, WarehouseController.updateWarehouse)
router.delete("/delete/:id", authorize('admin'), WarehouseValidation.Params_id, Validation, WarehouseController.deleteWarehouse)

// Storage Locations
router.post("/location", authorize('admin'), WarehouseValidation.CreateLocation, Validation, WarehouseController.createLocation)
router.get("/locations/:warehouseId", WarehouseValidation.Params_warehouseId, Validation, WarehouseController.getLocations)
router.delete("/location/:id", authorize('admin', 'manager'), WarehouseValidation.Params_id, Validation, WarehouseController.deleteLocation)

// Stock Report
router.get("/stock-report/:warehouseId", WarehouseValidation.Params_warehouseId, Validation, WarehouseController.getWarehouseStockReport)

// Scan QR/Barcode - fetch location + stock by location ID
router.get("/location-by-scan/:locationId", WarehouseController.getLocationByScan)

module.exports = router
