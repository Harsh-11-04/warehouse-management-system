/**
 * Smoke Test: Offline-to-Online Sync Flow
 *
 * Tests the full sync lifecycle:
 * 1. Creates a product, customer, and invoice (offline outbox events)
 * 2. Returns items from the invoice
 * 3. Voids the invoice (if unpaid)
 * 4. Verifies outbox events, invoice syncState, and stock consistency
 *
 * Usage: node scripts/smoke-test-sync.js
 * Requires: MONGO_URL in .env, at least one user in the database
 */

require("dotenv").config()
const mongoose = require("mongoose")
const { ConnectDB } = require("../src/config/db.config")

const SyncService = require("../src/services/Sync.service")
const BillingProductService = require("../src/services/BillingProduct.service")
const BillingCustomerService = require("../src/services/BillingCustomer.service")
const BillingInvoiceService = require("../src/services/BillingInvoice.service")
const { SyncOutboxModel } = require("../src/models")
const BillingInvoice = require("../src/models/BillingInvoice.models")
const BillingProduct = require("../src/models/BillingProduct.models")

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

    // Find a test user
    const UserModel = mongoose.model("user")
    const testUser = await UserModel.findOne({}).select("_id").lean()
    if (!testUser) {
        console.error("No users found in database. Seed a user first.")
        process.exit(1)
    }
    const userId = testUser._id.toString()
    console.log(`Using test user: ${userId}\n`)

    // Record initial outbox count
    const initialOutboxCount = await SyncOutboxModel.countDocuments({ user: userId })

    // --- Step 1: Create a product ---
    console.log("=== Step 1: Create Product ===")
    const product = await BillingProductService.create(userId, {
        name: `Smoke-Test-Product-${Date.now()}`,
        barcode: `SMOKE${Date.now()}`,
        sellingPrice: 100,
        mrp: 120,
        purchasePrice: 80,
        gstPercent: 18,
        stock: 50
    })
    log("Product created", { id: product._id, name: product.name, stock: product.stock })

    const productOutbox = await SyncOutboxModel.findOne({
        user: userId,
        entityType: "product",
        operation: "create",
        entityId: product._id
    }).lean()
    assert(!!productOutbox, "product:create outbox event exists")

    // --- Step 2: Create a customer ---
    console.log("\n=== Step 2: Create Customer ===")
    const customer = await BillingCustomerService.create(userId, {
        name: `Smoke-Test-Customer-${Date.now()}`,
        phone: `99${Date.now().toString().slice(-8)}`
    })
    log("Customer created", { id: customer._id, name: customer.name })

    const customerOutbox = await SyncOutboxModel.findOne({
        user: userId,
        entityType: "customer",
        operation: "create",
        entityId: customer._id
    }).lean()
    assert(!!customerOutbox, "customer:create outbox event exists")

    // --- Step 3: Create an invoice ---
    console.log("\n=== Step 3: Create Invoice ===")
    const invoice = await BillingInvoiceService.create(userId, {
        customer: customer._id,
        paymentMode: "Cash",
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
    log("Invoice created", {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        grandTotal: invoice.grandTotal,
        syncState: invoice.syncState
    })

    const saleOutbox = await SyncOutboxModel.findOne({
        user: userId,
        entityType: "sale",
        operation: "create"
    }).sort({ createdAt: -1 }).lean()
    assert(!!saleOutbox, "sale:create outbox event exists")

    // Check stock was reduced
    const productAfterSale = await BillingProduct.findById(product._id).lean()
    assert(productAfterSale.stock === 45, `Stock reduced from 50 to ${productAfterSale.stock} (expected 45)`)

    // --- Step 4: Return items (pass array directly, not {items: [...]}) ---
    console.log("\n=== Step 4: Return Items ===")
    const returnResult = await BillingInvoiceService.returnItems(userId, invoice._id, [
        { productId: product._id.toString(), quantity: 2 }
    ])
    log("Return result", {
        grandTotal: returnResult.grandTotal,
        syncState: returnResult.syncState
    })

    assert(returnResult.syncState === "pending", `Invoice syncState is '${returnResult.syncState}' (expected 'pending')`)

    const returnOutbox = await SyncOutboxModel.findOne({
        user: userId,
        entityType: "sale",
        operation: "return"
    }).sort({ createdAt: -1 }).lean()
    assert(!!returnOutbox, "sale:return outbox event exists")

    const productAfterReturn = await BillingProduct.findById(product._id).lean()
    assert(productAfterReturn.stock === 47, `Stock restored to ${productAfterReturn.stock} (expected 47)`)

    // --- Step 5: Void the PAID invoice (should be skipped — correct behavior) ---
    console.log("\n=== Step 5: Void Invoice (Paid — should skip) ===")
    try {
        await BillingInvoiceService.voidInvoice(userId, invoice._id)
        assert(false, "Should not void a paid invoice")
    } catch (err) {
        assert(err.message.includes("unpaid"), `Paid invoice void rejected: ${err.message}`)
    }

    // ========================================
    // Step 6: UNPAID INVOICE -> VOID (full test)
    // ========================================
    console.log("\n=== Step 6: Unpaid Invoice -> Void ===")

    // 6a. Create a second product for the unpaid test
    const product2 = await BillingProductService.create(userId, {
        name: `Smoke-Test-UnpaidProd-${Date.now()}`,
        barcode: `SMKUP${Date.now()}`,
        sellingPrice: 200,
        mrp: 250,
        purchasePrice: 150,
        gstPercent: 12,
        stock: 30
    })
    console.log(`  Created product2: stock=${product2.stock}`)

    // 6b. Create an UNPAID invoice with 10 units
    const unpaidInvoice = await BillingInvoiceService.create(userId, {
        customer: customer._id,
        paymentMode: "Cash",
        paymentStatus: "Unpaid",
        items: [
            {
                product: product2._id,
                name: product2.name,
                barcode: product2.barcode,
                quantity: 10,
                price: product2.sellingPrice,
                gstPercent: product2.gstPercent
            }
        ]
    })
    log("Unpaid invoice created", {
        id: unpaidInvoice._id,
        invoiceNumber: unpaidInvoice.invoiceNumber,
        grandTotal: unpaidInvoice.grandTotal,
        paymentStatus: unpaidInvoice.paymentStatus,
        status: unpaidInvoice.status
    })
    assert(unpaidInvoice.paymentStatus === "Unpaid", `paymentStatus is '${unpaidInvoice.paymentStatus}'`)

    const product2AfterSale = await BillingProduct.findById(product2._id).lean()
    assert(product2AfterSale.stock === 20, `Product2 stock after sale: ${product2AfterSale.stock} (expected 20)`)

    // 6c. Return 3 items from the unpaid invoice
    const unpaidReturn = await BillingInvoiceService.returnItems(userId, unpaidInvoice._id, [
        { productId: product2._id.toString(), quantity: 3 }
    ])
    console.log(`  After return: grandTotal=${unpaidReturn.grandTotal}`)

    const product2AfterReturn = await BillingProduct.findById(product2._id).lean()
    assert(product2AfterReturn.stock === 23, `Product2 stock after return: ${product2AfterReturn.stock} (expected 23)`)

    // 6d. Void the unpaid invoice
    const voidResult = await BillingInvoiceService.voidInvoice(userId, unpaidInvoice._id)
    log("Void result", {
        status: voidResult.status,
        grandTotal: voidResult.grandTotal,
        syncState: voidResult.syncState
    })

    assert(voidResult.status === "voided", `Invoice status is '${voidResult.status}' (expected 'voided')`)
    assert(voidResult.grandTotal === 0, `Grand total is ${voidResult.grandTotal} (expected 0)`)
    assert(voidResult.syncState === "pending", `syncState is '${voidResult.syncState}' (expected 'pending')`)

    // 6e. Verify sale:void outbox event exists
    const voidOutbox = await SyncOutboxModel.findOne({
        user: userId,
        entityType: "sale",
        operation: "void",
        "metadata.invoiceNumber": unpaidInvoice.invoiceNumber
    }).lean()
    assert(!!voidOutbox, "sale:void outbox event exists for unpaid invoice")

    // 6f. Verify inventory_movement events for void (stock restoration)
    const voidInventoryEvents = await SyncOutboxModel.find({
        user: userId,
        entityType: "inventory_movement",
        "payload.movementType": "void",
        "payload.refId": unpaidInvoice._id
    }).lean()
    assert(voidInventoryEvents.length > 0, `inventory_movement:void events created (${voidInventoryEvents.length})`)

    // 6g. Stock should be fully restored: 30 (original) - 10 (sold) + 3 (returned) + 7 (voided remaining) = 30
    const product2AfterVoid = await BillingProduct.findById(product2._id).lean()
    assert(product2AfterVoid.stock === 30, `Product2 stock fully restored: ${product2AfterVoid.stock} (expected 30)`)

    // --- Step 7: Summary ---
    console.log("\n=== Summary ===")
    const finalOutboxCount = await SyncOutboxModel.countDocuments({ user: userId })
    const newEvents = finalOutboxCount - initialOutboxCount
    console.log(`New outbox events created: ${newEvents}`)

    const pendingEvents = await SyncOutboxModel.countDocuments({
        user: userId,
        status: "pending"
    })
    console.log(`Pending events awaiting sync: ${pendingEvents}`)

    const finalPaidInvoice = await BillingInvoice.findById(invoice._id).lean()
    console.log(`Paid invoice: syncState=${finalPaidInvoice?.syncState}, status=${finalPaidInvoice?.status}`)

    const finalUnpaidInvoice = await BillingInvoice.findById(unpaidInvoice._id).lean()
    console.log(`Unpaid invoice: syncState=${finalUnpaidInvoice?.syncState}, status=${finalUnpaidInvoice?.status}`)

    // Sync status check
    const syncStatus = await SyncService.getStatus(userId)
    log("Sync status summary", syncStatus.summary)

    console.log("\n=== All assertions passed ===")

    await mongoose.disconnect()
    process.exit(0)
}

run().catch(async (err) => {
    console.error("\nSmoke test failed:", err?.message || err)
    try { await mongoose.disconnect() } catch (_) { /* ignore */ }
    process.exit(1)
})
