const { body, param } = require("express-validator")

class StockLocationValidation {
    static AssignStock = [
        body("productId").notEmpty().withMessage("Product ID is required").isMongoId().withMessage("Invalid Product ID"),
        body("locationId").notEmpty().withMessage("Location ID is required").isMongoId().withMessage("Invalid Location ID"),
        body("quantity").notEmpty().withMessage("Quantity is required").isInt({ min: 1 }).withMessage("Quantity must be at least 1")
    ]

    static TransferStock = [
        body("fromLocationId").notEmpty().withMessage("Source Location ID is required").isMongoId().withMessage("Invalid Source Location ID"),
        body("toLocationId").notEmpty().withMessage("Destination Location ID is required").isMongoId().withMessage("Invalid Destination Location ID"),
        body("productId").notEmpty().withMessage("Product ID is required").isMongoId().withMessage("Invalid Product ID"),
        body("quantity").notEmpty().withMessage("Quantity is required").isInt({ min: 1 }).withMessage("Quantity must be at least 1")
    ]

    static PickStock = [
        body("productId").notEmpty().withMessage("Product ID is required").isMongoId().withMessage("Invalid Product ID"),
        body("locationId").notEmpty().withMessage("Location ID is required").isMongoId().withMessage("Invalid Location ID"),
        body("quantity").notEmpty().withMessage("Quantity is required").isInt({ min: 1 }).withMessage("Quantity must be at least 1")
    ]

    static ReceiveStock = [
        body("productId").notEmpty().withMessage("Product ID is required").isMongoId().withMessage("Invalid Product ID"),
        body("locationId").notEmpty().withMessage("Location ID is required").isMongoId().withMessage("Invalid Location ID"),
        body("quantity").notEmpty().withMessage("Quantity is required").isInt({ min: 1 }).withMessage("Quantity must be at least 1")
    ]

    static Params_productId = [
        param("productId").notEmpty().withMessage("Product ID is required").isMongoId().withMessage("Invalid Product ID")
    ]
}

module.exports = StockLocationValidation
