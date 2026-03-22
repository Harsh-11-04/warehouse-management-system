const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const BillingSettingsController = require("../controllers/BillingSettings.controller")
const router = express.Router()

router.use(Authentication)

router.get("/get", BillingSettingsController.get)
router.put("/update", authorize('admin', 'manager'), BillingSettingsController.update)

module.exports = router
