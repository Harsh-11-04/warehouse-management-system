const CatchAsync = require("../utils/CatchAsync")
const CloudAnalyticsService = require("../services/CloudAnalytics.service")

class CloudAnalyticsController {
    static Overview = CatchAsync(async (req, res) => {
        const result = await CloudAnalyticsService.getOverview(req.user)
        res.status(200).json(result)
    })

    static DailyRevenue = CatchAsync(async (req, res) => {
        const result = await CloudAnalyticsService.getDailyRevenue(req.user, {
            days: req.query.days
        })
        res.status(200).json(result)
    })

    static MonthlyRevenue = CatchAsync(async (req, res) => {
        const result = await CloudAnalyticsService.getMonthlyRevenue(req.user, {
            months: req.query.months
        })
        res.status(200).json(result)
    })

    static BestSellers = CatchAsync(async (req, res) => {
        const result = await CloudAnalyticsService.getBestSellers(req.user, {
            days: req.query.days,
            limit: req.query.limit
        })
        res.status(200).json(result)
    })

    static InventoryAlerts = CatchAsync(async (req, res) => {
        const result = await CloudAnalyticsService.getInventoryAlerts(req.user, {
            limit: req.query.limit
        })
        res.status(200).json(result)
    })
}

module.exports = CloudAnalyticsController
