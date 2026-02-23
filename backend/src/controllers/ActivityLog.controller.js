const CatchAsync = require("../utils/CatchAsync")
const ActivityLogService = require("../services/ActivityLog.service")

class ActivityLogController {

    static GetActivityLogs = CatchAsync(async (req, res) => {
        const result = await ActivityLogService.getActivityLogs(req.user, req.query.page, req.query.entity)
        res.status(200).json(result)
    })
}

module.exports = ActivityLogController
