const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const BillingInvoiceController = require("../controllers/BillingInvoice.controller")
const router = express.Router()

router.use(Authentication)

router.get("/get-all", BillingInvoiceController.getAll)
router.get("/dashboard-stats", BillingInvoiceController.getDashboardStats)
router.get("/reports", BillingInvoiceController.getReportData)
router.get("/get/:id", BillingInvoiceController.getById)

router.post("/create", authorize('admin', 'manager', 'warehouse_staff'), BillingInvoiceController.create)
router.put("/update-payment/:id", authorize('admin', 'manager', 'warehouse_staff'), BillingInvoiceController.updatePayment)

router.put("/return/:id", authorize('admin', 'manager', 'warehouse_staff'), BillingInvoiceController.returnItems)
router.put("/add-items/:id", authorize('admin', 'manager', 'warehouse_staff'), BillingInvoiceController.addItems)
router.put("/void/:id", authorize('admin', 'manager'), BillingInvoiceController.voidInvoice)
router.get("/customer/:customerId", BillingInvoiceController.getByCustomer)
router.delete("/delete/:id", authorize('admin'), BillingInvoiceController.deleteInvoice)

module.exports = router
