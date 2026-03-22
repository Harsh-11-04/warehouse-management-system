const BillingCustomerService = require("../services/BillingCustomer.service")
const ApiError = require("../utils/ApiError")

class BillingCustomerController {
    static async create(req, res, next) {
        try {
            const customer = await BillingCustomerService.create(req.user, req.body)
            res.status(201).json({ msg: "Customer created", customer })
        } catch (error) {
            if (error.code === 11000) {
                return next(new ApiError(400, "Customer with this phone number already exists"))
            }
            next(error)
        }
    }

    static async getAll(req, res, next) {
        try {
            const { page = 1, limit = 20, query = '' } = req.query
            const result = await BillingCustomerService.getAll(req.user, {
                page: Number(page), limit: Number(limit), query
            })
            res.json(result)
        } catch (error) {
            next(error)
        }
    }

    static async search(req, res, next) {
        try {
            const { query = '' } = req.query
            const customers = await BillingCustomerService.search(req.user, query)
            res.json({ customers })
        } catch (error) {
            next(error)
        }
    }

    static async getById(req, res, next) {
        try {
            const customer = await BillingCustomerService.getById(req.user, req.params.id)
            if (!customer) throw new ApiError(404, "Customer not found")
            res.json({ customer })
        } catch (error) {
            next(error)
        }
    }

    static async update(req, res, next) {
        try {
            const customer = await BillingCustomerService.update(req.user, req.params.id, req.body)
            if (!customer) throw new ApiError(404, "Customer not found")
            res.json({ msg: "Customer updated", customer })
        } catch (error) {
            next(error)
        }
    }

    static async delete(req, res, next) {
        try {
            const customer = await BillingCustomerService.delete(req.user, req.params.id)
            if (!customer) throw new ApiError(404, "Customer not found")
            res.json({ msg: "Customer deactivated", customer })
        } catch (error) {
            next(error)
        }
    }
}

module.exports = BillingCustomerController
