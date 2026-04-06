const BillingInvoiceService = require("../services/BillingInvoice.service")
const ApiError = require("../utils/ApiError")

class BillingInvoiceController {
    static async create(req, res, next) {
        try {
            const { items, customer, customerName, customerPhone, paymentMode, paymentStatus, discount, discountType } = req.body
            if (!items || !items.length) throw new ApiError(400, "At least one item is required")

            const invoice = await BillingInvoiceService.create(req.user, {
                items, customer, customerName, customerPhone,
                paymentMode, paymentStatus, discount, discountType,
                billedBy: ''
            })
            res.status(201).json({ msg: "Invoice created", invoice })
        } catch (error) {
            next(error)
        }
    }

    static async getAll(req, res, next) {
        try {
            const { page = 1, limit = 20, query = '', startDate, endDate } = req.query
            const result = await BillingInvoiceService.getAll(req.user, {
                page: Number(page), limit: Number(limit), query, startDate, endDate
            })
            res.json(result)
        } catch (error) {
            next(error)
        }
    }

    static async getById(req, res, next) {
        try {
            const invoice = await BillingInvoiceService.getById(req.user, req.params.id)
            if (!invoice) throw new ApiError(404, "Invoice not found")
            res.json({ invoice })
        } catch (error) {
            next(error)
        }
    }

    static async getDashboardStats(req, res, next) {
        try {
            const stats = await BillingInvoiceService.getDashboardStats(req.user)
            res.json(stats)
        } catch (error) {
            next(error)
        }
    }

    static async updatePayment(req, res, next) {
        try {
            const { paymentMode, paymentStatus } = req.body
            const invoice = await BillingInvoiceService.updatePayment(req.user, req.params.id, {
                paymentMode, paymentStatus
            })
            if (!invoice) throw new ApiError(404, "Invoice not found")
            res.json({ msg: "Payment updated", invoice })
        } catch (error) {
            next(error)
        }
    }

    static async returnItems(req, res, next) {
        try {
            const { itemsToReturn } = req.body
            const invoice = await BillingInvoiceService.returnItems(req.user, req.params.id, itemsToReturn)
            res.json({ msg: "Items returned successfully", invoice })
        } catch (error) {
            next(error)
        }
    }

    static async addItems(req, res, next) {
        try {
            const { itemsToAdd } = req.body
            const invoice = await BillingInvoiceService.addItems(req.user, req.params.id, itemsToAdd)
            res.json({ msg: "Items added successfully", invoice })
        } catch (error) {
            next(error)
        }
    }

    static async getReportData(req, res, next) {
        try {
            const { startDate, endDate } = req.query
            if (!startDate || !endDate) {
                return res.status(400).json({ message: "startDate and endDate are required" })
            }
            const report = await BillingInvoiceService.getReportData(req.user, startDate, endDate)
            res.json(report)
        } catch (error) {
            next(error)
        }
    }

    static async getByCustomer(req, res, next) {
        try {
            const { customerId } = req.params
            const invoices = await BillingInvoiceService.getByCustomer(req.user, customerId)
            res.json({ invoices })
        } catch (error) {
            next(error)
        }
    }

    static async voidInvoice(req, res, next) {
        try {
            const invoice = await BillingInvoiceService.voidInvoice(req.user, req.params.id)
            res.json({ msg: "Invoice voided successfully", invoice })
        } catch (error) {
            next(error)
        }
    }
    static async deleteInvoice(req, res, next) {
        try {
            const result = await BillingInvoiceService.deleteInvoice(req.user, req.params.id)
            res.json(result)
        } catch (error) {
            next(error)
        }
    }
}

module.exports = BillingInvoiceController
