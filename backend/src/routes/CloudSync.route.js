const express = require("express")
const SyncWorkerAuthentication = require("../middlewares/SyncWorkerAuthentication")
const CloudSyncController = require("../controllers/CloudSync.controller")

const router = express.Router()

router.use(SyncWorkerAuthentication)

router.get("/health", CloudSyncController.Health)
router.post("/bulk", CloudSyncController.BulkIngest)

module.exports = router
