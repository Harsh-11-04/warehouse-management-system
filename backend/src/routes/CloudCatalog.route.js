const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const SyncWorkerAuthentication = require("../middlewares/SyncWorkerAuthentication")
const CloudCatalogController = require("../controllers/CloudCatalog.controller")

const router = express.Router()

router.get("/worker-changes", SyncWorkerAuthentication, CloudCatalogController.GetWorkerChanges)

router.use(Authentication)
router.use(authorize("admin", "manager"))

router.get("/changes", CloudCatalogController.GetChanges)

module.exports = router
