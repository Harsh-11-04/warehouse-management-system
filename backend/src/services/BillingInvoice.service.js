const mongoose = require("mongoose")
const httpStatus = require("http-status")
const BillingInvoice = require("../models/BillingInvoice.models")
const BillingProduct = require("../models/BillingProduct.models")
const BillingCustomer = require("../models/BillingCustomer.models")
const ActivityLogService = require("./ActivityLog.service")
const SyncService = require("./Sync.service")
const ApiError = require("../utils/ApiError")

const NON_TRANSACTIONAL_MONGO_ERRORS = [
    "Transaction numbers are only allowed on a replica set member or mongos",
    "replica set",
    "Standalone servers do not support transactions"
]

const buildRequestedQuantityMap = (items, productKey) => {
    return items.reduce((acc, item) => {
        const productId = String(item[productKey] || '')
        const quantity = Number(item.quantity) || 0

        if (!productId) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Product reference is required")
        }

        acc[productId] = (acc[productId] || 0) + quantity
        return acc
    }, {})
}

const buildProductMap = (products) => {
    const map = new Map()
    products.forEach((product) => {
        map.set(product._id.toString(), product)
    })
    return map
}

const withOptionalSession = (query, session) => (session ? query.session(session) : query)

class BillingInvoiceService {
    static isTransactionFallbackError(error) {
        return NON_TRANSACTIONAL_MONGO_ERRORS.some((message) =>
            String(error?.message || '').toLowerCase().includes(message.toLowerCase())
        )
    }

    static async runWithOptionalTransaction(work) {
        const session = await mongoose.startSession()

        try {
            let result

            try {
                await session.withTransaction(async () => {
                    result = await work(session)
                })
                return result
            } catch (error) {
                if (!this.isTransactionFallbackError(error)) {
                    throw error
                }
            }

            return await work(null)
        } finally {
            await session.endSession()
        }
    }

    static async generateInvoiceNumber(session = null) {
        const query = BillingInvoice.findOne({}).sort({ createdAt: -1 }).select('invoiceNumber')
        const lastInvoice = await withOptionalSession(query, session)

        if (!lastInvoice) return 'INV-0001'

        const lastNum = parseInt(lastInvoice.invoiceNumber.replace('INV-', ''), 10)
        return `INV-${String(lastNum + 1).padStart(4, '0')}`
    }

    static buildSaleSyncEvent(invoice, payload) {
        return {
            entityType: 'sale',
            entityId: invoice._id,
            operation: 'create',
            sourceModule: 'billing',
            payload: {
                billId: invoice.invoiceNumber,
                invoiceId: invoice._id,
                customerId: invoice.customer,
                customerName: invoice.customerName,
                customerPhone: invoice.customerPhone,
                items: invoice.items,
                subtotal: invoice.subtotal,
                totalGst: invoice.totalGst,
                discount: invoice.discount,
                discountType: invoice.discountType,
                grandTotal: invoice.grandTotal,
                paymentMode: invoice.paymentMode,
                paymentStatus: invoice.paymentStatus,
                billedBy: invoice.billedBy,
                createdAt: invoice.createdAt || new Date()
            },
            metadata: {
                invoiceNumber: invoice.invoiceNumber,
                localOnly: true,
                syncVersion: 1,
                requestedTotals: {
                    subtotal: payload.subtotal,
                    totalGst: payload.totalGst,
                    totalProfit: payload.totalProfit
                }
            }
        }
    }

    static buildInventoryEvents(invoice, requestedQtyByProduct, productMap) {
        return Object.entries(requestedQtyByProduct).map(([productId, quantity]) => {
            const product = productMap.get(productId)

            return {
                entityType: 'inventory_movement',
                entityId: product?._id || productId,
                operation: 'create',
                sourceModule: 'billing',
                payload: {
                    productId,
                    productName: product?.name || '',
                    quantityDelta: -quantity,
                    movementType: 'sale',
                    refType: 'BillingInvoice',
                    refId: invoice._id,
                    refNumber: invoice.invoiceNumber,
                    createdAt: invoice.createdAt || new Date()
                },
                metadata: {
                    invoiceNumber: invoice.invoiceNumber,
                    localOnly: true,
                    syncVersion: 1
                }
            }
        })
    }

