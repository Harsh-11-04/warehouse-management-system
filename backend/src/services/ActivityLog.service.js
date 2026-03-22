const { ActivityLogModel } = require("../models")

class ActivityLogService {

    // Log an action
    static async log(userId, action, entity, entityId, details = '', options = {}) {
        const logData = {
            user: userId,
            action,
            entity,
            entityId,
            details,
            performedBy: userId
        }

        if (options.session) {
            await ActivityLogModel.create([logData], { session: options.session })
            return
        }

        await ActivityLogModel.create(logData)
    }

    // Get all activity logs (admin sees everything)
    static async getActivityLogs(user, page = 1, entity = '', system = '') {
        const limit = 20
        const skip = (Number(page) - 1) * limit

        const filters = {}
        if (entity && entity !== '') {
            filters.entity = entity
        } else if (system === 'billing') {
            filters.entity = { $in: ['BillingProduct', 'BillingCustomer', 'BillingInvoice'] }
        } else if (system === 'warehouse') {
            filters.entity = { $in: ['Product', 'Warehouse', 'StorageLocation', 'StockLocation', 'Shipment', 'User'] }
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
