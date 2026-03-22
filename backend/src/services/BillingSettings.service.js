const BillingSettings = require("../models/BillingSettings.models")

class BillingSettingsService {
    static async get(userId) {
        let settings = await BillingSettings.findOne({ user: userId })
        if (!settings) {
            settings = await BillingSettings.create({ user: userId })
        }
        return settings
    }

    static async update(userId, data) {
        const allowed = ['storeName', 'storeAddress', 'storePhone', 'storeEmail', 'gstNumber', 'currencySymbol', 'invoicePrefix', 'invoiceFooter', 'logoUrl']
        const updateData = {}
        for (const key of allowed) {
            if (data[key] !== undefined) updateData[key] = data[key]
        }
        let settings = await BillingSettings.findOneAndUpdate(
            { user: userId },
            { $set: updateData },
            { new: true, upsert: true, runValidators: true }
        )
        return settings
    }
}

module.exports = BillingSettingsService
