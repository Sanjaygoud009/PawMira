const express = require('express');
const router = express.Router();
const { getGlobalLeaderboard, getAreaLeaderboard } = require('../controllers/leaderboardController');

router.get('/global', getGlobalLeaderboard);
router.get('/area', getAreaLeaderboard);

module.exports = router;
