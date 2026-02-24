const express = require("express")
const Authentication = require("../middlewares/Authentication")
const authorize = require("../middlewares/Authorization")
const ProductController = require("../controllers/Product.controller")
const ProductValidation = require("../validations/Product.validation")
const Validation = require("../middlewares/Validation")
const router = express.Router()

router.use(Authentication)

router.get("/get-all", ProductValidation.query_page, Validation, ProductController.getAllProducts)
router.get("/get-search", ProductController.getProductsForSearch)
router.get("/get/:id", ProductValidation.Params_id, Validation, ProductController.getProductById)

router.post("/create", authorize('admin', 'manager'), ProductValidation.CreateProduct, Validation, ProductController.createProduct)
router.patch("/update/:id", authorize('admin', 'manager'), ProductValidation.UpdateProduct, Validation, ProductController.updateProduct)
router.delete("/delete/:id", authorize('admin', 'manager'), ProductValidation.Params_id, Validation, ProductController.deleteProduct)

module.exports = router
