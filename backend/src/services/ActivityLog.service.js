const { ActivityLogModel } = require("../models")

class ActivityLogService {

    // Log an action
    static async log(userId, action, entity, entityId, details = '') {
        await ActivityLogModel.create({
            user: userId,
            action,
            entity,
            entityId,
            details,
            performedBy: userId
        })
    }

    // Get all activity logs (admin sees everything)
    static async getActivityLogs(user, page = 1, entity = '') {
        const limit = 20
        const skip = (Number(page) - 1) * limit

        const filters = {}
        if (entity && entity !== '') {
            filters.entity = entity
        }

        const logs = await ActivityLogModel.find(filters)
            .populate('performedBy', 'name email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })

        const total = await ActivityLogModel.countDocuments(filters)
        const hasMore = skip + limit < total

        return { logs, more: hasMore, total }
    }
}

module.exports = ActivityLogService
