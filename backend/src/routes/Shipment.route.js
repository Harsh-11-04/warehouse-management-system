const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const ShipmentController = require("../controllers/Shipment.controller")
const ShipmentValidation = require("../validations/Shipment.validation")
const Validation = require("../middlewares/Validation")
const router = express.Router()

router.use(Authentication)

// CRUD
router.get("/get-all", ShipmentValidation.query_page, Validation, ShipmentController.GetAllShipments)
router.get("/get/:id", ShipmentValidation.Params_id, Validation, ShipmentController.GetShipmentById)
router.get("/by-product/:productId", ShipmentValidation.Params_productId, Validation, ShipmentController.GetShipmentsByProduct)

router.post("/create", ShipmentValidation.CreateShipment, Validation, ShipmentController.CreateShipment)
router.patch("/status/:id", ShipmentValidation.UpdateStatus, Validation, ShipmentController.UpdateShipmentStatus)
router.delete("/delete/:id", authorize('admin'), ShipmentValidation.Params_id, Validation, ShipmentController.DeleteShipment)

module.exports = router
