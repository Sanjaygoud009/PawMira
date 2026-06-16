const User = require('../models/User');

// @desc    Get Global Leaderboard
// @route   GET /api/leaderboards/global
exports.getGlobalLeaderboard = async (req, res) => {
  try {
    const heroes = await User.find({ hearts: { $gt: 0 }, isVerified: true })
      .select('name hearts hero_level rescue_count reunited_pets_count city state service_area')
      .sort({ hearts: -1 })
      .limit(50);
      
    res.json(heroes);
  } catch (error) {
    console.error(`[LEADERBOARD_ERROR] getGlobal: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch global leaderboard' });
  }
};

// @desc    Get Area Leaderboard
// @route   GET /api/leaderboards/area
exports.getAreaLeaderboard = async (req, res) => {
  try {
    const { service_area } = req.query;
    if (!service_area) {
      return res.status(400).json({ message: 'service_area is required' });
    }

    const heroes = await User.find({ 
      service_area: new RegExp(`^${service_area}$`, 'i'),
      hearts: { $gt: 0 },
      isVerified: true
    })
      .select('name hearts hero_level rescue_count reunited_pets_count city state service_area')
      .sort({ hearts: -1 })
      .limit(50);
      
    res.json(heroes);
  } catch (error) {
    console.error(`[LEADERBOARD_ERROR] getArea: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch area leaderboard' });
  }
};
