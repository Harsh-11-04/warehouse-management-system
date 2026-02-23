const { body, param, query } = require("express-validator")

class WarehouseValidation {
    static CreateWarehouse = [
        body("name").notEmpty().withMessage("Warehouse name is required").trim(),
        body("address").notEmpty().withMessage("Address is required").trim()
    ]

    static CreateLocation = [
        body("warehouseId").notEmpty().withMessage("Warehouse ID is required").isMongoId().withMessage("Invalid Warehouse ID"),
        body("rack").notEmpty().withMessage("Rack is required").trim(),
        body("bin").notEmpty().withMessage("Bin is required").trim()
    ]

    static Params_id = [
        param("id").notEmpty().withMessage("ID is required").isMongoId().withMessage("Invalid ID")
    ]

    static Params_warehouseId = [
        param("warehouseId").notEmpty().withMessage("Warehouse ID is required").isMongoId().withMessage("Invalid Warehouse ID")
    ]

    static query_page = [
        query("page").optional().isNumeric().withMessage("Page must be a number"),
        query("query").optional()
    ]
}

module.exports = WarehouseValidation
