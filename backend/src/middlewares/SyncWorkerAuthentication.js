const httpStatus = require("http-status")
const ApiError = require("../utils/ApiError")

const SyncWorkerAuthentication = (req, res, next) => {
    try {
        const configuredToken = process.env.SYNC_AUTH_TOKEN || ""
        if (!configuredToken) {
            throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, "Cloud sync token is not configured")
        }

        const headerToken = req.headers.authorization?.startsWith("Bearer ")
            ? req.headers.authorization.split(" ")[1]
            : ""

        if (!headerToken || headerToken !== configuredToken) {
            throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid sync worker token")
        }

        req.syncDeviceId = String(req.headers["x-device-id"] || "")
        req.syncSourceUser = String(req.headers["x-source-user"] || "")
        next()
    } catch (error) {
        next(error)
    }
}

module.exports = SyncWorkerAuthentication
