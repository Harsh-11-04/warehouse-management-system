const mongoose = require("mongoose")
const httpStatus = require("http-status")
const ApiError = require("../utils/ApiError")
const {
    UserModel,
    CloudShopModel,
    CloudProductModel,
    CloudInventoryModel,
    CloudCustomerModel,
    CloudSaleModel,
    CloudInventoryMovementModel,
    CloudSyncAuditModel
} = require("../models")

const NON_TRANSACTIONAL_MONGO_ERRORS = [
    "Transaction numbers are only allowed on a replica set member or mongos",
    "replica set",
    "Standalone servers do not support transactions"
]

const normalizeString = (value, fallback = "") => {
    if (value === null || value === undefined) {
        return fallback
    }

    if (typeof value === "string") {
        return value
    }

    if (typeof value?.toString === "function") {
        return value.toString()
    }

    return String(value)
}

const normalizeNumber = (value, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeDate = (value, fallback = new Date()) => {
    if (!value) {
        return fallback
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

const normalizeShopCode = (value) => normalizeString(value).trim().toUpperCase()

const buildDefaultShopName = (user) => {
    const trimmedName = normalizeString(user?.name).trim()
    if (trimmedName) {
        return `${trimmedName} Shop`
    }

    return `Shop ${normalizeString(user?._id).slice(-8).toUpperCase()}`
}

const buildShopCodeCandidates = (user) => {
    const suffix = normalizeString(user?._id).slice(-8).toUpperCase() || Math.random().toString(36).slice(2, 10).toUpperCase()
    const slug = normalizeString(user?.name)
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toUpperCase()
        .slice(0, 12)

    const candidates = new Set([
        `SHOP-${suffix}`,
        slug ? `${slug}-${suffix}` : "",
        `SHOP-${suffix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    ].filter(Boolean).map((item) => normalizeShopCode(item)))

    return [...candidates]
}

class CloudSyncService {
    static async getShopContext(userId, session = null) {
        const shop = await this.ensureShopForUser(userId, session)

        return {
            shop,
            shopId: new mongoose.Types.ObjectId(shop._id),
            timeZone: shop.timezone || "Asia/Kolkata"
        }
    }

    static isTransactionFallbackError(error) {
        return NON_TRANSACTIONAL_MONGO_ERRORS.some((message) =>
            String(error?.message || "").toLowerCase().includes(message.toLowerCase())
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

    static async assignUserToShop(userId, shopId, session = null) {
        if (!userId || !shopId) {
            return null
        }

        return UserModel.findByIdAndUpdate(
            userId,
            { $set: { shopId } },
            {
                new: true,
                ...(session ? { session } : {})
            }
        )
    }

    static async getShopByCode(shopCode, session = null) {
        const normalizedCode = normalizeShopCode(shopCode)
        if (!normalizedCode) {
            return null
        }

        const query = CloudShopModel.findOne({
            shopCode: normalizedCode,
            status: { $ne: "inactive" }
        })

        return session ? query.session(session) : query
    }

    static async ensureShopForUser(userId, session = null) {
        const userQuery = UserModel.findById(userId).select("name email shopId")
        const user = session ? await userQuery.session(session) : await userQuery
        if (!user) {
            throw new ApiError(httpStatus.NOT_FOUND, "User not found")
        }

        if (user.shopId) {
            const shopByMembershipQuery = CloudShopModel.findById(user.shopId)
            const shopByMembership = session ? await shopByMembershipQuery.session(session) : await shopByMembershipQuery
            if (shopByMembership) {
                return shopByMembership
            }
        }

        const legacyShopQuery = CloudShopModel.findOne({ ownerUser: userId })
        const legacyShop = session ? await legacyShopQuery.session(session) : await legacyShopQuery

        if (legacyShop) {
            if (!user.shopId || normalizeString(user.shopId) !== normalizeString(legacyShop._id)) {
                await this.assignUserToShop(userId, legacyShop._id, session)
            }

            return legacyShop
        }

        const candidates = buildShopCodeCandidates(user)
        let createdShop = null

        for (const candidate of candidates) {
            const shop = new CloudShopModel({
                ownerUser: userId,
                shopCode: candidate,
                name: buildDefaultShopName(user),
                metadata: {
                    sourceUserEmail: user?.email || ""
                }
            })

            try {
                await shop.save(session ? { session } : {})
                createdShop = shop
                break
            } catch (error) {
                if (error?.code !== 11000) {
                    throw error
                }

                const retryOwnerQuery = CloudShopModel.findOne({ ownerUser: userId })
                const retryOwnerShop = session ? await retryOwnerQuery.session(session) : await retryOwnerQuery
                if (retryOwnerShop) {
                    createdShop = retryOwnerShop
                    break
                }
            }
        }

        if (!createdShop) {
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Unable to create a cloud shop for this user")
        }

        await this.assignUserToShop(userId, createdShop._id, session)

        return createdShop
    }

    static async joinUserToShop(userId, shopCode, session = null) {
        const shop = await this.getShopByCode(shopCode, session)
        if (!shop) {
            throw new ApiError(httpStatus.NOT_FOUND, "Shop code not found")
        }

        await this.assignUserToShop(userId, shop._id, session)

        return shop
    }

    static formatPublicShop(shop) {
        if (!shop) {
            return null
        }

        return {
            id: shop._id,
            code: shop.shopCode,
            name: shop.name,
            timezone: shop.timezone || "Asia/Kolkata",
            currency: shop.currency || "INR",
            status: shop.status || "active"
        }
    }

    static validateEvent(event) {
        if (!event?.eventId) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Each sync event must include eventId")
        }

        if (!event?.userId) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Sync event ${event.eventId} is missing userId`)
        }

        if (!event?.entityType) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Sync event ${event.eventId} is missing entityType`)
        }

        if (!event?.operation) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Sync event ${event.eventId} is missing operation`)
        }

        if (event.payload === undefined) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Sync event ${event.eventId} is missing payload`)
        }
    }

    static async markAuditFailed(auditContext, error) {
        if (!auditContext?.shopId || !auditContext?.eventId || !auditContext?.sourceUserId) {
            return
        }

        await CloudSyncAuditModel.findOneAndUpdate(
            {
                shopId: auditContext.shopId,
                eventId: auditContext.eventId
            },
            {
                $set: {
                    sourceUserId: auditContext.sourceUserId,
                    deviceId: auditContext.deviceId || "",
                    entityType: auditContext.entityType || "unknown",
                    operation: auditContext.operation || "unknown",
                    status: "failed",
                    error: error?.message || "Cloud sync failed",
                    payloadSnapshot: auditContext.payloadSnapshot || {},
                    receivedAt: auditContext.receivedAt || new Date()
                }
            },
            {
                upsert: true,
                new: true
            }
        )
    }

    static buildAuditContext(shopId, event, deviceId) {
        return {
            shopId,
            eventId: normalizeString(event.eventId),
            sourceUserId: event.userId,
            deviceId: deviceId || normalizeString(event.deviceId),
            entityType: normalizeString(event.entityType),
            operation: normalizeString(event.operation),
            payloadSnapshot: event.payload || {},
            receivedAt: new Date()
        }
    }

    static async processCustomerEvent(shop, event, session = null) {
        const payload = event.payload || {}
        const externalCustomerId = normalizeString(payload.customerId || event.entityId)

        if (!externalCustomerId) {
            return { status: "ignored" }
        }

        await CloudCustomerModel.findOneAndUpdate(
            {
                shopId: shop._id,
                externalCustomerId
            },
            {
                $set: {
                    name: normalizeString(payload.name, "Walk-in"),
                    phone: normalizeString(payload.phone),
                    email: normalizeString(payload.email),
                    address: normalizeString(payload.address),
                    gstNumber: normalizeString(payload.gstNumber),
                    hasCard: Boolean(payload.hasCard),
                    isActive: payload.isActive !== false,
                    sourceUpdatedAt: normalizeDate(payload.updatedAt, new Date())
                }
            },
            {
                upsert: true,
                new: true,
                ...(session ? { session } : {})
            }
        )

        return { status: "processed" }
    }

    static async upsertCloudProduct(shop, itemLike, session = null) {
        const externalProductId = normalizeString(itemLike.productId || itemLike.externalProductId || itemLike.product || itemLike.entityId)
        if (!externalProductId) {
            return null
        }

        await CloudProductModel.findOneAndUpdate(
            {
                shopId: shop._id,
                externalProductId
            },
            {
                $set: {
                    barcode: normalizeString(itemLike.barcode),
                    name: normalizeString(itemLike.name || itemLike.productName, "Unnamed Product"),
                    category: normalizeString(itemLike.category),
                    purchasePrice: normalizeNumber(itemLike.purchasePrice),
                    mrp: normalizeNumber(itemLike.mrp),
                    sellingPrice: normalizeNumber(itemLike.price ?? itemLike.sellingPrice),
                    cardPrice: normalizeNumber(itemLike.cardPrice),
                    gstPercent: normalizeNumber(itemLike.gstPercent),
                    active: itemLike.isActive !== false,
                    sourceUpdatedAt: normalizeDate(itemLike.updatedAt, new Date())
                },
                $inc: {
                    cloudVersion: 1
                }
            },
            {
                upsert: true,
                new: true,
                ...(session ? { session } : {})
            }
        )

        return externalProductId
    }

    static async processSaleEvent(shop, event, deviceId, session = null) {
        const payload = event.payload || {}
        const externalBillId = normalizeString(payload.billId || payload.invoiceNumber)

        if (!externalBillId) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Sale event ${event.eventId} is missing billId`)
        }

        const items = Array.isArray(payload.items) ? payload.items : []
        for (const item of items) {
            await this.upsertCloudProduct(shop, item, session)
        }

        await CloudSaleModel.findOneAndUpdate(
            {
                shopId: shop._id,
                externalBillId
            },
            {
                $set: {
                    eventId: event.eventId,
                    sourceUserId: event.userId,
                    deviceId: deviceId || normalizeString(event.deviceId),
                    externalBillId,
                    localInvoiceId: normalizeString(payload.invoiceId),
                    customer: {
                        customerId: normalizeString(payload.customerId),
                        name: normalizeString(payload.customerName, "Walk-in"),
                        phone: normalizeString(payload.customerPhone)
                    },
                    items: items.map((item) => ({
                        externalProductId: normalizeString(item.product || item.productId),
                        name: normalizeString(item.name),
                        barcode: normalizeString(item.barcode),
                        quantity: normalizeNumber(item.quantity),
                        price: normalizeNumber(item.price),
                        gstPercent: normalizeNumber(item.gstPercent),
                        gstAmount: normalizeNumber(item.gstAmount),
                        lineTotal: normalizeNumber(item.lineTotal)
                    })),
                    subtotal: normalizeNumber(payload.subtotal),
                    taxTotal: normalizeNumber(payload.totalGst),
                    discount: normalizeNumber(payload.discount),
                    discountType: normalizeString(payload.discountType, "flat"),
                    grandTotal: normalizeNumber(payload.grandTotal),
                    payments: [{
                        mode: normalizeString(payload.paymentMode),
                        amount: normalizeNumber(payload.grandTotal),
                        reference: ""
                    }],
                    paymentMode: normalizeString(payload.paymentMode),
                    paymentStatus: normalizeString(payload.paymentStatus),
                    billedBy: normalizeString(payload.billedBy),
                    status: "completed",
                    sourceCreatedAt: normalizeDate(payload.createdAt, new Date()),
                    syncedAt: new Date()
                }
            },
            {
                upsert: true,
                new: true,
                ...(session ? { session } : {})
            }
        )

        return { status: "processed" }
    }

    static async processInventoryMovementEvent(shop, event, deviceId, session = null) {
        const payload = event.payload || {}
        const externalProductId = normalizeString(payload.productId || event.entityId)

        if (!externalProductId) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Inventory event ${event.eventId} is missing productId`)
        }

        await this.upsertCloudProduct(shop, {
            productId: externalProductId,
            productName: payload.productName,
            name: payload.productName
        }, session)

        await CloudInventoryMovementModel.findOneAndUpdate(
            {
                shopId: shop._id,
                eventId: event.eventId
            },
            {
                $set: {
                    sourceUserId: event.userId,
                    deviceId: deviceId || normalizeString(event.deviceId),
                    externalProductId,
                    productName: normalizeString(payload.productName),
                    quantityDelta: normalizeNumber(payload.quantityDelta),
                    movementType: normalizeString(payload.movementType, "adjust"),
                    refType: normalizeString(payload.refType),
                    refId: normalizeString(payload.refId),
                    refNumber: normalizeString(payload.refNumber),
                    sourceCreatedAt: normalizeDate(payload.createdAt, new Date()),
                    syncedAt: new Date()
                }
            },
            {
                upsert: true,
                new: true,
                ...(session ? { session } : {})
            }
        )

        await CloudInventoryModel.findOneAndUpdate(
            {
                shopId: shop._id,
                externalProductId
            },
            {
                $setOnInsert: {
                    reserved: 0,
                    reorderLevel: 0
                },
                $inc: {
                    onHand: normalizeNumber(payload.quantityDelta),
                    version: 1
                },
                $set: {
                    sourceUpdatedAt: normalizeDate(payload.createdAt, new Date()),
                    lastMovementAt: normalizeDate(payload.createdAt, new Date())
                }
            },
            {
                upsert: true,
                new: true,
                ...(session ? { session } : {})
            }
        )

        return { status: "processed" }
    }

    static async processProductEvent(shop, event, session = null) {
        const payload = event.payload || {}
        const externalProductId = await this.upsertCloudProduct(shop, {
            ...payload,
            productId: payload.productId || event.entityId
        }, session)

        if (!externalProductId) {
            return { status: "ignored" }
        }

        if (payload.stock !== undefined || payload.lowStockThreshold !== undefined) {
            await CloudInventoryModel.findOneAndUpdate(
                {
                    shopId: shop._id,
                    externalProductId
                },
                {
                    $setOnInsert: {
                        onHand: normalizeNumber(payload.stock, 0),
                        reserved: 0
                    },
                    $set: {
                        reorderLevel: normalizeNumber(payload.lowStockThreshold, 0),
                        sourceUpdatedAt: normalizeDate(payload.updatedAt, new Date())
                    }
                },
                {
                    upsert: true,
                    new: true,
                    ...(session ? { session } : {})
                }
            )
        }

        return { status: "processed" }
    }

    /**
     * Route events by entityType + operation.
     * Supported combos:
     *   product:create | product:update | product:delete
     *   customer:create | customer:update | customer:delete
     *   sale:create | sale:update | sale:return | sale:void
     *   inventory_movement:create | inventory_movement:adjust
     */
    static async routeEvent(shop, event, deviceId, session = null) {
        const entityType = normalizeString(event.entityType)
        const operation = normalizeString(event.operation)
        const key = `${entityType}:${operation}`

        switch (key) {
        // Product
        case "product:create":
        case "product:update":
            return this.processProductEvent(shop, event, session)
        case "product:delete":
            return this.processProductDeleteEvent(shop, event, session)

        // Customer
        case "customer:create":
        case "customer:update":
            return this.processCustomerEvent(shop, event, session)
        case "customer:delete":
            return this.processCustomerDeleteEvent(shop, event, session)

        // Sale
        case "sale:create":
            return this.processSaleEvent(shop, event, deviceId, session)
        case "sale:update":
            return this.processSaleUpdateEvent(shop, event, deviceId, session)
        case "sale:return":
            return this.processSaleReturnEvent(shop, event, deviceId, session)
        case "sale:void":
            return this.processSaleVoidEvent(shop, event, deviceId, session)

        // Inventory
        case "inventory_movement:create":
            return this.processInventoryMovementEvent(shop, event, deviceId, session)
        case "inventory_movement:adjust":
            return this.processInventoryAdjustEvent(shop, event, deviceId, session)

        default:
            // Fallback: try routing by entityType alone for backward compat
            switch (entityType) {
            case "sale":
                return this.processSaleEvent(shop, event, deviceId, session)
            case "inventory_movement":
                return this.processInventoryMovementEvent(shop, event, deviceId, session)
            case "customer":
                return this.processCustomerEvent(shop, event, session)
            case "product":
                return this.processProductEvent(shop, event, session)
            default:
                return { status: "ignored" }
            }
        }
    }

    // --- Delete handlers (soft-delete) ---

    static async processProductDeleteEvent(shop, event, session = null) {
        const payload = event.payload || {}
        const externalProductId = normalizeString(payload.productId || event.entityId)
        if (!externalProductId) {
            return { status: "ignored" }
        }

        await CloudProductModel.findOneAndUpdate(
            { shopId: shop._id, externalProductId },
            {
                $set: {
                    active: false,
                    sourceUpdatedAt: normalizeDate(payload.updatedAt, new Date())
                },
                $inc: { cloudVersion: 1 }
            },
            {
                upsert: false,
                ...(session ? { session } : {})
            }
        )

        return { status: "processed" }
    }

    static async processCustomerDeleteEvent(shop, event, session = null) {
        const payload = event.payload || {}
        const externalCustomerId = normalizeString(payload.customerId || event.entityId)
        if (!externalCustomerId) {
            return { status: "ignored" }
        }

        await CloudCustomerModel.findOneAndUpdate(
            { shopId: shop._id, externalCustomerId },
            {
                $set: {
                    isActive: false,
                    sourceUpdatedAt: normalizeDate(payload.updatedAt, new Date())
                }
            },
            {
                upsert: false,
                ...(session ? { session } : {})
            }
        )

        return { status: "processed" }
    }

    // --- Sale update/return/void handlers ---

    static async processSaleUpdateEvent(shop, event, deviceId, session = null) {
        const payload = event.payload || {}
        const externalBillId = normalizeString(payload.billId || payload.invoiceNumber)
        if (!externalBillId) {
            return { status: "ignored" }
        }

        // Guard: base sale must exist — if sale:create was delayed, defer this event for retry
        const existingSale = await CloudSaleModel.findOne(
            { shopId: shop._id, externalBillId },
            { _id: 1 },
            { ...(session ? { session } : {}) }
        )
        if (!existingSale) {
            return { status: "deferred", error: `Base sale ${externalBillId} not found yet. Will retry.` }
        }

        const updateFields = {}
        if (payload.paymentMode !== undefined) {
            updateFields.paymentMode = normalizeString(payload.paymentMode)
        }
        if (payload.paymentStatus !== undefined) {
            updateFields.paymentStatus = normalizeString(payload.paymentStatus)
        }
        if (payload.grandTotal !== undefined) {
            updateFields.grandTotal = normalizeNumber(payload.grandTotal)
        }
        if (payload.subtotal !== undefined) {
            updateFields.subtotal = normalizeNumber(payload.subtotal)
        }
        if (payload.totalGst !== undefined) {
            updateFields.taxTotal = normalizeNumber(payload.totalGst)
        }
        if (Array.isArray(payload.items)) {
            updateFields.items = payload.items.map((item) => ({
                externalProductId: normalizeString(item.product || item.productId),
                name: normalizeString(item.name),
                barcode: normalizeString(item.barcode),
                quantity: normalizeNumber(item.quantity),
                price: normalizeNumber(item.price),
                gstPercent: normalizeNumber(item.gstPercent),
                gstAmount: normalizeNumber(item.gstAmount),
                lineTotal: normalizeNumber(item.lineTotal)
            }))
        }

        updateFields.syncedAt = new Date()

        await CloudSaleModel.findOneAndUpdate(
            { shopId: shop._id, externalBillId },
            { $set: updateFields },
            { ...(session ? { session } : {}) }
        )

        return { status: "processed" }
    }

    static async processSaleReturnEvent(shop, event, deviceId, session = null) {
        const payload = event.payload || {}
        const externalBillId = normalizeString(payload.billId || payload.invoiceNumber)
        if (!externalBillId) {
            return { status: "ignored" }
        }

        // Guard: base sale must exist
        const existingSale = await CloudSaleModel.findOne(
            { shopId: shop._id, externalBillId },
            { _id: 1 },
            { ...(session ? { session } : {}) }
        )
        if (!existingSale) {
            return { status: "deferred", error: `Base sale ${externalBillId} not found yet. Will retry.` }
        }

        // Update cloud sale state
        const saleUpdate = {
            status: "returned",
            syncedAt: new Date()
        }
        if (payload.grandTotal !== undefined) {
            saleUpdate.grandTotal = normalizeNumber(payload.grandTotal)
        }
        if (payload.subtotal !== undefined) {
            saleUpdate.subtotal = normalizeNumber(payload.subtotal)
        }
        if (payload.totalGst !== undefined) {
            saleUpdate.taxTotal = normalizeNumber(payload.totalGst)
        }

        await CloudSaleModel.findOneAndUpdate(
            { shopId: shop._id, externalBillId },
            { $set: saleUpdate },
            { ...(session ? { session } : {}) }
        )

        // Inventory reversal is handled by companion inventory_movement events

        return { status: "processed" }
    }

    static async processSaleVoidEvent(shop, event, deviceId, session = null) {
        const payload = event.payload || {}
        const externalBillId = normalizeString(payload.billId || payload.invoiceNumber)
        if (!externalBillId) {
            return { status: "ignored" }
        }

        // Guard: base sale must exist
        const existingSale = await CloudSaleModel.findOne(
            { shopId: shop._id, externalBillId },
            { _id: 1 },
            { ...(session ? { session } : {}) }
        )
        if (!existingSale) {
            return { status: "deferred", error: `Base sale ${externalBillId} not found yet. Will retry.` }
        }

        await CloudSaleModel.findOneAndUpdate(
            { shopId: shop._id, externalBillId },
            {
                $set: {
                    status: "void",
                    grandTotal: 0,
                    subtotal: 0,
                    taxTotal: 0,
                    syncedAt: new Date()
                }
            },
            { ...(session ? { session } : {}) }
        )

        // Inventory restoration is handled by companion inventory_movement events

        return { status: "processed" }
    }

    // --- Inventory adjustment handler ---

    static async processInventoryAdjustEvent(shop, event, deviceId, session = null) {
        const payload = event.payload || {}
        const externalProductId = normalizeString(payload.productId || event.entityId)
        if (!externalProductId) {
            return { status: "ignored" }
        }

        // Record the movement
        await CloudInventoryMovementModel.findOneAndUpdate(
            { shopId: shop._id, eventId: event.eventId },
            {
                $set: {
                    sourceUserId: event.userId,
                    deviceId: deviceId || normalizeString(event.deviceId),
                    externalProductId,
                    productName: normalizeString(payload.productName),
                    quantityDelta: normalizeNumber(payload.quantityDelta),
                    movementType: normalizeString(payload.movementType, "adjustment"),
                    refType: normalizeString(payload.refType),
                    refId: normalizeString(payload.refId),
                    refNumber: normalizeString(payload.refNumber),
                    sourceCreatedAt: normalizeDate(payload.createdAt, new Date()),
                    syncedAt: new Date()
                }
            },
            {
                upsert: true,
                new: true,
                ...(session ? { session } : {})
            }
        )

        // For adjustment, use $set on onHand with the newStock value (absolute), not $inc.
        // Timestamp guard: only apply if event timestamp >= existing sourceUpdatedAt to prevent
        // out-of-order overwrites. A delayed older adjust event must not clobber newer state.
        const newOnHand = payload.newStock !== undefined
            ? normalizeNumber(payload.newStock)
            : undefined

        const eventTimestamp = normalizeDate(payload.createdAt, new Date())

        if (newOnHand !== undefined) {
            // Only update an existing row if this event is at least as recent as the current state.
            // Do not use upsert here: an older event would miss the timestamp filter and then try to
            // insert a duplicate { shopId, externalProductId } row under the unique index.
            const updatedInventory = await CloudInventoryModel.findOneAndUpdate(
                {
                    shopId: shop._id,
                    externalProductId,
                    $or: [
                        { sourceUpdatedAt: { $exists: false } },
                        { sourceUpdatedAt: null },
                        { sourceUpdatedAt: { $lte: eventTimestamp } }
                    ]
                },
                {
                    $set: {
                        onHand: newOnHand,
                        sourceUpdatedAt: eventTimestamp,
                        lastMovementAt: eventTimestamp
                    },
                    $setOnInsert: { reserved: 0, reorderLevel: 0 },
                    $inc: { version: 1 }
                },
                {
                    upsert: false,
                    new: true,
                    ...(session ? { session } : {})
                }
            )

            if (!updatedInventory) {
                const existingInventory = await CloudInventoryModel.findOne(
                    { shopId: shop._id, externalProductId },
                    { _id: 1, sourceUpdatedAt: 1 },
                    { ...(session ? { session } : {}) }
                )

                if (existingInventory) {
                    const currentTimestamp = existingInventory.sourceUpdatedAt
                        ? normalizeDate(existingInventory.sourceUpdatedAt, null)
                        : null

                    if (currentTimestamp && currentTimestamp > eventTimestamp) {
                        return {
                            status: "ignored"
                        }
                    }

                    await CloudInventoryModel.findOneAndUpdate(
                        { shopId: shop._id, externalProductId },
                        {
                            $set: {
                                onHand: newOnHand,
                                sourceUpdatedAt: eventTimestamp,
                                lastMovementAt: eventTimestamp
                            },
                            $inc: { version: 1 }
                        },
                        {
                            new: true,
                            ...(session ? { session } : {})
                        }
                    )
                } else {
                    await CloudInventoryModel.findOneAndUpdate(
                        { shopId: shop._id, externalProductId },
                        {
                            $setOnInsert: { reserved: 0, reorderLevel: 0 },
                            $set: {
                                onHand: newOnHand,
                                sourceUpdatedAt: eventTimestamp,
                                lastMovementAt: eventTimestamp
                            },
                            $inc: { version: 1 }
                        },
                        {
                            upsert: true,
                            new: true,
                            ...(session ? { session } : {})
                        }
                    )
                }
            }
        } else {
            // Fallback to $inc if only delta is provided (always safe for additive deltas)
            await CloudInventoryModel.findOneAndUpdate(
                { shopId: shop._id, externalProductId },
                {
                    $setOnInsert: { reserved: 0, reorderLevel: 0 },
                    $inc: {
                        onHand: normalizeNumber(payload.quantityDelta),
                        version: 1
                    },
                    $set: {
                        sourceUpdatedAt: eventTimestamp,
                        lastMovementAt: eventTimestamp
                    }
                },
                {
                    upsert: true,
                    new: true,
                    ...(session ? { session } : {})
                }
            )
        }

        return { status: "processed" }
    }

    static async ingestEvent(event, deviceId = "") {
        this.validateEvent(event)

        return this.runWithOptionalTransaction(async (session) => {
            const shop = await this.ensureShopForUser(event.userId, session)
            const auditContext = this.buildAuditContext(shop._id, event, deviceId)

            try {
                const existingAuditQuery = CloudSyncAuditModel.findOne({
                    shopId: shop._id,
                    eventId: event.eventId
                })
                const existingAudit = session ? await existingAuditQuery.session(session) : await existingAuditQuery

                if (existingAudit && ["processed", "duplicate", "ignored"].includes(existingAudit.status)) {
                    await CloudSyncAuditModel.findOneAndUpdate(
                        { shopId: shop._id, eventId: event.eventId },
                        {
                            $set: {
                                status: "duplicate",
                                processedAt: new Date(),
                                error: null
                            },
                            $inc: {
                                duplicateCount: 1
                            }
                        },
                        {
                            new: true,
                            ...(session ? { session } : {})
                        }
                    )

                    return {
                        eventId: normalizeString(event.eventId),
                        status: "duplicate",
                        ack: true
                    }
                }

                await CloudSyncAuditModel.findOneAndUpdate(
                    {
                        shopId: shop._id,
                        eventId: event.eventId
                    },
                    {
                        $set: {
                            sourceUserId: event.userId,
                            deviceId: deviceId || normalizeString(event.deviceId),
                            entityType: normalizeString(event.entityType),
                            operation: normalizeString(event.operation),
                            status: "received",
                            error: null,
                            payloadSnapshot: event.payload || {},
                            receivedAt: new Date(),
                            processedAt: null
                        },
                        $setOnInsert: {
                            duplicateCount: 0
                        }
                    },
                    {
                        upsert: true,
                        new: true,
                        ...(session ? { session } : {})
                    }
                )

                const result = await this.routeEvent(shop, event, deviceId, session)

                await CloudSyncAuditModel.findOneAndUpdate(
                    {
                        shopId: shop._id,
                        eventId: event.eventId
                    },
                    {
                        $set: {
                            status: result.status === "ignored" ? "ignored"
                                : result.status === "deferred" ? "failed"
                                : "processed",
                            error: result.error || null,
                            processedAt: new Date()
                        }
                    },
                    {
                        new: true,
                        ...(session ? { session } : {})
                    }
                )

                if (result.status === "deferred") {
                    return {
                        eventId: normalizeString(event.eventId),
                        status: "deferred",
                        ack: false,
                        error: result.error || "Cloud sync deferred"
                    }
                }

                return {
                    eventId: normalizeString(event.eventId),
                    status: result.status || "processed",
                    ack: true
                }
            } catch (error) {
                await this.markAuditFailed(auditContext, error)
                throw error
            }
        })
    }

    static async ingestBulk({ deviceId = "", events = [] }) {
        if (!Array.isArray(events) || !events.length) {
            throw new ApiError(httpStatus.BAD_REQUEST, "At least one sync event is required")
        }

        const ackedEventIds = []
        const failedEvents = []

        for (const event of events) {
            try {
                const result = await this.ingestEvent(event, deviceId)
                if (result.ack) {
                    ackedEventIds.push(result.eventId)
                } else {
                    failedEvents.push({
                        eventId: normalizeString(result?.eventId || event?.eventId),
                        error: result?.error || "Cloud sync deferred"
                    })
                }
            } catch (error) {
                failedEvents.push({
                    eventId: normalizeString(event?.eventId),
                    error: error?.message || "Cloud sync failed"
                })
            }
        }

        return {
            ackedEventIds,
            failedEvents,
            processedCount: events.length,
            successCount: ackedEventIds.length,
            failedCount: failedEvents.length
        }
    }

    static getHealth() {
        return {
            ok: true,
            tokenConfigured: Boolean(process.env.SYNC_AUTH_TOKEN),
            endpoint: "/api/v1/cloud/sync/bulk"
        }
    }
}

module.exports = CloudSyncService
