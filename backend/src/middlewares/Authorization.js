const httpStatus = require("http-status")
const ApiError = require("../utils/ApiError")
const { UserModel } = require("../models")

const authorize = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const user = await UserModel.findById(req.user).select("role")

            if (!user) {
                throw new ApiError(httpStatus.UNAUTHORIZED, "User not found")
            }

            req.userRole = user.role

            if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
                throw new ApiError(httpStatus.FORBIDDEN, "Access denied. Insufficient permissions.")
            }

            next()
        } catch (error) {
            next(error)
        }
    }
}

module.exports = authorize
