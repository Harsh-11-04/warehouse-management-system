const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const CloudSyncAuditController = require("../controllers/CloudSyncAudit.controller")
const router = express.Router()

router.use(Authentication)

router.get("/", authorize('admin', 'manager'), CloudSyncAuditController.getAll)
router.get("/summary", authorize('admin', 'manager'), CloudSyncAuditController.getSummary)

module.exports = router
