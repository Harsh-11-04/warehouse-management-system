const CatchAsync = require("../utils/CatchAsync")
const CloudSyncService = require("../services/CloudSync.service")

class CloudSyncController {
    static Health = CatchAsync(async (req, res) => {
        const result = CloudSyncService.getHealth()
        res.status(200).json(result)
    })

    static BulkIngest = CatchAsync(async (req, res) => {
        const result = await CloudSyncService.ingestBulk({
            deviceId: req.syncDeviceId || req.body?.deviceId || "",
            events: req.body?.events || []
        })

        res.status(200).json(result)
    })
}

module.exports = CloudSyncController
