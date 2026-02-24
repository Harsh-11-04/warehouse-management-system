const httpStatus = require("http-status")
const CatchAsync = require("../utils/CatchAsync")
const DraftPurchaseOrderService = require("../services/DraftPurchaseOrder.service")

class DraftPurchaseOrderController {
    static createDraftPurchaseOrder = CatchAsync(async (req, res) => {
        const { reorderSuggestionId, approvedQuantity, supplier, estimatedCost } = req.body
        const res_obj = await DraftPurchaseOrderService.createDraftPurchaseOrder(
            req?.user, 
            reorderSuggestionId, 
            approvedQuantity, 
            supplier, 
            estimatedCost
        )
        return res.status(httpStatus.CREATED).json(res_obj)
    })

    static getDraftPurchaseOrders = CatchAsync(async (req, res) => {
        const { status } = req.query
        const res_obj = await DraftPurchaseOrderService.getDraftPurchaseOrders(req?.user, status)
        return res.status(httpStatus.OK).json({ draftPurchaseOrders: res_obj })
    })

    static updateDraftPurchaseOrder = CatchAsync(async (req, res) => {
        const { id } = req.params
        const res_obj = await DraftPurchaseOrderService.updateDraftPurchaseOrder(req?.user, id, req.body)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static submitForApproval = CatchAsync(async (req, res) => {
        const { id } = req.params
        const res_obj = await DraftPurchaseOrderService.submitForApproval(req?.user, id)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static approveDraftPurchaseOrder = CatchAsync(async (req, res) => {
        const { id } = req.params
        const res_obj = await DraftPurchaseOrderService.approveDraftPurchaseOrder(req?.user, id)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static rejectDraftPurchaseOrder = CatchAsync(async (req, res) => {
        const { id } = req.params
        const { reason } = req.body
        const res_obj = await DraftPurchaseOrderService.rejectDraftPurchaseOrder(req?.user, id, reason)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static markAsOrdered = CatchAsync(async (req, res) => {
        const { id } = req.params
        const res_obj = await DraftPurchaseOrderService.markAsOrdered(req?.user, id)
        return res.status(httpStatus.OK).json(res_obj)
    })

    static getPendingApprovals = CatchAsync(async (req, res) => {
        const res_obj = await DraftPurchaseOrderService.getPendingApprovals(req?.user)
        return res.status(httpStatus.OK).json({ pendingApprovals: res_obj })
    })
}

module.exports = DraftPurchaseOrderController
