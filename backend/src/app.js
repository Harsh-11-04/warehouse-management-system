const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
const path = require("path")
const { generalLimiter, authLimiter, reportLimiter } = require("./middlewares/rateLimit.middleware")
const ApiError = require("./utils/ApiError")
const ErrorHandling = require("./middlewares/ErrorHandler")
const sanitizeRequest = require("./middlewares/SanitizeRequest")

const app = express()
const isElectronMode = process.env.ELECTRON_MODE === "true"

app.use(cors())
app.use(morgan("dev"))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: false }))
app.disable("x-powered-by")

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    next()
})

app.use(sanitizeRequest)

app.use('/api/v1/auth', authLimiter)
if (!isElectronMode) {
    app.use('/api/v1/report', reportLimiter)
    app.use('/api/v1', generalLimiter)
}

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
