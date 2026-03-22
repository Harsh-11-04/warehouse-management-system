require("dotenv").config()

const mongoose = require("mongoose")
const { ConnectDB } = require("../src/config/db.config")
const AuthService = require("../src/services/Auth.service")
const CloudSyncService = require("../src/services/CloudSync.service")
const CloudAnalyticsService = require("../src/services/CloudAnalytics.service")
const CloudSyncAuditService = require("../src/services/CloudSyncAudit.service")
const BillingProductService = require("../src/services/BillingProduct.service")
const BillingCustomerService = require("../src/services/BillingCustomer.service")
const BillingInvoiceService = require("../src/services/BillingInvoice.service")
const SyncService = require("../src/services/Sync.service")

const assert = (condition, message) => {
    if (!condition) {
        console.error(`FAIL: ${message}`)
        process.exit(1)
    }

    console.log(`PASS: ${message}`)
}

const buildCloudEvent = (event) => ({
    eventId: String(event.eventId),
    userId: String(event.user),
    entityType: event.entityType,
    entityId: event.entityId || null,
    operation: event.operation,
    deviceId: "shared-shop-test",
    payload: event.payload || {},
    metadata: event.metadata || {}
})

const run = async () => {
    await ConnectDB()
    console.log("Connected to MongoDB")

    const seed = Date.now()
    const adminEmail = `admin.shared.${seed}@test.com`
    const cashierEmail = `cashier.shared.${seed}@test.com`

    const adminRegistration = await AuthService.RegisterUser({
        token: "test_token_bypass",
        name: `Shared Admin ${seed}`,
        email: adminEmail,
        password: "admin123"
    })

    const shopCode = adminRegistration.shop?.code
    assert(Boolean(shopCode), "Admin registration created a shop code")

    const cashierRegistration = await AuthService.RegisterUser({
        token: "test_token_bypass",
        name: `Shared Cashier ${seed}`,
        email: cashierEmail,
        password: "cashier123",
        shopCode
    })

    const UserModel = mongoose.model("user")
    const [adminUser, cashierUser] = await Promise.all([
        UserModel.findById(adminRegistration.user._id).select("_id shopId role").lean(),
        UserModel.findById(cashierRegistration.user._id).select("_id shopId role").lean()
    ])

    assert(Boolean(adminUser?.shopId), "Admin user has a shopId")
    assert(Boolean(cashierUser?.shopId), "Cashier user has a shopId")
    assert(String(adminUser.shopId) === String(cashierUser.shopId), "Admin and cashier share the same shopId")

    const adminShop = await CloudSyncService.ensureShopForUser(adminUser._id)
    const cashierShop = await CloudSyncService.ensureShopForUser(cashierUser._id)
    assert(String(adminShop._id) === String(cashierShop._id), "Cloud shop resolution is shared across both users")
    assert(adminShop.shopCode === shopCode, "Cashier joined the admin's shop code")

    const product = await BillingProductService.create(String(cashierUser._id), {
        name: `Shared Product ${seed}`,
        barcode: `SHARED${seed}`,
        sellingPrice: 100,
        mrp: 120,
        purchasePrice: 70,
        gstPercent: 18,
        stock: 25
    })

    const customer = await BillingCustomerService.create(String(cashierUser._id), {
        name: `Shared Customer ${seed}`,
        phone: `88${String(seed).slice(-8)}`
    })

    const invoice = await BillingInvoiceService.create(String(cashierUser._id), {
        customer: customer._id,
        paymentMode: "Cash",
        paymentStatus: "Paid",
        items: [{
            product: product._id,
            name: product.name,
            barcode: product.barcode,
            quantity: 4,
            price: product.sellingPrice,
            gstPercent: product.gstPercent
        }]
    })

    assert(invoice.syncState === "pending", "Cashier invoice is pending sync locally")

    const claimedEvents = await SyncService.claimPendingBatch({
        user: String(cashierUser._id),
        limit: 20
    })

    assert(claimedEvents.length > 0, "Cashier created outbox events for sync")

    const cloudResult = await CloudSyncService.ingestBulk({
        deviceId: "shared-shop-test",
        events: claimedEvents.map(buildCloudEvent)
    })

    assert(cloudResult.failedCount === 0, "Cashier events synced to cloud without failures")
    assert(cloudResult.successCount === claimedEvents.length, "All claimed events were acknowledged by cloud ingest")

    await SyncService.markEventsSynced(cloudResult.ackedEventIds)

    const adminOverview = await CloudAnalyticsService.getOverview(String(adminUser._id))
    assert(adminOverview.shop.code === shopCode, "Admin analytics resolve the shared shop code")
    assert((adminOverview.lifetime.salesCount || 0) >= 1, "Admin analytics can see cashier's synced sale")
    assert((adminOverview.lifetime.revenue || 0) >= invoice.grandTotal, "Admin analytics include cashier revenue")

    const auditSummary = await CloudSyncAuditService.getAuditSummary(String(adminUser._id))
    assert((auditSummary.processed || 0) >= claimedEvents.length, "Admin sync audit can see cashier sync events")

    console.log("\nShared shop sync validation completed successfully.")
}

run()
    .catch((error) => {
        console.error("Shared shop sync validation failed:", error)
        process.exit(1)
    })
    .finally(async () => {
        await mongoose.disconnect()
    })
