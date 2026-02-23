const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const ProductService = require("../services/Product.service")

class ProductController {
    static createProduct = CatchAsync(async (req, res) => {
        const res_obj = await ProductService.createProduct(req?.user, req.body)
        return res.status(httpStatus.CREATED).json(res_obj)
    })

    static getAllProducts = CatchAsync(async (req, res) => {
        const lowStock = req.query?.lowStock === 'true'
        const res_obj = await ProductService.getAllProducts(req?.user, req.query?.page, req.query?.query, lowStock)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getProductById = CatchAsync(async (req, res) => {
        const res_obj = await ProductService.getProductById(req?.user, req.params.id)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static updateProduct = CatchAsync(async (req, res) => {
        const res_obj = await ProductService.updateProduct(req?.user, req.body, req.params.id)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static deleteProduct = CatchAsync(async (req, res) => {
        const res_obj = await ProductService.deleteProduct(req?.user, req.params.id)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getProductsForSearch = CatchAsync(async (req, res) => {
        const res_obj = await ProductService.getProductsForSearch(req?.user)
        return res.status(httpStatus.OK).json(res_obj)
    })
}

module.exports = ProductController
