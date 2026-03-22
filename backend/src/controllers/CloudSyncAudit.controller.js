const CloudSyncAuditService = require("../services/CloudSyncAudit.service")

class CloudSyncAuditController {
    static async getAll(req, res, next) {
        try {
            const { page = 1, limit = 30, status, entityType, startDate, endDate } = req.query
            const result = await CloudSyncAuditService.getAuditRecords(req.user, {
                page: Number(page),
                limit: Number(limit),
                status: status || undefined,
                entityType: entityType || undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined
            })
            res.json(result)
        } catch (error) {
            next(error)
        }
    }

    static async getSummary(req, res, next) {
        try {
            const summary = await CloudSyncAuditService.getAuditSummary(req.user)
            res.json({ summary })
        } catch (error) {
            next(error)
        }
    }
}

module.exports = CloudSyncAuditController
