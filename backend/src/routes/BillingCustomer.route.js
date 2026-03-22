const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const BillingCustomerController = require("../controllers/BillingCustomer.controller")
const router = express.Router()

router.use(Authentication)

router.get("/get-all", BillingCustomerController.getAll)
router.get("/search", BillingCustomerController.search)
router.get("/get/:id", BillingCustomerController.getById)

router.post("/create", authorize('admin', 'manager', 'warehouse_staff'), BillingCustomerController.create)
router.patch("/update/:id", authorize('admin', 'manager', 'warehouse_staff'), BillingCustomerController.update)
router.delete("/delete/:id", authorize('admin', 'manager'), BillingCustomerController.delete)

module.exports = router
