const CloudSyncAuditModel = require("../models/CloudSyncAudit.models")
const CloudSyncService = require("./CloudSync.service")

class CloudSyncAuditService {
    /**
     * Get audit records for a user's shop.
     * Supports filtering by status, entityType, and date range.
     */
    static async getAuditRecords(userId, { page = 1, limit = 30, status, entityType, startDate, endDate } = {}) {
        const shop = await CloudSyncService.ensureShopForUser(userId)

        const filter = { shopId: shop._id }

        if (status) {
            filter.status = status
        }
        if (entityType) {
            filter.entityType = entityType
        }
        if (startDate || endDate) {
            filter.receivedAt = {}
            if (startDate) {
                filter.receivedAt.$gte = new Date(startDate)
            }
            if (endDate) {
                const end = new Date(endDate)
                end.setHours(23, 59, 59, 999)
                filter.receivedAt.$lte = end
            }
        }

        const skip = (page - 1) * limit
        const [records, total] = await Promise.all([
            CloudSyncAuditModel.find(filter)
                .sort({ receivedAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('-payloadSnapshot')
                .lean(),
            CloudSyncAuditModel.countDocuments(filter)
        ])

        return {
            records,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        }
    }

    /**
     * Get a summary of audit record counts by status for a user's shop.
     */
    static async getAuditSummary(userId) {
        const shop = await CloudSyncService.ensureShopForUser(userId)

        const pipeline = [
            { $match: { shopId: shop._id } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]

        const results = await CloudSyncAuditModel.aggregate(pipeline)
        const summary = { received: 0, processed: 0, failed: 0, duplicate: 0, ignored: 0 }
        results.forEach((entry) => {
            summary[entry._id] = entry.count
        })

        return summary
    }
}

module.exports = CloudSyncAuditService
