const ApiError = require("../utils/ApiError")

const ErrorHandling = (err, req, res, next) => {
    const statusCode = err instanceof ApiError ? err.statusCode : (err.statusCode || 500)
    const message = err.message || "Internal server error"
    const obj = { statusCode, message }
    if (process.env.NODE_ENV !== "production") {
        obj.stack = err.stack
    }
    res.status(statusCode).json(obj)
}

module.exports = ErrorHandling