const mongoose = require('mongoose');
const RescueMessage = require('../models/RescueMessage');
const Report = require('../models/Report');
const { canAccessRescueChat } = require('../utils/reportAuthorization');

// @desc    Get chat history for a specific rescue report
// @route   GET /api/rescue-messages/:reportId
exports.getRescueChatHistory = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({ message: 'Invalid report ID format' });
    }

    // Check if report exists
    const report = await Report.findById(reportId);
    if (!report || report.is_deleted) {
      return res.status(404).json({ message: 'Rescue report not found' });
    }

    if (!canAccessRescueChat(report, req.user)) {
      return res.status(403).json({ message: 'Not authorized to view this rescue chat' });
    }

    const messages = await RescueMessage.find({ report_id: reportId })
      .populate('sender', 'name profile_image_url role hero_level')
      .sort({ created_at: 1 }); // Oldest first

    res.json(messages);
  } catch (error) {
    console.error(`[RESCUE_CHAT_ERROR] getRescueChatHistory: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch chat history' });
  }
};