    static buildCustomerEvent(customer, operation = 'create') {
        return {
            entityType: 'customer',
            entityId: customer._id,
            operation,
            sourceModule: 'billing',
            payload: {
                customerId: customer._id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email || '',
                address: customer.address || '',
                gstNumber: customer.gstNumber || '',
                hasCard: customer.hasCard || false,
                isActive: customer.isActive !== false,
                updatedAt: customer.updatedAt || new Date()
            },
            metadata: {
                localOnly: true,
                syncVersion: 1
            }
        }
    }

    static async create(userId, data) {
        if (!Array.isArray(data.items) || data.items.length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Invoice must have at least one item")
        }

        return this.runWithOptionalTransaction(async (session) => {
            const invoiceNumber = await this.generateInvoiceNumber(session)

            let subtotal = 0
            let totalGst = 0
            let totalProfit = 0

            const requestedQtyByProduct = buildRequestedQuantityMap(data.items, 'product')
            const productIds = Object.keys(requestedQtyByProduct)
            const productQuery = BillingProduct.find({
                user: userId,
                isActive: true,
                _id: { $in: productIds }
            }).select('_id name barcode purchasePrice stock')
            const productsInfo = await withOptionalSession(productQuery, session)
            const productMap = buildProductMap(productsInfo)

            if (productMap.size !== productIds.length) {
                throw new ApiError(httpStatus.BAD_REQUEST, "One or more billing products were not found")
            }

            Object.entries(requestedQtyByProduct).forEach(([productId, requestedQty]) => {
                const product = productMap.get(productId)
                if (!product) {
                    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid billing product selected")
                }

                if (requestedQty <= 0) {
                    throw new ApiError(httpStatus.BAD_REQUEST, `Quantity must be greater than 0 for ${product.name}`)
                }

                if (product.stock < requestedQty) {
                    throw new ApiError(
                        httpStatus.BAD_REQUEST,
                        `${product.name} has only ${product.stock} units in stock`
                    )
                }
            })

            const processedItems = data.items.map((item) => {
                const productId = String(item.product)
                const product = productMap.get(productId)
                const quantity = Number(item.quantity) || 0
                const price = Number(item.price) || 0
                const gstPercent = Number(item.gstPercent) || 0

                if (!product) {
                    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid billing product selected")
                }

                if (quantity <= 0) {
                    throw new ApiError(httpStatus.BAD_REQUEST, `Quantity must be greater than 0 for ${product.name}`)
                }

                if (price < 0 || gstPercent < 0) {
                    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid pricing for ${product.name}`)
                }

                const lineSubtotal = price * quantity
                const gstAmount = (lineSubtotal * gstPercent) / 100
                const lineTotal = lineSubtotal + gstAmount
                const purchasePrice = product.purchasePrice || 0
                const itemProfit = (price - purchasePrice) * quantity

                subtotal += lineSubtotal
                totalGst += gstAmount
                totalProfit += itemProfit

                return {
                    product: product._id,
                    name: item.name || product.name,
                    barcode: item.barcode || product.barcode || '',
                    quantity,
                    price,
                    gstPercent,
                    gstAmount: Math.round(gstAmount * 100) / 100,
                    lineTotal: Math.round(lineTotal * 100) / 100,
                    profit: Math.round(itemProfit * 100) / 100
                }
            })

            const rawTotal = Math.round((subtotal + totalGst) * 100) / 100
            const discountType = data.discountType || 'flat'
            const discountInput = Number(data.discount) || 0
            let discountAmount = 0

            if (discountType === 'percent') {
                discountAmount = Math.round((rawTotal * discountInput / 100) * 100) / 100
            } else {
                discountAmount = Math.min(discountInput, rawTotal)
            }

            const grandTotal = Math.max(0, Math.round((rawTotal - discountAmount) * 100) / 100)

            let customerId = data.customer || null
            let finalCustomerName = data.customerName || 'Walk-in'
            let finalCustomerPhone = data.customerPhone || ''
            let customerSyncEvent = null

            if (!customerId && finalCustomerPhone) {
                const customerQuery = BillingCustomer.findOne({
                    user: userId,
                    phone: finalCustomerPhone
                })
                const existingCustomer = await withOptionalSession(customerQuery, session)

                if (existingCustomer) {
                    customerId = existingCustomer._id
                    finalCustomerName = existingCustomer.name
                    finalCustomerPhone = existingCustomer.phone

                    if (!existingCustomer.isActive) {
                        existingCustomer.isActive = true
                        await existingCustomer.save(session ? { session } : {})
                        customerSyncEvent = this.buildCustomerEvent(existingCustomer, 'update')
                    }
                } else {
                    const newCustomer = new BillingCustomer({
                        user: userId,
                        name: finalCustomerName,
                        phone: finalCustomerPhone,
                        hasCard: false
                    })
                    await newCustomer.save(session ? { session } : {})
                    customerId = newCustomer._id
                    customerSyncEvent = this.buildCustomerEvent(newCustomer, 'create')
                }
            } else if (customerId) {
                const customerQuery = BillingCustomer.findOne({ _id: customerId, user: userId })
                const existingCustomer = await withOptionalSession(customerQuery, session)
                if (!existingCustomer) {
                    throw new ApiError(httpStatus.NOT_FOUND, "Customer not found")
                }

                finalCustomerName = existingCustomer.name
                finalCustomerPhone = existingCustomer.phone
            }

            const invoice = new BillingInvoice({
                user: userId,
                invoiceNumber,
                customer: customerId,
                customerName: finalCustomerName,
                customerPhone: finalCustomerPhone,
                items: processedItems,
                subtotal: Math.round(subtotal * 100) / 100,
                totalGst: Math.round(totalGst * 100) / 100,
                totalProfit: Math.round(totalProfit * 100) / 100,
                discount: discountAmount,
                discountType,
                grandTotal,
                paymentMode: data.paymentMode || 'Cash',
                paymentStatus: data.paymentStatus || 'Paid',
                billedBy: data.billedBy || '',
                syncState: 'pending',
                syncedAt: null
            })

            await invoice.save(session ? { session } : {})

            for (const [productId, quantity] of Object.entries(requestedQtyByProduct)) {
                const updatedProduct = await BillingProduct.findOneAndUpdate(
                    {
                        _id: productId,
                        user: userId,
                        stock: { $gte: quantity }
                    },
                    { $inc: { stock: -quantity } },
                    {
                        new: true,
                        ...(session ? { session } : {})
                    }
                )

                if (!updatedProduct) {
                    throw new ApiError(httpStatus.BAD_REQUEST, "Stock changed during checkout. Please retry billing.")
                }
            }

            const syncEvents = [
                this.buildSaleSyncEvent(invoice, {
                    subtotal: Math.round(subtotal * 100) / 100,
                    totalGst: Math.round(totalGst * 100) / 100,
                    totalProfit: Math.round(totalProfit * 100) / 100
                }),
                ...this.buildInventoryEvents(invoice, requestedQtyByProduct, productMap)
            ]

            if (customerSyncEvent) {
                syncEvents.unshift(customerSyncEvent)
            }

            await SyncService.enqueueMany(userId, syncEvents, {
                session,
                touchState: true
            })

            await ActivityLogService.log(
                userId,
                'CREATE',
                'BillingInvoice',
                invoice._id,
                `Created invoice: ${invoice.invoiceNumber} for ${invoice.customerName}`,
                session ? { session } : {}
            )

            return invoice
        })
    }

    static async getAll(userId, { page = 1, limit = 20, query = '', startDate, endDate }) {
        const filter = { user: userId }

        if (query) {
            filter.$or = [
                { invoiceNumber: { $regex: query, $options: 'i' } },
                { customerName: { $regex: query, $options: 'i' } },
                { customerPhone: { $regex: query, $options: 'i' } }
            ]
        }

        if (startDate || endDate) {
            filter.createdAt = {}
            if (startDate) filter.createdAt.$gte = new Date(startDate)
            if (endDate) {
                const end = new Date(endDate)
                end.setHours(23, 59, 59, 999)
                filter.createdAt.$lte = end
            }
        }

        const skip = (page - 1) * limit
        const [invoices, total] = await Promise.all([
            BillingInvoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            BillingInvoice.countDocuments(filter)
        ])

        return { invoices, total, page, totalPages: Math.ceil(total / limit) }
    }

    static async getById(userId, id) {
        return BillingInvoice.findOne({ _id: id, user: userId })
            .populate('customer', 'name phone email')
    }

    static async getDashboardStats(userId) {
        const userObjectId = new mongoose.Types.ObjectId(userId)
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const startOfYesterday = new Date(startOfToday)
        startOfYesterday.setDate(startOfYesterday.getDate() - 1)

        const periods = [
            { label: 'Today', start: startOfToday, end: now },
            { label: 'Yesterday', start: startOfYesterday, end: startOfToday },
            { label: 'Last 7 Days', start: new Date(now - 7 * 24 * 60 * 60 * 1000), end: now },
            { label: 'Last 14 Days', start: new Date(now - 14 * 24 * 60 * 60 * 1000), end: now },
            { label: 'Last 21 Days', start: new Date(now - 21 * 24 * 60 * 60 * 1000), end: now },
            { label: 'Last 28 Days', start: new Date(now - 28 * 24 * 60 * 60 * 1000), end: now }
        ]

        const stats = await Promise.all(periods.map(async (period) => {
            const match = {
                user: userObjectId,
                createdAt: { $gte: period.start, $lte: period.end }
            }

            const result = await BillingInvoice.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: '$paymentMode',
                        total: { $sum: '$grandTotal' },
                        count: { $sum: 1 }
                    }
                }
            ])

            const cash = result.find((entry) => entry._id === 'Cash')
            const online = result.find((entry) => entry._id === 'Online')

            return {
                label: period.label,
                cash: cash?.total || 0,
                online: online?.total || 0,
                cashCount: cash?.count || 0,
                onlineCount: online?.count || 0
            }
        }))

        const totalInvoices = await BillingInvoice.countDocuments({ user: userObjectId })
        return { stats, totalInvoices }
    }

    static async getReportData(userId, startDate, endDate) {
        const userObjectId = new mongoose.Types.ObjectId(userId)
        const start = new Date(startDate)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        const baseMatch = {
            user: userObjectId,
            createdAt: { $gte: start, $lte: end }
        }

        const [summary] = await BillingInvoice.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$grandTotal' },
                    totalInvoices: { $sum: 1 },
                    totalGst: { $sum: '$totalGst' },
                    totalSubtotal: { $sum: '$subtotal' },
                    totalProfit: { $sum: '$totalProfit' }
                }
            }
        ])

        const revenueSummary = summary || { totalRevenue: 0, totalInvoices: 0, totalGst: 0, totalSubtotal: 0, totalProfit: 0 }
        revenueSummary.avgOrderValue = revenueSummary.totalInvoices > 0
            ? Math.round((revenueSummary.totalRevenue / revenueSummary.totalInvoices) * 100) / 100
            : 0

        const [lifetimeSummary] = await BillingInvoice.aggregate([
            { $match: { user: userObjectId } },
            {
                $group: {
                    _id: null,
                    lifetimeProfit: { $sum: '$totalProfit' }
                }
            }
        ])
        revenueSummary.lifetimeProfit = lifetimeSummary?.lifetimeProfit || 0

        const dailyTrend = await BillingInvoice.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$grandTotal' },
                    invoiceCount: { $sum: 1 },
                    profit: { $sum: '$totalProfit' }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: '$_id', revenue: 1, invoiceCount: 1, profit: 1 } }
        ])

        const topProducts = await BillingInvoice.aggregate([
            { $match: baseMatch },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product',
                    name: { $first: '$items.name' },
                    totalQty: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.lineTotal' },
                    returnedQty: { $sum: { $ifNull: ['$items.returnedQuantity', 0] } }
                }
            },
            { $sort: { totalQty: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, productId: '$_id', name: 1, totalQty: 1, totalRevenue: 1, returnedQty: 1 } }
        ])

        const topCustomers = await BillingInvoice.aggregate([
            { $match: { ...baseMatch, customer: { $ne: null } } },
            {
                $group: {
                    _id: '$customer',
                    name: { $first: '$customerName' },
                    phone: { $first: '$customerPhone' },
                    totalSpent: { $sum: '$grandTotal' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, customerId: '$_id', name: 1, phone: 1, totalSpent: 1, orderCount: 1 } }
        ])

        const paymentSplit = await BillingInvoice.aggregate([
            { $match: baseMatch },
            {
                $group: {
                    _id: '$paymentMode',
                    total: { $sum: '$grandTotal' },
                    count: { $sum: 1 }
                }
            }
        ])

        const cashData = paymentSplit.find((payment) => payment._id === 'Cash') || { total: 0, count: 0 }
        const onlineData = paymentSplit.find((payment) => payment._id === 'Online') || { total: 0, count: 0 }

        return {
            revenueSummary,
            dailyTrend,
            topProducts,
            topCustomers,
            paymentSplit: {
                cash: { total: cashData.total, count: cashData.count },
                online: { total: onlineData.total, count: onlineData.count }
            }
        }
    }

    static async updatePayment(userId, id, { paymentMode, paymentStatus }) {
        const invoice = await BillingInvoice.findOneAndUpdate(
            { _id: id, user: userId },
            { paymentMode, paymentStatus, syncState: 'pending' },
            { new: true }
        )

        if (invoice) {
            await ActivityLogService.log(
                userId,
                'UPDATE_PAYMENT',
                'BillingInvoice',
                id,
                `Updated payment for ${invoice.invoiceNumber}: ${paymentStatus} via ${paymentMode}`
            )

            await SyncService.enqueue(userId, {
                entityType: 'sale',
                entityId: invoice._id,
                operation: 'update',
                sourceModule: 'billing',
                payload: {
                    billId: invoice.invoiceNumber,
                    invoiceId: invoice._id,
                    paymentMode: invoice.paymentMode,
                    paymentStatus: invoice.paymentStatus,
                    grandTotal: invoice.grandTotal,
                    updatedAt: new Date()
                },
                metadata: {
                    invoiceNumber: invoice.invoiceNumber,
                    localOnly: true,
                    syncVersion: 1,
                    updateType: 'payment'
                }
            })
        }

        return invoice
    }

    static async returnItems(userId, id, itemsToReturn) {
        if (!Array.isArray(itemsToReturn) || itemsToReturn.length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "At least one return item is required")
        }

        return this.runWithOptionalTransaction(async (session) => {
            const invoiceQuery = BillingInvoice.findOne({ _id: id, user: userId })
            const invoice = await withOptionalSession(invoiceQuery, session)
            if (!invoice) {
                throw new ApiError(httpStatus.NOT_FOUND, "Invoice not found")
            }

            if (invoice.status === 'voided') {
                throw new ApiError(httpStatus.BAD_REQUEST, "Cannot return items from a voided invoice")
            }

            let refundSubtotal = 0
            let refundGst = 0
            let refundProfit = 0

            const productIds = [...new Set(itemsToReturn.map((item) => String(item.productId || '')))]
            const productsQuery = BillingProduct.find({
                user: userId,
                _id: { $in: productIds }
            }).select('_id name purchasePrice')
            const productsInfo = await withOptionalSession(productsQuery, session)
            const purchasePriceMap = buildProductMap(productsInfo)

            // Collect sync events for inventory restoration
            const inventorySyncEvents = []
            const returnedItemsSummary = []

            for (const reqItem of itemsToReturn) {
                const productId = String(reqItem.productId || '')
                const quantity = Number(reqItem.quantity) || 0
                const invoiceItem = invoice.items.find((item) => item.product.toString() === productId)

                if (!invoiceItem) {
                    throw new ApiError(httpStatus.BAD_REQUEST, `Product ${productId} not found in this invoice`)
                }

                if (quantity <= 0) {
                    throw new ApiError(httpStatus.BAD_REQUEST, `Return quantity must be greater than 0 for ${invoiceItem.name}`)
                }

                const maxReturnable = invoiceItem.quantity - (invoiceItem.returnedQuantity || 0)
                if (quantity > maxReturnable) {
                    throw new ApiError(
                        httpStatus.BAD_REQUEST,
                        `Cannot return ${quantity} of ${invoiceItem.name}. Only ${maxReturnable} available to return.`
                    )
                }

                const lineSubtotal = invoiceItem.price * quantity
                const gstAmount = (lineSubtotal * (invoiceItem.gstPercent || 0)) / 100
                const purchasePrice = purchasePriceMap.get(productId)?.purchasePrice || 0
                const itemProfitToRefund = (invoiceItem.price - purchasePrice) * quantity

                refundSubtotal += lineSubtotal
                refundGst += gstAmount
                refundProfit += itemProfitToRefund

                invoiceItem.returnedQuantity = (invoiceItem.returnedQuantity || 0) + quantity
                invoiceItem.profit = (invoiceItem.profit || 0) - itemProfitToRefund

                await BillingProduct.findOneAndUpdate(
                    { _id: productId, user: userId },
                    { $inc: { stock: quantity } },
                    session ? { session } : {}
                )

                const product = purchasePriceMap.get(productId)
                inventorySyncEvents.push({
                    entityType: 'inventory_movement',
                    entityId: productId,
                    operation: 'create',
                    sourceModule: 'billing',
                    payload: {
                        productId,
                        productName: product?.name || invoiceItem.name,
                        quantityDelta: quantity, // positive: stock restored
                        movementType: 'return',
                        refType: 'BillingInvoice',
                        refId: invoice._id,
                        refNumber: invoice.invoiceNumber,
                        createdAt: new Date()
                    },
                    metadata: {
                        invoiceNumber: invoice.invoiceNumber,
                        localOnly: true,
                        syncVersion: 1
                    }
                })

                returnedItemsSummary.push({
                    productId,
                    productName: invoiceItem.name,
                    quantity,
                    refundAmount: Math.round((lineSubtotal + gstAmount) * 100) / 100
                })
            }

            invoice.subtotal -= refundSubtotal
            invoice.totalGst -= refundGst
            invoice.grandTotal -= (refundSubtotal + refundGst)
            invoice.totalProfit = (invoice.totalProfit || 0) - refundProfit

            invoice.subtotal = Math.round(invoice.subtotal * 100) / 100
            invoice.totalGst = Math.round(invoice.totalGst * 100) / 100
            invoice.grandTotal = Math.round(invoice.grandTotal * 100) / 100
            invoice.totalProfit = Math.round(invoice.totalProfit * 100) / 100

            invoice.syncState = 'pending'
            await invoice.save(session ? { session } : {})

            // Enqueue sale:return event + inventory movements
            const syncEvents = [
                {
                    entityType: 'sale',
                    entityId: invoice._id,
                    operation: 'return',
                    sourceModule: 'billing',
                    payload: {
                        billId: invoice.invoiceNumber,
                        invoiceId: invoice._id,
                        returnedItems: returnedItemsSummary,
                        subtotal: invoice.subtotal,
                        totalGst: invoice.totalGst,
                        grandTotal: invoice.grandTotal,
                        totalProfit: invoice.totalProfit,
                        updatedAt: new Date()
                    },
                    metadata: {
                        invoiceNumber: invoice.invoiceNumber,
                        localOnly: true,
                        syncVersion: 1
                    }
                },
                ...inventorySyncEvents
            ]

            await SyncService.enqueueMany(userId, syncEvents, {
                session,
                touchState: true
            })

            await ActivityLogService.log(
                userId,
                'RETURN_ITEMS',
                'BillingInvoice',
                id,
                `Returned items in ${invoice.invoiceNumber}. Total items in invoice: ${invoice.items.length}`,
                session ? { session } : {}
            )

            return invoice
        })
    }

    static async addItems(userId, id, itemsToAdd) {
        if (!Array.isArray(itemsToAdd) || itemsToAdd.length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "At least one item is required")
        }

        return this.runWithOptionalTransaction(async (session) => {
            const invoiceQuery = BillingInvoice.findOne({ _id: id, user: userId })
            const invoice = await withOptionalSession(invoiceQuery, session)
            if (!invoice) {
                throw new ApiError(httpStatus.NOT_FOUND, "Invoice not found")
            }

            if (invoice.status === 'voided') {
                throw new ApiError(httpStatus.BAD_REQUEST, "Cannot add items to a voided invoice")
            }

            const normalizedItems = itemsToAdd.filter((item) => (Number(item.quantity) || 0) > 0)
            if (!normalizedItems.length) {
                throw new ApiError(httpStatus.BAD_REQUEST, "At least one item must have quantity greater than 0")
            }

            let additionalSubtotal = 0
            let additionalGst = 0
            let additionalProfit = 0

            const requestedQtyByProduct = buildRequestedQuantityMap(normalizedItems, 'product')
            const productIds = Object.keys(requestedQtyByProduct)
            const productsQuery = BillingProduct.find({
                user: userId,
                isActive: true,
                _id: { $in: productIds }
            }).select('_id name barcode purchasePrice stock')
            const productsInfo = await withOptionalSession(productsQuery, session)
            const productMap = buildProductMap(productsInfo)

            if (productMap.size !== productIds.length) {
                throw new ApiError(httpStatus.BAD_REQUEST, "One or more billing products were not found")
            }

            Object.entries(requestedQtyByProduct).forEach(([productId, requestedQty]) => {
                const product = productMap.get(productId)
                if (!product) {
                    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid billing product selected")
                }

                if (requestedQty <= 0) {
                    throw new ApiError(httpStatus.BAD_REQUEST, `Quantity must be greater than 0 for ${product.name}`)
                }

                if (product.stock < requestedQty) {
                    throw new ApiError(
                        httpStatus.BAD_REQUEST,
                        `${product.name} has only ${product.stock} units in stock`
                    )
                }
            })

            for (const reqItem of normalizedItems) {
                const productId = String(reqItem.product)
                const product = productMap.get(productId)
                const quantity = Number(reqItem.quantity) || 0
                const price = Number(reqItem.price) || 0
                const gstPercent = Number(reqItem.gstPercent) || 0

                if (!product) {
                    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid billing product selected")
                }

                if (price < 0 || gstPercent < 0) {
                    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid pricing for ${product.name}`)
                }

                const lineSubtotal = price * quantity
                const gstAmount = (lineSubtotal * gstPercent) / 100
                const lineTotal = lineSubtotal + gstAmount
                const purchasePrice = product.purchasePrice || 0
                const addedItemProfit = (price - purchasePrice) * quantity

                additionalSubtotal += lineSubtotal
                additionalGst += gstAmount
                additionalProfit += addedItemProfit

                const existingItemIndex = invoice.items.findIndex((item) => item.product.toString() === productId)
                if (existingItemIndex > -1) {
                    invoice.items[existingItemIndex].quantity += quantity
                    invoice.items[existingItemIndex].gstAmount += gstAmount
                    invoice.items[existingItemIndex].lineTotal += lineTotal
                    invoice.items[existingItemIndex].profit = (invoice.items[existingItemIndex].profit || 0) + addedItemProfit
                    invoice.items[existingItemIndex].gstAmount = Math.round(invoice.items[existingItemIndex].gstAmount * 100) / 100
                    invoice.items[existingItemIndex].lineTotal = Math.round(invoice.items[existingItemIndex].lineTotal * 100) / 100
                    invoice.items[existingItemIndex].profit = Math.round(invoice.items[existingItemIndex].profit * 100) / 100
                } else {
                    invoice.items.push({
                        product: product._id,
                        name: reqItem.name || product.name,
                        barcode: reqItem.barcode || product.barcode || '',
                        quantity,
                        price,
                        gstPercent,
                        gstAmount: Math.round(gstAmount * 100) / 100,
                        lineTotal: Math.round(lineTotal * 100) / 100,
                        profit: Math.round(addedItemProfit * 100) / 100,
                        returnedQuantity: 0
                    })
                }
            }

            invoice.subtotal += additionalSubtotal
            invoice.totalGst += additionalGst
            invoice.grandTotal += (additionalSubtotal + additionalGst)
            invoice.totalProfit = (invoice.totalProfit || 0) + additionalProfit

            invoice.subtotal = Math.round(invoice.subtotal * 100) / 100
            invoice.totalGst = Math.round(invoice.totalGst * 100) / 100
            invoice.grandTotal = Math.round(invoice.grandTotal * 100) / 100
            invoice.totalProfit = Math.round(invoice.totalProfit * 100) / 100

            invoice.syncState = 'pending'
            await invoice.save(session ? { session } : {})

            for (const [productId, quantity] of Object.entries(requestedQtyByProduct)) {
                const updatedProduct = await BillingProduct.findOneAndUpdate(
                    {
                        _id: productId,
                        user: userId,
                        stock: { $gte: quantity }
                    },
                    { $inc: { stock: -quantity } },
                    {
                        new: true,
                        ...(session ? { session } : {})
                    }
                )

                if (!updatedProduct) {
                    throw new ApiError(httpStatus.BAD_REQUEST, "Stock changed during add-items. Please retry.")
                }
            }

            // Enqueue sale:update + inventory_movement events
            const inventoryEvents = Object.entries(requestedQtyByProduct).map(([productId, quantity]) => {
                const product = productMap.get(productId)
                return {
                    entityType: 'inventory_movement',
                    entityId: productId,
                    operation: 'create',
                    sourceModule: 'billing',
                    payload: {
                        productId,
                        productName: product?.name || '',
                        quantityDelta: -quantity,
                        movementType: 'sale',
                        refType: 'BillingInvoice',
                        refId: invoice._id,
                        refNumber: invoice.invoiceNumber,
                        createdAt: new Date()
                    },
                    metadata: {
                        invoiceNumber: invoice.invoiceNumber,
                        localOnly: true,
                        syncVersion: 1
                    }
                }
            })

            const syncEvents = [
                {
                    entityType: 'sale',
                    entityId: invoice._id,
                    operation: 'update',
                    sourceModule: 'billing',
                    payload: {
                        billId: invoice.invoiceNumber,
                        invoiceId: invoice._id,
                        items: invoice.items,
                        subtotal: invoice.subtotal,
                        totalGst: invoice.totalGst,
                        grandTotal: invoice.grandTotal,
                        totalProfit: invoice.totalProfit,
                        updatedAt: new Date()
                    },
                    metadata: {
                        invoiceNumber: invoice.invoiceNumber,
                        localOnly: true,
                        syncVersion: 1,
                        updateType: 'add_items'
                    }
                },
                ...inventoryEvents
            ]

            await SyncService.enqueueMany(userId, syncEvents, {
                session,
                touchState: true
            })

            await ActivityLogService.log(
                userId,
                'ADD_ITEMS',
                'BillingInvoice',
                id,
                `Added items to ${invoice.invoiceNumber}. Total items in invoice: ${invoice.items.length}`,
                session ? { session } : {}
            )

            return invoice
        })
    }

