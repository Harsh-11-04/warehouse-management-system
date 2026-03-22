/**
 * UAT: Offline-to-Online Sync Simulation
 *
 * Simulates the full offline-to-online lifecycle:
 * Phase A (Offline): CLOUD_SYNC_URL is blank — create mutations, verify outbox grows
 * Phase B (Reconnect): Verify push batch skips while offline, then verify claim-batch
 *                      picks up pending events when URL is configured
 *
 * Usage: node scripts/uat-offline-online.js
 * Requires: MONGO_URL in .env, at least one user in the database
 */

require("dotenv").config()

// Force offline: clear CLOUD_SYNC_URL before any service import
const originalCloudUrl = process.env.CLOUD_SYNC_URL || ""
process.env.CLOUD_SYNC_URL = ""

const mongoose = require("mongoose")
const { ConnectDB } = require("../src/config/db.config")
const SyncService = require("../src/services/Sync.service")
const BillingProductService = require("../src/services/BillingProduct.service")
const BillingCustomerService = require("../src/services/BillingCustomer.service")
const BillingInvoiceService = require("../src/services/BillingInvoice.service")
const { SyncOutboxModel, SyncStateModel } = require("../src/models")
const BillingInvoice = require("../src/models/BillingInvoice.models")
const BillingProduct = require("../src/models/BillingProduct.models")

const log = (label, data) => console.log(`\n[${label}]`, JSON.stringify(data, null, 2))

let passCount = 0
let failCount = 0

const assert = (condition, message) => {
    if (!condition) {
        console.error(`  FAIL: ${message}`)
        failCount += 1
        return
    }
    passCount += 1
    console.log(`  PASS: ${message}`)
}

