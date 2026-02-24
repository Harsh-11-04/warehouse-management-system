const rateLimit = require('express-rate-limit')

const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message: { error: message },
        standardHeaders: true,
        legacyHeaders: false,
    })
}

// General API rate limiting
const generalLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // limit each IP to 100 requests per windowMs
    'Too many requests from this IP, please try again after 15 minutes'
)

// Strict rate limiting for authentication endpoints
const authLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // limit each IP to 5 requests per windowMs
    'Too many authentication attempts, please try again after 15 minutes'
)

// Stock operations rate limiting
const stockLimiter = createRateLimiter(
    60 * 1000, // 1 minute
    30, // limit each IP to 30 stock operations per minute
    'Too many stock operations, please try again after a minute'
)

// Report generation rate limiting
const reportLimiter = createRateLimiter(
    5 * 60 * 1000, // 5 minutes
    10, // limit each IP to 10 reports per 5 minutes
    'Too many report requests, please try again after 5 minutes'
)

module.exports = {
    generalLimiter,
    authLimiter,
    stockLimiter,
    reportLimiter
}
