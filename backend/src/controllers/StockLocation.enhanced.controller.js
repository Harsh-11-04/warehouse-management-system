const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const StockLocationController = require("../controllers/StockLocation.controller")
const { validateStockOperation, validateStockTransfer, validatePagination } = require("../middlewares/validation.middleware")
const { authMiddleware, staffOrAbove } = require("../middlewares/rbac.middleware")

class EnhancedStockLocationController {
    static assignStock = CatchAsync(async (req, res) => {
        const res_obj = await StockLocationController.assignStock(req?.user, req.body)
        return res.status(httpStatus.CREATED).json(res_obj)
    })

    static transferStock = CatchAsync(async (req, res) => {
        const res_obj = await StockLocationController.transferStock(req?.user, req.body)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static pickStock = CatchAsync(async (req, res) => {
        const res_obj = await StockLocationController.pickStock(req?.user, req.body)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static receiveStock = CatchAsync(async (req, res) => {
        const res_obj = await StockLocationController.receiveStock(req?.user, req.body)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getStockByProduct = CatchAsync(async (req, res) => {
        const res_obj = await StockLocationController.getStockByProduct(req?.user, req.params.id)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getAllStockLocations = CatchAsync(async (req, res) => {
        const res_obj = await StockLocationController.getAllStockLocations(req?.user, req.query?.page)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static bulkAssignStock = CatchAsync(async (req, res) => {
        const { assignments } = req.body
        
        if (!Array.isArray(assignments) || assignments.length === 0) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                error: "Assignments array is required and cannot be empty" 
            })
        }

        const results = []
        const errors = []

        for (let i = 0; i < assignments.length; i++) {
            try {
                const result = await StockLocationController.assignStock(req?.user, assignments[i])
                results.push({ index: i, success: true, data: result })
            } catch (error) {
                errors.push({ 
                    index: i, 
                    error: error.message,
                    data: assignments[i] 
                })
            }
        }

        return res.status(httpStatus.OK).json({
            message: `Processed ${assignments.length} assignments`,
            successful: results.length,
            failed: errors.length,
            results,
            errors
        })
    })

    static bulkTransferStock = CatchAsync(async (req, res) => {
        const { transfers } = req.body
        
        if (!Array.isArray(transfers) || transfers.length === 0) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                error: "Transfers array is required and cannot be empty" 
            })
        }

        const results = []
        const errors = []

        for (let i = 0; i < transfers.length; i++) {
            try {
                const result = await StockLocationController.transferStock(req?.user, transfers[i])
                results.push({ index: i, success: true, data: result })
            } catch (error) {
                errors.push({ 
                    index: i, 
                    error: error.message,
                    data: transfers[i] 
                })
            }
        }

        return res.status(httpStatus.OK).json({
            message: `Processed ${transfers.length} transfers`,
            successful: results.length,
            failed: errors.length,
            results,
            errors
        })
    })
}

module.exports = EnhancedStockLocationController
