const express = require("express")
const router = express.Router()
const AdminController = require("../controllers/Admin.controller")
const { authMiddleware, adminOnly } = require("../middlewares/rbac.middleware")

router.use(authMiddleware)

// Admin only routes
router.post("/create-test-users", adminOnly, AdminController.createTestUsers)
router.get("/users", adminOnly, AdminController.getAllUsers)
router.get("/users/:role", adminOnly, AdminController.getUsersByRole)

module.exports = router
