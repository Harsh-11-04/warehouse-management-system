const ShipmentService = require("../services/Shipment.service")
const CatchAsync = require("../utils/CatchAsync")

class ShipmentController {

    static CreateShipment = CatchAsync(async (req, res) => {
        const result = await ShipmentService.createShipment(req.user, req.body)
        res.status(201).json(result)
    })

    static UpdateShipmentStatus = CatchAsync(async (req, res) => {
        const result = await ShipmentService.updateShipmentStatus(req.user, req.params.id, req.body.status)
        res.status(200).json(result)
    })

    static GetAllShipments = CatchAsync(async (req, res) => {
        const result = await ShipmentService.getAllShipments(req.user, req.query.page, req.query.query, req.query.type)
        res.status(200).json(result)
    })

    static GetShipmentById = CatchAsync(async (req, res) => {
        const result = await ShipmentService.getShipmentById(req.user, req.params.id)
        res.status(200).json(result)
    })

    static DeleteShipment = CatchAsync(async (req, res) => {
        const result = await ShipmentService.deleteShipment(req.user, req.params.id)
        res.status(200).json(result)
    })

    static GetShipmentsByProduct = CatchAsync(async (req, res) => {
        const result = await ShipmentService.getShipmentsByProduct(req.user, req.params.productId)
        res.status(200).json(result)
    })
}

module.exports = ShipmentController
