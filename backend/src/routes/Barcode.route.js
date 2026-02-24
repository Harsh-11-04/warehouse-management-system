const express = require("express")
const router = express.Router()
const BarcodeController = require("../controllers/Barcode.controller")
const { authMiddleware, staffOrAbove } = require("../middlewares/rbac.middleware")

router.use(authMiddleware)

router.post("/scan-location", staffOrAbove, BarcodeController.getLocationByQR)
router.post("/scan-product", staffOrAbove, BarcodeController.getProductByBarcode)
router.post("/location/:locationId/generate-qr", staffOrAbove, BarcodeController.generateLocationQR)
router.post("/product/:productId/generate-barcode", staffOrAbove, BarcodeController.generateProductBarcode)

module.exports = router
