const express = require('express');
const router = express.Router();
const { handleWhatsApp } = require('../controllers/whatsappController');
const { validateTwilioSignature, getWebhookUrl } = require('../utils/twilioWebhook');

router.post('/', validateTwilioSignature, handleWhatsApp);

module.exports = router;
module.exports.validateTwilioSignature = validateTwilioSignature;
module.exports.getWebhookUrl = getWebhookUrl;
