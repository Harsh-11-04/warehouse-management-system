/**
 * E2E Cloud Sync Validation
 *
 * Validates the real cloud-ingest service logic without requiring a separate HTTP server:
 * 1. Verifies deferred sale updates are NOT acknowledged and remain retryable
 * 2. Verifies stale inventory adjustments are safely ignored without overwriting newer stock
 * 3. Creates fresh offline local billing events
 * 4. Pushes those events through CloudSyncService.ingestBulk()
 * 5. Marks local outbox events synced and verifies cloud collections + audit records
 *
 * Usage: node scripts/e2e-cloud-sync.js
 * Requires: MONGO_URL in .env and at least one user in the database
 */

require("dotenv").config()

const crypto = require("crypto")
const mongoose = require("mongoose")
const { ConnectDB } = require("../src/config/db.config")

const SyncService = require("../src/services/Sync.service")
const CloudSyncService = require("../src/services/CloudSync.service")
const BillingProductService = require("../src/services/BillingProduct.service")
const BillingCustomerService = require("../src/services/BillingCustomer.service")
const BillingInvoiceService = require("../src/services/BillingInvoice.service")
const {
    SyncOutboxModel,
    CloudProductModel,
    CloudInventoryModel,
    CloudCustomerModel,
    CloudSaleModel,
    CloudSyncAuditModel
} = require("../src/models")

const log = (label, data) => console.log(`\n[${label}]`, JSON.stringify(data, null, 2))

const assert = (condition, message) => {
    if (!condition) {
        console.error(`  FAIL: ${message}`)
        process.exit(1)
    }

    console.log(`  PASS: ${message}`)
}

