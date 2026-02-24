const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const AdminService = require("../services/Admin.service")
const { authMiddleware, adminOnly } = require("../middlewares/rbac.middleware")

class AdminController {
    static createTestUsers = CatchAsync(async (req, res) => {
        const result = await AdminService.createTestUsers()
        res.status(httpStatus.CREATED).json(result)
    })

    static getUsersByRole = CatchAsync(async (req, res) => {
        const { role } = req.params
        const result = await AdminService.getUsersByRole(role)
        res.status(httpStatus.OK).json(result)
    })

    static getAllUsers = CatchAsync(async (req, res) => {
        const result = await AdminService.getAllUsers()
        res.status(httpStatus.OK).json(result)
    })
}

module.exports = AdminController
