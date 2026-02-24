const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const DemoDataService = require("../services/DemoData.service")
const { StorageLocationModel } = require("../models")
const { authMiddleware, adminOnly } = require("../middlewares/rbac.middleware")

class DemoDataController {
    static clearStorageLocations = CatchAsync(async (req, res) => {
        await StorageLocationModel.deleteMany({})
        res.status(httpStatus.OK).json({
            message: "Storage locations cleared successfully"
        })
    })
    
    static createDemoData = CatchAsync(async (req, res) => {
        const result = await DemoDataService.createDemoData()
        res.status(httpStatus.CREATED).json(result)
    })
}

module.exports = DemoDataController
