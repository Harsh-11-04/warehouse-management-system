const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const { DraftPurchaseOrderModel, ReorderSuggestionModel, ProductModel } = require("../models")
const ApiError = require("../utils/ApiError")
const ActivityLogService = require("./ActivityLog.service")

class DraftPurchaseOrderService {

    static async createDraftPurchaseOrder(user, reorderSuggestionId, approvedQuantity = null, supplier = '', estimatedCost = 0) {
        const reorderSuggestion = await ReorderSuggestionModel.findOne({
            _id: reorderSuggestionId,
            user,
            status: 'Pending'
        }).populate('product')

        if (!reorderSuggestion) {
            throw new ApiError(httpStatus.NOT_FOUND, "Reorder suggestion not found or already processed")
        }

        const existingDraft = await DraftPurchaseOrderModel.findOne({
            reorderSuggestion: reorderSuggestionId,
            user,
            status: { $in: ['Draft', 'Pending_Approval'] }
        })

        if (existingDraft) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Draft purchase order already exists for this suggestion")
        }

        const draftPO = await DraftPurchaseOrderModel.create({
            user,
            reorderSuggestion: reorderSuggestionId,
            product: reorderSuggestion.product._id,
            suggestedQuantity: reorderSuggestion.suggestedQuantity,
            approvedQuantity: approvedQuantity || reorderSuggestion.suggestedQuantity,
            supplier,
            estimatedCost,
            status: 'Draft'
        })

        await ActivityLogService.log(
            user,
            "Created Draft Purchase Order",
            "DraftPurchaseOrder",
            draftPO._id,
            `Draft PO created for ${reorderSuggestion.product.name} (Qty: ${approvedQuantity || reorderSuggestion.suggestedQuantity})`
        )

        return draftPO
    }

    static async getDraftPurchaseOrders(user, status = null) {
        const query = { user }
        if (status) {
            query.status = status
        }

        const draftPOs = await DraftPurchaseOrderModel.find(query)
            .populate('reorderSuggestion', 'suggestedQuantity createdAt')
            .populate('product', 'name sku price totalQuantity')
            .populate('approvedBy', 'name email')
            .sort({ createdAt: -1 })
            .lean()

        return draftPOs
    }

    static async updateDraftPurchaseOrder(user, draftPOId, updates) {
        const draftPO = await DraftPurchaseOrderModel.findOne({
            _id: draftPOId,
            user,
            status: { $in: ['Draft', 'Pending_Approval'] }
        })

        if (!draftPO) {
            throw new ApiError(httpStatus.NOT_FOUND, "Draft purchase order not found or cannot be modified")
        }

        const allowedUpdates = ['approvedQuantity', 'supplier', 'estimatedCost', 'notes']
        const updateData = {}

        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                updateData[field] = updates[field]
            }
        })

        Object.assign(draftPO, updateData)
        await draftPO.save()

        await ActivityLogService.log(
            user,
            "Updated Draft Purchase Order",
            "DraftPurchaseOrder",
            draftPO._id,
            `Draft PO updated`
        )

        return draftPO
    }

    static async submitForApproval(user, draftPOId) {
        const draftPO = await DraftPurchaseOrderModel.findOne({
            _id: draftPOId,
            user,
            status: 'Draft'
        })

        if (!draftPO) {
            throw new ApiError(httpStatus.NOT_FOUND, "Draft purchase order not found or already submitted")
        }

        if (!draftPO.approvedQuantity || draftPO.approvedQuantity <= 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "Approved quantity must be greater than 0")
        }

        draftPO.status = 'Pending_Approval'
        await draftPO.save()

        await ActivityLogService.log(
            user,
            "Submitted Draft PO for Approval",
            "DraftPurchaseOrder",
            draftPO._id,
            `Draft PO submitted for approval`
        )

        return draftPO
    }

    static async approveDraftPurchaseOrder(user, draftPOId) {
        const draftPO = await DraftPurchaseOrderModel.findOne({
            _id: draftPOId,
            status: 'Pending_Approval'
        }).populate('product')

        if (!draftPO) {
            throw new ApiError(httpStatus.NOT_FOUND, "Draft purchase order not found or not pending approval")
        }

        draftPO.status = 'Approved'
        draftPO.approvedBy = user
        draftPO.approvedAt = new Date()
        await draftPO.save()

        await ReorderSuggestionService.updateSuggestionStatus(draftPO.user, draftPO.reorderSuggestion, 'Ordered')

        await ActivityLogService.log(
            user,
            "Approved Draft Purchase Order",
            "DraftPurchaseOrder",
            draftPO._id,
            `Draft PO approved for ${draftPO.product.name}`
        )

        return draftPO
    }

    static async rejectDraftPurchaseOrder(user, draftPOId, reason = '') {
        const draftPO = await DraftPurchaseOrderModel.findOne({
            _id: draftPOId,
            status: 'Pending_Approval'
        }).populate('product')

        if (!draftPO) {
            throw new ApiError(httpStatus.NOT_FOUND, "Draft purchase order not found or not pending approval")
        }

        draftPO.status = 'Rejected'
        draftPO.approvedBy = user
        draftPO.approvedAt = new Date()
        draftPO.notes = reason
        await draftPO.save()

        await ActivityLogService.log(
            user,
            "Rejected Draft Purchase Order",
            "DraftPurchaseOrder",
            draftPO._id,
            `Draft PO rejected for ${draftPO.product.name}. Reason: ${reason}`
        )

        return draftPO
    }

    static async markAsOrdered(user, draftPOId) {
        const draftPO = await DraftPurchaseOrderModel.findOne({
            _id: draftPOId,
            user,
            status: 'Approved'
        }).populate('product')

        if (!draftPO) {
            throw new ApiError(httpStatus.NOT_FOUND, "Draft purchase order not found or not approved")
        }

        draftPO.status = 'Ordered'
        await draftPO.save()

        await ActivityLogService.log(
            user,
            "Marked Draft PO as Ordered",
            "DraftPurchaseOrder",
            draftPO._id,
            `Purchase order placed for ${draftPO.product.name}`
        )

        return draftPO
    }

    static async getPendingApprovals(user) {
        const pendingPOs = await DraftPurchaseOrderModel.find({
            status: 'Pending_Approval'
        })
            .populate('user', 'name email')
            .populate('product', 'name sku price')
            .populate('reorderSuggestion', 'suggestedQuantity')
            .sort({ createdAt: -1 })
            .lean()

        return pendingPOs
    }
}

const ReorderSuggestionService = require("./ReorderSuggestion.service")

module.exports = DraftPurchaseOrderService