    /**
     * Void an invoice. Business rules:
     * - Only admin/manager can void (enforced at route level).
     * - Only invoices with paymentStatus === 'Unpaid' can be voided.
     * - All non-returned quantities are restored to stock.
     * - Invoice status is set to 'voided', grandTotal/subtotal/etc zeroed.
     * - Sync events: sale:void + inventory_movement per restored item.
     */
    static async voidInvoice(userId, id) {
        return this.runWithOptionalTransaction(async (session) => {
            const invoiceQuery = BillingInvoice.findOne({ _id: id, user: userId })
            const invoice = await withOptionalSession(invoiceQuery, session)
            if (!invoice) {
                throw new ApiError(httpStatus.NOT_FOUND, "Invoice not found")
            }

            if (invoice.status === 'voided') {
                throw new ApiError(httpStatus.BAD_REQUEST, "Invoice is already voided")
            }

            if (invoice.paymentStatus !== 'Unpaid') {
                throw new ApiError(httpStatus.BAD_REQUEST, "Only unpaid invoices can be voided")
            }

            const inventorySyncEvents = []

            // Restore stock for all non-returned quantities
            for (const item of invoice.items) {
                const restoreQty = item.quantity - (item.returnedQuantity || 0)
                if (restoreQty <= 0) {
                    continue
                }

                await BillingProduct.findOneAndUpdate(
                    { _id: item.product, user: userId },
                    { $inc: { stock: restoreQty } },
                    session ? { session } : {}
                )

                inventorySyncEvents.push({
                    entityType: 'inventory_movement',
                    entityId: item.product,
                    operation: 'create',
                    sourceModule: 'billing',
                    payload: {
                        productId: item.product.toString(),
                        productName: item.name,
                        quantityDelta: restoreQty, // positive: stock restored
                        movementType: 'void',
                        refType: 'BillingInvoice',
                        refId: invoice._id,
                        refNumber: invoice.invoiceNumber,
                        createdAt: new Date()
                    },
                    metadata: {
                        invoiceNumber: invoice.invoiceNumber,
                        localOnly: true,
                        syncVersion: 1
                    }
                })
            }

            // Zero out invoice totals and mark voided
            const previousGrandTotal = invoice.grandTotal
            invoice.status = 'voided'
            invoice.subtotal = 0
            invoice.totalGst = 0
            invoice.grandTotal = 0
            invoice.totalProfit = 0
            invoice.syncState = 'pending'

            await invoice.save(session ? { session } : {})

            const syncEvents = [
                {
                    entityType: 'sale',
                    entityId: invoice._id,
                    operation: 'void',
                    sourceModule: 'billing',
                    payload: {
                        billId: invoice.invoiceNumber,
                        invoiceId: invoice._id,
                        previousGrandTotal,
                        items: invoice.items,
                        voidedAt: new Date()
                    },
                    metadata: {
                        invoiceNumber: invoice.invoiceNumber,
                        localOnly: true,
                        syncVersion: 1
                    }
                },
                ...inventorySyncEvents
            ]

            await SyncService.enqueueMany(userId, syncEvents, {
                session,
                touchState: true
            })

            await ActivityLogService.log(
                userId,
                'VOID',
                'BillingInvoice',
                id,
                `Voided invoice ${invoice.invoiceNumber}. Previous total: ${previousGrandTotal}`,
                session ? { session } : {}
            )

            return invoice
        })
    }

    static async getByCustomer(userId, customerId) {
        return BillingInvoice.find({ user: userId, customer: customerId })
            .sort({ createdAt: -1 })
            .limit(50)
            .select('invoiceNumber grandTotal paymentMode paymentStatus createdAt items discount')
    }
}

module.exports = BillingInvoiceService
