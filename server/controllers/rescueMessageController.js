const RescueMessage = require('../models/RescueMessage');
const Report = require('../models/Report');

// @desc    Get chat history for a specific rescue report
// @route   GET /api/rescue-messages/:reportId
exports.getRescueChatHistory = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // Check if report exists
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Rescue report not found' });
    }

    // Optional: Check permissions here. Allow if user is primary, backup, monitor, or reporter
    // For now, if they are authenticated, we let them fetch (or you can add strict checks)
    
    const messages = await RescueMessage.find({ report_id: reportId })
      .populate('sender', 'name profile_image_url role hero_level')
      .sort({ created_at: 1 }); // Oldest first

    res.json(messages);
  } catch (error) {
    console.error(`[RESCUE_CHAT_ERROR] getRescueChatHistory: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch chat history' });
  }
};
