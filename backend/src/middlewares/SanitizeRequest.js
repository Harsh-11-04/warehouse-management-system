const PROHIBITED_KEYS = new Set(['__proto__', 'prototype', 'constructor'])

const isPlainObject = (value) =>
    Object.prototype.toString.call(value) === '[object Object]'

const sanitizeValue = (value) => {
    if (Array.isArray(value)) {
        return value.map(sanitizeValue)
    }

    if (!isPlainObject(value)) {
        return value
    }

    return Object.entries(value).reduce((acc, [key, nestedValue]) => {
        if (
            PROHIBITED_KEYS.has(key)
            || key.startsWith('$')
            || key.includes('.')
        ) {
            return acc
        }

        acc[key] = sanitizeValue(nestedValue)
        return acc
    }, {})
}

const sanitizeRequest = (req, _res, next) => {
    req.body = sanitizeValue(req.body)
    req.query = sanitizeValue(req.query)
    req.params = sanitizeValue(req.params)
    next()
}

module.exports = sanitizeRequest