const run = async () => {
    await ConnectDB()
    console.log("Connected to MongoDB\n")

    const UserModel = mongoose.model("user")
    const testUser = await UserModel.findOne({}).select("_id").lean()
    if (!testUser) {
        console.error("No users found. Seed a user first.")
        process.exit(1)
    }
    const userId = testUser._id.toString()
    console.log(`Using test user: ${userId}`)

    // ========================================
    // PHASE A: OFFLINE MUTATIONS
    // ========================================
    console.log("\n" + "=".repeat(50))
    console.log("PHASE A: OFFLINE MUTATIONS (CLOUD_SYNC_URL is blank)")
    console.log("=".repeat(50))

    const outboxBefore = await SyncOutboxModel.countDocuments({ user: userId, status: "pending" })
    console.log(`\nPending outbox events before: ${outboxBefore}`)

    // A1. Verify push is blocked while offline
    console.log("\n--- A1: Push blocked while offline ---")
    const pushResult = await SyncService.processPendingBatch({ user: userId })
    assert(pushResult.skipped === true, `Push skipped while offline (reason: ${pushResult.reason})`)

    // A2. Create a product
    console.log("\n--- A2: Create product offline ---")
    const product = await BillingProductService.create(userId, {
        name: `UAT-Offline-Product-${Date.now()}`,
        barcode: `UAT${Date.now()}`,
        sellingPrice: 150,
        mrp: 180,
        purchasePrice: 100,
        gstPercent: 18,
        stock: 40
    })
    console.log(`  Product: ${product.name} (stock=${product.stock})`)

    // A3. Create a customer
    console.log("\n--- A3: Create customer offline ---")
    const customer = await BillingCustomerService.create(userId, {
        name: `UAT-Offline-Customer-${Date.now()}`,
        phone: `88${Date.now().toString().slice(-8)}`
    })
    console.log(`  Customer: ${customer.name}`)

    // A4. Create a paid invoice (sale)
    console.log("\n--- A4: Create paid invoice offline ---")
    const paidInvoice = await BillingInvoiceService.create(userId, {
        customer: customer._id,
        paymentMode: "Cash",
        paymentStatus: "Paid",
        items: [
            {
                product: product._id,
                name: product.name,
                barcode: product.barcode,
                quantity: 8,
                price: product.sellingPrice,
                gstPercent: product.gstPercent
            }
        ]
    })
    console.log(`  Invoice: ${paidInvoice.invoiceNumber} (total=${paidInvoice.grandTotal})`)

    const stockAfterSale = (await BillingProduct.findById(product._id).lean()).stock
    assert(stockAfterSale === 32, `Stock after sale: ${stockAfterSale} (expected 32)`)

    // A5. Create an unpaid invoice
    console.log("\n--- A5: Create unpaid invoice offline ---")
    const unpaidInvoice = await BillingInvoiceService.create(userId, {
        customer: customer._id,
        paymentMode: "Cash",
        paymentStatus: "Unpaid",
        items: [
            {
                product: product._id,
                name: product.name,
                barcode: product.barcode,
                quantity: 5,
                price: product.sellingPrice,
                gstPercent: product.gstPercent
            }
        ]
    })
    console.log(`  Invoice: ${unpaidInvoice.invoiceNumber} (total=${unpaidInvoice.grandTotal}, status=${unpaidInvoice.paymentStatus})`)

    const stockAfterUnpaid = (await BillingProduct.findById(product._id).lean()).stock
    assert(stockAfterUnpaid === 27, `Stock after unpaid sale: ${stockAfterUnpaid} (expected 27)`)

    // A6. Return items from paid invoice
    console.log("\n--- A6: Return items from paid invoice ---")
    const returnResult = await BillingInvoiceService.returnItems(userId, paidInvoice._id, [
        { productId: product._id.toString(), quantity: 3 }
    ])
    console.log(`  Return: grandTotal=${returnResult.grandTotal}, syncState=${returnResult.syncState}`)

    const stockAfterReturn = (await BillingProduct.findById(product._id).lean()).stock
    assert(stockAfterReturn === 30, `Stock after return: ${stockAfterReturn} (expected 30)`)

    // A7. Update payment on paid invoice
    console.log("\n--- A7: Update payment mode ---")
    const paymentUpdate = await BillingInvoiceService.updatePayment(userId, paidInvoice._id, {
        paymentMode: "UPI"
    })
    console.log(`  Payment updated: mode=${paymentUpdate.paymentMode}`)

    // A8. Void the unpaid invoice
    console.log("\n--- A8: Void unpaid invoice ---")
    const voidResult = await BillingInvoiceService.voidInvoice(userId, unpaidInvoice._id)
    console.log(`  Void: status=${voidResult.status}, grandTotal=${voidResult.grandTotal}`)
    assert(voidResult.status === "voided", `Voided invoice status: ${voidResult.status}`)

    const stockAfterVoid = (await BillingProduct.findById(product._id).lean()).stock
    assert(stockAfterVoid === 35, `Stock after void (5 restored): ${stockAfterVoid} (expected 35)`)

    // A9. Verify outbox grew
    const outboxAfter = await SyncOutboxModel.countDocuments({ user: userId, status: "pending" })
    const newEvents = outboxAfter - outboxBefore
    console.log(`\n--- A9: Outbox verification ---`)
    console.log(`  New pending events: ${newEvents}`)
    assert(newEvents >= 10, `At least 10 new outbox events created (got ${newEvents})`)

    // Verify event types
    const eventTypes = await SyncOutboxModel.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), status: "pending", createdAt: { $gte: product.createdAt } } },
        { $group: { _id: { entityType: "$entityType", operation: "$operation" }, count: { $sum: 1 } } },
        { $sort: { "_id.entityType": 1, "_id.operation": 1 } }
    ])
    log("Outbox event breakdown", eventTypes.map((e) => `${e._id.entityType}:${e._id.operation} x${e.count}`))

    const hasProductCreate = eventTypes.some((e) => e._id.entityType === "product" && e._id.operation === "create")
    const hasCustomerCreate = eventTypes.some((e) => e._id.entityType === "customer" && e._id.operation === "create")
    const hasSaleCreate = eventTypes.some((e) => e._id.entityType === "sale" && e._id.operation === "create")
    const hasSaleReturn = eventTypes.some((e) => e._id.entityType === "sale" && e._id.operation === "return")
    const hasSaleUpdate = eventTypes.some((e) => e._id.entityType === "sale" && e._id.operation === "update")
    const hasSaleVoid = eventTypes.some((e) => e._id.entityType === "sale" && e._id.operation === "void")
    const hasInventory = eventTypes.some((e) => e._id.entityType === "inventory_movement")

    assert(hasProductCreate, "product:create event in outbox")
    assert(hasCustomerCreate, "customer:create event in outbox")
    assert(hasSaleCreate, "sale:create event(s) in outbox")
    assert(hasSaleReturn, "sale:return event in outbox")
    assert(hasSaleUpdate, "sale:update event in outbox")
    assert(hasSaleVoid, "sale:void event in outbox")
    assert(hasInventory, "inventory_movement events in outbox")

    // A10. Verify sync status shows pending
    const statusOffline = await SyncService.getStatus(userId)
    assert(statusOffline.summary.pending >= newEvents, `Sync status shows >= ${newEvents} pending (got ${statusOffline.summary.pending})`)
    assert(statusOffline.summary.dead_letter === 0, `No dead-letter events (got ${statusOffline.summary.dead_letter})`)

    // A11. Verify invoice syncStates
    const paidInvState = await BillingInvoice.findById(paidInvoice._id).select("syncState").lean()
    const unpaidInvState = await BillingInvoice.findById(unpaidInvoice._id).select("syncState").lean()
    assert(paidInvState.syncState === "pending", `Paid invoice syncState: ${paidInvState.syncState} (expected pending)`)
    assert(unpaidInvState.syncState === "pending", `Void invoice syncState: ${unpaidInvState.syncState} (expected pending)`)

    // ========================================
    // PHASE B: RECONNECT SIMULATION
    // ========================================
    console.log("\n" + "=".repeat(50))
    console.log("PHASE B: RECONNECT (verify claim-batch picks up events)")
    console.log("=".repeat(50))

    // B1. Verify push still blocked (CLOUD_SYNC_URL still empty in process.env)
    console.log("\n--- B1: Push still blocked (URL empty) ---")
    const pushStillBlocked = await SyncService.processPendingBatch({ user: userId })
    assert(pushStillBlocked.skipped === true, "Push still blocked before URL restore")

    // B2. Verify claimPendingBatch can pick up events (tests DB layer works)
    console.log("\n--- B2: Claim pending batch (DB layer) ---")
    const claimedEvents = await SyncService.claimPendingBatch({
        user: userId,
        limit: 5,
        processingTimeoutMs: 120000
    })
    console.log(`  Claimed ${claimedEvents.length} events`)
    assert(claimedEvents.length > 0, `claimPendingBatch returned ${claimedEvents.length} events`)

    // Verify claimed events are now in 'processing' state
    if (claimedEvents.length > 0) {
        const processingCount = await SyncOutboxModel.countDocuments({
            _id: { $in: claimedEvents.map((e) => e._id) },
            status: "processing"
        })
        assert(processingCount === claimedEvents.length, `All ${claimedEvents.length} claimed events are in 'processing' state (got ${processingCount})`)

        // B3. Mark them back as pending (rollback for cleanup)
        await SyncOutboxModel.updateMany(
            { _id: { $in: claimedEvents.map((e) => e._id) } },
            { $set: { status: "pending", processingStartedAt: null } }
        )
        console.log(`  Rolled back ${claimedEvents.length} events to pending (cleanup)`)
    }

    // B4. Verify SyncState heartbeat can be written
    console.log("\n--- B3: Worker heartbeat ---")
    await SyncService.updateState(userId, {
        workerStatus: "idle",
        lastWorkerHeartbeatAt: new Date(),
        isOnline: true
    })
    const state = await SyncStateModel.findOne({ user: userId }).lean()
    assert(state && state.workerStatus === "idle", `SyncState updated: workerStatus=${state?.workerStatus}`)
    assert(state?.isOnline === true, `SyncState isOnline=${state?.isOnline}`)

    // ========================================
    // SUMMARY
    // ========================================
    console.log("\n" + "=".repeat(50))
    console.log("SUMMARY")
    console.log("=".repeat(50))

    const statusFinal = await SyncService.getStatus(userId)
    log("Final sync status", statusFinal.summary)

    const productFinal = await BillingProduct.findById(product._id).lean()
    console.log(`\nProduct: stock=${productFinal.stock} (started 40, sold 13, returned 3, voided 5 = 35)`)

    const paidFinal = await BillingInvoice.findById(paidInvoice._id).lean()
    console.log(`Paid invoice: status=${paidFinal.status}, paymentMode=${paidFinal.paymentMode}, syncState=${paidFinal.syncState}`)

    const unpaidFinal = await BillingInvoice.findById(unpaidInvoice._id).lean()
    console.log(`Unpaid invoice: status=${unpaidFinal.status}, grandTotal=${unpaidFinal.grandTotal}, syncState=${unpaidFinal.syncState}`)

    console.log(`\n  Passed: ${passCount}`)
    console.log(`  Failed: ${failCount}`)

    if (failCount > 0) {
        console.log("\n  SOME ASSERTIONS FAILED")
        await mongoose.disconnect()
        process.exit(1)
    }

    console.log("\n=== UAT: All assertions passed ===")
    await mongoose.disconnect()
    process.exit(0)
}

run().catch(async (err) => {
    console.error("\nUAT failed:", err?.message || err)
    try { await mongoose.disconnect() } catch (_) { /* ignore */ }
    process.exit(1)
})
