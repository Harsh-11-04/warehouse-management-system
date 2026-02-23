const httpStatus = require("http-status")
const ApiError = require("../utils/ApiError")
const { validateToken } = require("../utils/Token.utils")
const { UserModel } = require("../models")

const Authentication = async (req, res, next) => {
    try {
        const headers = req.headers['authorization'] || ''

        if (!headers || !headers.startsWith("Bearer ")) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "Please Login first")
        }

        const auth_token = headers.split(" ")[1]

        if (!auth_token) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "Please Provide valid")
        }

        const data = validateToken(auth_token)
        req.user = data.userid

        // Fetch user role for authorization middleware
        const user = await UserModel.findById(data.userid).select('role')
        req.userRole = user ? user.role : 'admin'

        next()

    } catch (error) {
        next(error)
    }
}

module.exports = Authentication