const run = async () => {
    await ConnectDB()
    console.log("Connected to MongoDB\n")

    const UserModel = mongoose.model("user")
    const testUser = await UserModel.findOne({}).select("_id").lean()
    if (!testUser) {
        console.error("No users found in database. Seed a user first.")
        process.exit(1)
    }

    const userId = testUser._id.toString()
    console.log(`Using test user: ${userId}`)

    const shop = await CloudSyncService.ensureShopForUser(userId)
    console.log(`Using cloud shop: ${shop.shopCode}\n`)

    // ========================================
    // A. Deferred cloud sale update must not ack
    // ========================================
    console.log("=== A: Deferred Sale Update ===")
    const fakeBillId = `DEFER-${Date.now()}`
    const deferredEventId = crypto.randomUUID()
    const deferredResult = await CloudSyncService.ingestBulk({
        deviceId: "e2e-cloud-sync",
        events: [{
            eventId: deferredEventId,
            userId,
            entityType: "sale",
            operation: "update",
            payload: {
                billId: fakeBillId,
                paymentMode: "UPI",
                paymentStatus: "Paid",
                updatedAt: new Date()
            },
            metadata: {
                invoiceNumber: fakeBillId
            }
        }]
    })

    assert(deferredResult.ackedEventIds.length === 0, "Deferred sale update is not acknowledged")
    assert(deferredResult.failedEvents.length === 1, "Deferred sale update is returned as failed for retry")

    const deferredAudit = await CloudSyncAuditModel.findOne({
        shopId: shop._id,
        eventId: deferredEventId
    }).lean()
    assert(deferredAudit?.status === "failed", `Deferred audit status is '${deferredAudit?.status}' (expected failed)`)

    // ========================================
    // B. Stale inventory adjust must not overwrite newer cloud stock
    // ========================================
    console.log("\n=== B: Stale Inventory Adjustment ===")
    const staleProductId = `STALE-${Date.now()}`
    const currentTimestamp = new Date()
    await CloudInventoryModel.findOneAndUpdate(
        {
            shopId: shop._id,
            externalProductId: staleProductId
        },
        {
            $set: {
                onHand: 30,
                sourceUpdatedAt: currentTimestamp,
                lastMovementAt: currentTimestamp
            },
            $setOnInsert: {
                reserved: 0,
                reorderLevel: 0
            }
        },
        {
            upsert: true,
            new: true
        }
    )

    const staleAdjustEventId = crypto.randomUUID()
    const staleAdjustResult = await CloudSyncService.ingestBulk({
        deviceId: "e2e-cloud-sync",
        events: [{
            eventId: staleAdjustEventId,
            userId,
            entityType: "inventory_movement",
            operation: "adjust",
            payload: {
                productId: staleProductId,
                productName: "Stale Adjust Test",
                quantityDelta: -10,
                newStock: 20,
                movementType: "adjustment",
                refType: "ManualStockUpdate",
                refId: staleProductId,
                createdAt: new Date(currentTimestamp.getTime() - 60 * 1000)
            },
            metadata: {
                localOnly: true,
                syncVersion: 1
            }
        }]
    })

    assert(staleAdjustResult.ackedEventIds.length === 1, "Stale inventory adjustment is safely acknowledged")
    const staleInventory = await CloudInventoryModel.findOne({
        shopId: shop._id,
        externalProductId: staleProductId
    }).lean()
    assert(staleInventory?.onHand === 30, `Stale adjust left cloud stock at ${staleInventory?.onHand} (expected 30)`)

    const staleAdjustAudit = await CloudSyncAuditModel.findOne({
        shopId: shop._id,
        eventId: staleAdjustEventId
    }).lean()
    assert(staleAdjustAudit?.status === "ignored", `Stale adjust audit status is '${staleAdjustAudit?.status}' (expected ignored)`)

    // ========================================
    // C. Full local -> cloud sync cycle
    // ========================================
    console.log("\n=== C: Full Local -> Cloud Sync ===")
    const startAt = new Date()

    const product = await BillingProductService.create(userId, {
        name: `E2E-Cloud-Product-${Date.now()}`,
        barcode: `E2E${Date.now()}`,
        sellingPrice: 150,
        mrp: 180,
        purchasePrice: 100,
        gstPercent: 18,
        stock: 40
    })

    const customer = await BillingCustomerService.create(userId, {
        name: `E2E-Cloud-Customer-${Date.now()}`,
        phone: `77${Date.now().toString().slice(-8)}`
    })

    const paidInvoice = await BillingInvoiceService.create(userId, {
        customer: customer._id,
        paymentMode: "Cash",
        paymentStatus: "Paid",
        items: [{
            product: product._id,
            name: product.name,
            barcode: product.barcode,
            quantity: 8,
            price: product.sellingPrice,
            gstPercent: product.gstPercent
        }]
    })

    await BillingInvoiceService.returnItems(userId, paidInvoice._id, [
        { productId: product._id.toString(), quantity: 3 }
    ])

    await BillingInvoiceService.updatePayment(userId, paidInvoice._id, {
        paymentMode: "UPI",
        paymentStatus: "Paid"
    })

    const unpaidInvoice = await BillingInvoiceService.create(userId, {
        customer: customer._id,
        paymentMode: "Cash",
        paymentStatus: "Unpaid",
        items: [{
            product: product._id,
            name: product.name,
            barcode: product.barcode,
            quantity: 5,
            price: product.sellingPrice,
            gstPercent: product.gstPercent
        }]
    })

    await BillingInvoiceService.voidInvoice(userId, unpaidInvoice._id)

    const localEvents = await SyncOutboxModel.find({
        user: userId,
        status: "pending",
        createdAt: { $gte: startAt }
    })
        .sort({ createdAt: 1, _id: 1 })
        .lean()

    assert(localEvents.length >= 10, `Created ${localEvents.length} local pending sync events`)

    const cloudResult = await CloudSyncService.ingestBulk({
        deviceId: "e2e-cloud-sync",
        events: localEvents.map((event) => SyncService.serializeEvent(event))
    })

    log("Cloud ingest result", cloudResult)
    assert(cloudResult.failedEvents.length === 0, "Fresh local billing events sync cleanly to cloud")
    assert(cloudResult.ackedEventIds.length === localEvents.length, "All fresh local billing events were acknowledged")

    await SyncService.markEventsSynced(cloudResult.ackedEventIds)

    const syncedCount = await SyncOutboxModel.countDocuments({
        eventId: { $in: localEvents.map((event) => event.eventId) },
        status: "synced"
    })
    assert(syncedCount === localEvents.length, `All ${syncedCount} local events were marked synced`)

    const cloudProduct = await CloudProductModel.findOne({
        shopId: shop._id,
        externalProductId: product._id.toString()
    }).lean()
    assert(!!cloudProduct, "Cloud product created")

    const cloudCustomer = await CloudCustomerModel.findOne({
        shopId: shop._id,
        externalCustomerId: customer._id.toString()
    }).lean()
    assert(!!cloudCustomer, "Cloud customer created")

    const cloudPaidSale = await CloudSaleModel.findOne({
        shopId: shop._id,
        externalBillId: paidInvoice.invoiceNumber
    }).lean()
    assert(!!cloudPaidSale, "Cloud paid sale created")
    assert(cloudPaidSale?.status === "returned", `Paid sale cloud status is '${cloudPaidSale?.status}' (expected returned)`)
    assert(cloudPaidSale?.paymentMode === "UPI", `Paid sale cloud payment mode is '${cloudPaidSale?.paymentMode}' (expected UPI)`)

    const cloudVoidSale = await CloudSaleModel.findOne({
        shopId: shop._id,
        externalBillId: unpaidInvoice.invoiceNumber
    }).lean()
    assert(!!cloudVoidSale, "Cloud unpaid sale created")
    assert(cloudVoidSale?.status === "void", `Unpaid sale cloud status is '${cloudVoidSale?.status}' (expected void)`)
    assert(Number(cloudVoidSale?.grandTotal) === 0, `Voided cloud sale total is ${cloudVoidSale?.grandTotal} (expected 0)`)

    const cloudInventory = await CloudInventoryModel.findOne({
        shopId: shop._id,
        externalProductId: product._id.toString()
    }).lean()
    assert(!!cloudInventory, "Cloud inventory row exists")
    assert(Number(cloudInventory?.onHand) === 35, `Cloud inventory onHand is ${cloudInventory?.onHand} (expected 35)`)

    const auditCount = await CloudSyncAuditModel.countDocuments({
        shopId: shop._id,
        eventId: { $in: localEvents.map((event) => event.eventId) }
    })
    assert(auditCount === localEvents.length, `Cloud audit captured all ${auditCount} synced events`)

    console.log("\n=== E2E cloud sync validation passed ===")
    await mongoose.disconnect()
    process.exit(0)
}

run().catch(async (error) => {
    console.error("\nE2E cloud sync validation failed:", error?.message || error)
    try {
        await mongoose.disconnect()
    } catch (_) {
        // ignore disconnect errors in test cleanup
    }
    process.exit(1)
})
