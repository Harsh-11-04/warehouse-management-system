const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const ActivityLogController = require("../controllers/ActivityLog.controller")
const router = express.Router()

router.use(Authentication)

// Admin only access to activity logs
router.get("/get-all", authorize('admin'), ActivityLogController.GetActivityLogs)

module.exports = router
