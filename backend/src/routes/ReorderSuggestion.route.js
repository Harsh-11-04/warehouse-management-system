const router = require("express").Router();
const ReorderSuggestionController = require("../controllers/ReorderSuggestion.controller");
const Authentication = require("../middlewares/Authentication");
const authorize = require("../middlewares/Authorization");

// Only admin and manager can view and manage reorder suggestions
router.get("/", Authentication, authorize('admin', 'manager'), ReorderSuggestionController.getAllSuggestions);
router.patch("/:id/status", Authentication, authorize('admin', 'manager'), ReorderSuggestionController.updateStatus);

module.exports = router;
