const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
const path = require("path")
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

// ─── Health check endpoint (used by Electron for readiness polling) ───
app.get("/api/v1/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() })
})

app.use("/api/v1", require("./routes"))

// ─── Serve frontend in production / Electron mode ───
const frontendDistPath = process.env.FRONTEND_DIST_PATH
    || path.join(__dirname, "..", "..", "frontend", "dist")

if (process.env.ELECTRON_MODE === "true" || process.env.NODE_ENV === "production") {
    const fs = require("fs")
    if (fs.existsSync(frontendDistPath)) {
        app.use(express.static(frontendDistPath))
        // SPA catch-all: serve index.html for any non-API route
        app.get("*", (req, res) => {
            res.sendFile(path.join(frontendDistPath, "index.html"))
        })
    } else {
        app.use("*", (req, res) => {
            throw new ApiError(404, "page not found")
        })
    }
} else {
    app.use("*", (req, res) => {
        throw new ApiError(404, "page not found")
    })
}

app.use(ErrorHandling)

module.exports = app