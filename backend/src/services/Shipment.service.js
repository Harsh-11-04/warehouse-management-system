const httpStatus = require("http-status")
const { ShipmentModel, ProductModel } = require("../models")
const ApiError = require("../utils/ApiError")
const ActivityLogService = require("./ActivityLog.service")
const StockHistoryService = require("./StockHistory.service")

class ShipmentService {

    static async createShipment(user, body) {
        const { type, productId, quantity, notes } = body

        const product = await ProductModel.findOne({ _id: productId, user })
        if (!product) {
            throw new ApiError(httpStatus.NOT_FOUND, "Product Not Found")
        }

        // For outbound, check if enough stock
        if (type === 'Outbound') {
            if (product.totalQuantity < quantity) {
                throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient stock. Available: ${product.totalQuantity}, Requested: ${quantity}`)
            }
        }

        const shipment = await ShipmentModel.create({
            user,
            type,
            product: productId,
            quantity,
            notes: notes || '',
            handledBy: user,
            status: 'Pending'
        })

        await ActivityLogService.log(user, `Created ${type} Shipment`, 'Shipment', shipment._id, `${type} shipment for product (qty: ${quantity})`)

        return { msg: `${type} Shipment Created Successfully`, shipment }
    }

    static async updateShipmentStatus(user, shipmentId, newStatus) {
        const shipment = await ShipmentModel.findOne({ _id: shipmentId, user })
        if (!shipment) {
            throw new ApiError(httpStatus.NOT_FOUND, "Shipment Not Found")
        }

        // Validate status transition
        const validTransitions = {
            'Pending': ['In Transit', 'Delivered'],
            'In Transit': ['Delivered'],
            'Delivered': []
        }

        if (!validTransitions[shipment.status].includes(newStatus)) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Cannot transition from '${shipment.status}' to '${newStatus}'`)
        }

        // When shipment is delivered, auto-update product quantity and log stock history
        if (newStatus === 'Delivered') {
            if (shipment.type === 'Inbound') {
                const product = await ProductModel.findByIdAndUpdate(shipment.product, {
                    $inc: { totalQuantity: shipment.quantity }
                }, { new: true })
                if (product) {
                    await ProductService.processReorderCheck(product)
                }
                await StockHistoryService.log({
                    productId: shipment.product,
                    quantity: shipment.quantity,
                    action: 'Shipment_Inbound',
                    userId: user,
                    reference: `Shipment #${shipmentId}`,
                    metadata: { shipmentId }
                })
            } else if (shipment.type === 'Outbound') {
                const product = await ProductModel.findById(shipment.product)
                if (product.totalQuantity < shipment.quantity) {
                    throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient stock to fulfill outbound shipment. Available: ${product.totalQuantity}`)
                }
                const updatedProduct = await ProductModel.findByIdAndUpdate(shipment.product, {
                    $inc: { totalQuantity: -shipment.quantity }
                }, { new: true })
                if (updatedProduct) {
                    await ProductService.processReorderCheck(updatedProduct)
                }
                await StockHistoryService.log({
                    productId: shipment.product,
                    quantity: shipment.quantity,
                    action: 'Shipment_Outbound',
                    userId: user,
                    reference: `Shipment #${shipmentId}`,
                    metadata: { shipmentId }
                })
            }
        }

        shipment.status = newStatus
        await shipment.save()

        await ActivityLogService.log(user, `Shipment Status → ${newStatus}`, 'Shipment', shipmentId, `${shipment.type} shipment marked as ${newStatus}`)

        return { msg: `Shipment status updated to '${newStatus}'` }
    }

    static async getAllShipments(user, page = 1, query = '', type = '') {
        const limit = 10
        const skip = (Number(page) - 1) * limit

        const filters = { user }

        if (type && ['Inbound', 'Outbound'].includes(type)) {
            filters.type = type
        }

        if (query) {
            // We'll search by product name via populate and filter
        }

        const data = await ShipmentModel.find(filters)
            .populate('product', 'name sku')
            .populate('handledBy', 'name email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })

        const total = await ShipmentModel.countDocuments(filters)
        const hasMore = skip + limit < total

        return { shipments: data, more: hasMore, total }
    }

    static async getShipmentById(user, id) {
        const shipment = await ShipmentModel.findOne({ _id: id, user })
            .populate('product', 'name sku category price totalQuantity')
            .populate('handledBy', 'name email')

        if (!shipment) {
            throw new ApiError(httpStatus.NOT_FOUND, "Shipment Not Found")
        }

        return { shipment }
    }

    static async deleteShipment(user, id) {
        const shipment = await ShipmentModel.findOne({ _id: id, user })
        if (!shipment) {
            throw new ApiError(httpStatus.NOT_FOUND, "Shipment Not Found")
        }

        if (shipment.status === 'Delivered') {
            throw new ApiError(httpStatus.BAD_REQUEST, "Cannot delete a delivered shipment")
        }

        await ShipmentModel.findByIdAndDelete(id)

        return { msg: "Shipment Deleted Successfully" }
    }

    static async getShipmentsByProduct(user, productId) {
        const shipments = await ShipmentModel.find({ user, product: productId })
            .populate('handledBy', 'name email')
            .sort({ createdAt: -1 })

        return { shipments }
    }
}

module.exports = ShipmentService
