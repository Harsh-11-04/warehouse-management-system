const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
// const { generalLimiter, authLimiter, stockLimiter, reportLimiter } = require("./middlewares/rateLimit.middleware")
const ApiError = require("./utils/ApiError")
const ErrorHandling = require("./middlewares/ErrorHandler")

const app = express()

app.use(cors())
app.use(morgan("dev"))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: false }))

// Apply rate limiting - temporarily disabled for testing
// app.use(generalLimiter)

// Specific rate limiting for different routes - temporarily disabled
// app.use('/api/v1/auth', authLimiter)
// app.use('/api/v1/stock', stockLimiter)
// app.use('/api/v1/report', reportLimiter)

app.use("/api/v1", require("./routes"))

app.use("*", (req, res) => {
    throw new ApiError(404, "page not found")
})

app.use(ErrorHandling)

module.exports = app