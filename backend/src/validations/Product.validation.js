const { body, param, query } = require("express-validator")

class ProductValidation {
    static CreateProduct = [
        body("name").notEmpty().withMessage("Product name is required").trim(),
        body("sku").notEmpty().withMessage("SKU is required").trim(),
        body("price").notEmpty().withMessage("Price is required").isNumeric().withMessage("Price must be a number")
    ]

    static UpdateProduct = [
        body("name").notEmpty().withMessage("Product name is required").trim(),
        body("sku").notEmpty().withMessage("SKU is required").trim(),
        body("price").notEmpty().withMessage("Price is required").isNumeric().withMessage("Price must be a number")
    ]

    static Params_id = [
        param("id").notEmpty().withMessage("Product ID is required").isMongoId().withMessage("Invalid Product ID")
    ]

    static query_page = [
        query("page").optional().isNumeric().withMessage("Page must be a number"),
        query("query").optional()
    ]
}

module.exports = ProductValidation
