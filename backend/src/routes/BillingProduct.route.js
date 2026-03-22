const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const BillingProductController = require("../controllers/BillingProduct.controller")
const router = express.Router()

router.use(Authentication)

router.get("/get-all", BillingProductController.getAll)
router.get("/search", BillingProductController.search)
router.get("/stock-stats", BillingProductController.getStockStats)
router.get("/barcode/:barcode", BillingProductController.getByBarcode)
router.get("/get/:id", BillingProductController.getById)

router.post("/create", authorize('admin', 'manager', 'warehouse_staff'), BillingProductController.create)
router.patch("/update/:id", authorize('admin', 'manager', 'warehouse_staff'), BillingProductController.update)
router.patch("/update-stock/:id", authorize('admin', 'manager', 'warehouse_staff'), BillingProductController.updateStock)
router.delete("/delete/:id", authorize('admin', 'manager'), BillingProductController.delete)

module.exports = router
