const BillingCustomer = require("../models/BillingCustomer.models")
const ActivityLogService = require("./ActivityLog.service")
const SyncService = require("./Sync.service")
const ShopUtils = require("../utils/ShopUtils")
const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const normalizePagination = (page = 1, limit = 20, maxLimit = 100) => {
    const safePage = Math.max(Number.parseInt(page, 10) || 1, 1)
    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), maxLimit)
    return { page: safePage, limit: safeLimit }
}

class BillingCustomerService {
    static buildCustomerSyncPayload(customer) {
        return {
            customerId: customer._id,
            name: customer.name,
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
            gstNumber: customer.gstNumber || '',
            hasCard: customer.hasCard || false,
            isActive: customer.isActive !== false,
            updatedAt: customer.updatedAt || new Date()
        }
    }

    static async create(userId, data) {
        const customer = await BillingCustomer.create({ ...data, user: userId })
        await ActivityLogService.log(userId, 'CREATE', 'BillingCustomer', customer._id, `Created customer: ${customer.name}`)

        await SyncService.enqueue(userId, {
            entityType: 'customer',
            entityId: customer._id,
            operation: 'create',
            sourceModule: 'billing',
            payload: this.buildCustomerSyncPayload(customer),
            metadata: { localOnly: true, syncVersion: 1 }
        })

        return customer
    }

    static async getAll(userId, { page = 1, limit = 20, query = '' }) {
        const pagination = normalizePagination(page, limit)
        const userIds = await ShopUtils.getShopUserIds(userId)
        const filter = { user: { $in: userIds }, isActive: true }
        const escapedQuery = query ? escapeRegex(query.trim()) : ''
        if (escapedQuery) {
            filter.$or = [
                { name: { $regex: escapedQuery, $options: 'i' } },
                { phone: { $regex: escapedQuery, $options: 'i' } },
                { email: { $regex: escapedQuery, $options: 'i' } }
            ]
        }
        const skip = (pagination.page - 1) * pagination.limit
        const [customers, total] = await Promise.all([
            BillingCustomer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pagination.limit),
            BillingCustomer.countDocuments(filter)
        ])
        return { customers, total, page: pagination.page, totalPages: Math.ceil(total / pagination.limit) || 1 }
    }

    static async getById(userId, id) {
        const userIds = await ShopUtils.getShopUserIds(userId)
        return BillingCustomer.findOne({ _id: id, user: { $in: userIds } })
    }

    static async search(userId, query) {
        const userIds = await ShopUtils.getShopUserIds(userId)
        const filter = { user: { $in: userIds }, isActive: true }
        const escapedQuery = query ? escapeRegex(query.trim()) : ''
        if (escapedQuery) {
            filter.$or = [
                { name: { $regex: escapedQuery, $options: 'i' } },
                { phone: { $regex: escapedQuery, $options: 'i' } }
            ]
        }
        return BillingCustomer.find(filter).limit(10).select('name phone email hasCard')
    }

    static async update(userId, id, data) {
        const userIds = await ShopUtils.getShopUserIds(userId)
        const customer = await BillingCustomer.findOneAndUpdate(
            { _id: id, user: { $in: userIds } },
            { $set: data },
            { new: true, runValidators: true }
        )
        if (customer) {
            await ActivityLogService.log(userId, 'UPDATE', 'BillingCustomer', id, `Updated customer details: ${customer.name}`)

            await SyncService.enqueue(userId, {
                entityType: 'customer',
                entityId: customer._id,
                operation: 'update',
                sourceModule: 'billing',
                payload: this.buildCustomerSyncPayload(customer),
                metadata: { localOnly: true, syncVersion: 1 }
            })
        }
        return customer
    }

    static async delete(userId, id) {
        const userIds = await ShopUtils.getShopUserIds(userId)
        const customer = await BillingCustomer.findOneAndUpdate(
            { _id: id, user: { $in: userIds } },
            { $set: { isActive: false } },
            { new: true }
        )
        if (customer) {
            await ActivityLogService.log(userId, 'DELETE', 'BillingCustomer', id, `Soft deleted customer: ${customer.name}`)

            await SyncService.enqueue(userId, {
                entityType: 'customer',
                entityId: customer._id,
                operation: 'delete',
                sourceModule: 'billing',
                payload: {
                    customerId: customer._id,
                    name: customer.name,
                    isActive: false,
                    updatedAt: customer.updatedAt || new Date()
                },
                metadata: { localOnly: true, syncVersion: 1 }
            })
        }
        return customer
    }
}

module.exports = BillingCustomerService
