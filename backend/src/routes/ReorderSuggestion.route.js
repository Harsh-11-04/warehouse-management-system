const router = require("express").Router();
const ReorderSuggestionController = require("../controllers/ReorderSuggestion.controller");
const Authentication = require("../middlewares/Authentication");

router.get("/", Authentication, ReorderSuggestionController.getAllSuggestions);
router.patch("/:id/status", Authentication, ReorderSuggestionController.updateStatus);

module.exports = router;
