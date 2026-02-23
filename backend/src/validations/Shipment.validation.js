const { body, param, query } = require("express-validator")

class ShipmentValidation {
    static CreateShipment = [
        body("type").notEmpty().withMessage("Shipment type is required")
            .isIn(['Inbound', 'Outbound']).withMessage("Type must be 'Inbound' or 'Outbound'"),
        body("productId").notEmpty().withMessage("Product ID is required")
            .isMongoId().withMessage("Invalid Product ID"),
        body("quantity").notEmpty().withMessage("Quantity is required")
            .isInt({ min: 1 }).withMessage("Quantity must be at least 1")
    ]

    static UpdateStatus = [
        param("id").notEmpty().withMessage("Shipment ID is required")
            .isMongoId().withMessage("Invalid Shipment ID"),
        body("status").notEmpty().withMessage("Status is required")
            .isIn(['Pending', 'In Transit', 'Delivered']).withMessage("Invalid status value")
    ]

    static Params_id = [
        param("id").notEmpty().withMessage("Shipment ID is required")
            .isMongoId().withMessage("Invalid Shipment ID")
    ]

    static Params_productId = [
        param("productId").notEmpty().withMessage("Product ID is required")
            .isMongoId().withMessage("Invalid Product ID")
    ]

    static query_page = [
        query("page").optional().isNumeric().withMessage("Page must be a number"),
        query("query").optional(),
        query("type").optional().isIn(['Inbound', 'Outbound', '']).withMessage("Invalid type filter")
    ]
}

module.exports = ShipmentValidation
