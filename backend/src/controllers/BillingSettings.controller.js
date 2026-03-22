const BillingSettingsService = require("../services/BillingSettings.service")

class BillingSettingsController {
    static async get(req, res, next) {
        try {
            const settings = await BillingSettingsService.get(req.user)
            res.json({ settings })
        } catch (error) {
            next(error)
        }
    }

    static async update(req, res, next) {
        try {
            const settings = await BillingSettingsService.update(req.user, req.body)
            res.json({ msg: "Settings updated", settings })
        } catch (error) {
            next(error)
        }
    }
}

module.exports = BillingSettingsController
