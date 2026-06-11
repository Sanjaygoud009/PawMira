const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getRescueChatHistory } = require('../controllers/rescueMessageController');

router.use(protect);

router.get('/:reportId', getRescueChatHistory);

module.exports = router;
