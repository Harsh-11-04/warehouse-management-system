const httpStatus = require("http-status");
const ReorderSuggestionService = require("../services/ReorderSuggestion.service");
const catchAsync = require("../utils/CatchAsync");

class ReorderSuggestionController {
    static getAllSuggestions = catchAsync(async (req, res) => {
        const suggestions = await ReorderSuggestionService.getAllSuggestions(req.user._id);
        res.status(httpStatus.OK).send(suggestions);
    });

    static updateStatus = catchAsync(async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        const suggestion = await ReorderSuggestionService.updateSuggestionStatus(req.user._id, id, status);
        res.status(httpStatus.OK).send({ msg: `Suggestion marked as ${status}`, suggestion });
    });
}

module.exports = ReorderSuggestionController;
