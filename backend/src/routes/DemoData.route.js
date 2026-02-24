const express = require("express")
const router = express.Router()
const DemoDataController = require("../controllers/DemoData.controller")
const { authMiddleware, adminOnly } = require("../middlewares/rbac.middleware")

router.use(authMiddleware)

// Admin only routes
router.post("/clear-storage-locations", adminOnly, DemoDataController.clearStorageLocations)
router.post("/create-demo-data", adminOnly, DemoDataController.createDemoData)

module.exports = router
