const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMessages,
  sendMessage,
  editMessage
} = require('../controllers/messagesController');

router.use(protect);

router.get('/', getMessages);
router.post('/', sendMessage);
router.put('/:id', editMessage);

module.exports = router;
