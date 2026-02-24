const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const jwt = require("jsonwebtoken")
const { PUBLIC_DATA } = require("../../constant")
const ApiError = require("../utils/ApiError")

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "Access token required")
        }

        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, PUBLIC_DATA.jwt_auth)

        req.user = decoded.userId
        req.userRole = decoded.role || 'warehouse_staff'

        next()
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new ApiError(httpStatus.UNAUTHORIZED, "Invalid token"))
        }
        if (error.name === 'TokenExpiredError') {
            return next(new ApiError(httpStatus.UNAUTHORIZED, "Token expired"))
        }
        next(error)
    }
}

const rbacMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.userRole) {
            return next(new ApiError(httpStatus.UNAUTHORIZED, "User role not found"))
        }

        if (!allowedRoles.includes(req.userRole)) {
            return next(new ApiError(httpStatus.FORBIDDEN, "Insufficient permissions"))
        }

        next()
    }
}

const adminOnly = rbacMiddleware(['admin'])
const managerOrAdmin = rbacMiddleware(['admin', 'manager'])
const staffOrAbove = rbacMiddleware(['admin', 'manager', 'warehouse_staff'])

module.exports = {
    authMiddleware,
    rbacMiddleware,
    adminOnly,
    managerOrAdmin,
    staffOrAbove
}
