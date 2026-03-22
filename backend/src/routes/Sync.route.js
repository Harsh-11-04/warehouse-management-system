const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const SyncController = require("../controllers/Sync.controller")

const router = express.Router()

router.use(Authentication)

router.get("/status", authorize('admin', 'manager', 'warehouse_staff'), SyncController.GetStatus)
router.post("/pull-catalog", authorize('admin', 'manager', 'warehouse_staff'), SyncController.PullCatalog)
router.post("/run-once", authorize('admin', 'manager', 'warehouse_staff'), SyncController.RunOnce)
router.post("/retry-failed", authorize('admin', 'manager', 'warehouse_staff'), SyncController.RetryFailed)
router.get("/health", authorize('admin', 'manager'), SyncController.Health)

module.exports = router
