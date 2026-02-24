const express = require("express")
const router = express.Router()
const DraftPurchaseOrderController = require("../controllers/DraftPurchaseOrder.controller")
const { authMiddleware, staffOrAbove, managerOrAdmin } = require("../middlewares/rbac.middleware")

router.use(authMiddleware)

router.post("/", staffOrAbove, DraftPurchaseOrderController.createDraftPurchaseOrder)
router.get("/", staffOrAbove, DraftPurchaseOrderController.getDraftPurchaseOrders)
router.put("/:id", staffOrAbove, DraftPurchaseOrderController.updateDraftPurchaseOrder)
router.post("/:id/submit", staffOrAbove, DraftPurchaseOrderController.submitForApproval)
router.post("/:id/approve", managerOrAdmin, DraftPurchaseOrderController.approveDraftPurchaseOrder)
router.post("/:id/reject", managerOrAdmin, DraftPurchaseOrderController.rejectDraftPurchaseOrder)
router.post("/:id/mark-ordered", staffOrAbove, DraftPurchaseOrderController.markAsOrdered)
router.get("/pending-approvals", managerOrAdmin, DraftPurchaseOrderController.getPendingApprovals)

module.exports = router
