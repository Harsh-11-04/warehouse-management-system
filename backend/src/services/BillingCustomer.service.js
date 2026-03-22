const BillingCustomer = require("../models/BillingCustomer.models")
const ActivityLogService = require("./ActivityLog.service")
const SyncService = require("./Sync.service")

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
        const filter = { user: userId, isActive: true }
        if (query) {
            filter.$or = [
                { name: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ]
        }
        const skip = (page - 1) * limit
        const [customers, total] = await Promise.all([
            BillingCustomer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            BillingCustomer.countDocuments(filter)
        ])
        return { customers, total, page, totalPages: Math.ceil(total / limit) }
    }

    static async getById(userId, id) {
        return BillingCustomer.findOne({ _id: id, user: userId })
    }

    static async search(userId, query) {
        const filter = { user: userId, isActive: true }
        if (query) {
            filter.$or = [
                { name: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } }
            ]
        }
        return BillingCustomer.find(filter).limit(10).select('name phone email hasCard')
    }

    static async update(userId, id, data) {
        const customer = await BillingCustomer.findOneAndUpdate(
            { _id: id, user: userId },
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
        const customer = await BillingCustomer.findOneAndUpdate(
            { _id: id, user: userId },
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
