// Module: Local POS
// Barrel re-export for local billing/POS services
module.exports = {
    BillingInvoiceService: require("../../services/BillingInvoice.service"),
    BillingProductService: require("../../services/BillingProduct.service"),
    BillingCustomerService: require("../../services/BillingCustomer.service"),
    BillingSettingsService: require("../../services/BillingSettings.service"),
    SyncService: require("../../services/Sync.service"),
}
