const CatchAsync = require("../utils/CatchAsync")
const CloudCatalogService = require("../services/CloudCatalog.service")
const ApiError = require("../utils/ApiError")

class CloudCatalogController {
    static GetChanges = CatchAsync(async (req, res) => {
        const result = await CloudCatalogService.getChanges(req.user, {
            cursor: req.query.cursor,
            limit: req.query.limit
        })

        res.status(200).json(result)
    })

    static GetWorkerChanges = CatchAsync(async (req, res) => {
        if (!req.syncSourceUser) {
            throw new ApiError(400, "Missing x-source-user header")
        }

        const result = await CloudCatalogService.getChanges(req.syncSourceUser, {
            cursor: req.query.cursor,
            limit: req.query.limit
        })

        res.status(200).json(result)
    })
}

module.exports = CloudCatalogController
