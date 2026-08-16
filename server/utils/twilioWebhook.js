const twilio = require('twilio');

const isExplicitLocalDevelopment = () => (
  process.env.NODE_ENV === 'development'
  && !process.env.RENDER
  && !process.env.RENDER_EXTERNAL_URL
);

const getWebhookUrl = (req) => {
  if (process.env.WHATSAPP_WEBHOOK_URL) return process.env.WHATSAPP_WEBHOOK_URL;
  return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
};

const validateTwilioSignature = (req, res, next) => {
  if (isExplicitLocalDevelopment()) return next();

  if (!process.env.TWILIO_AUTH_TOKEN) {
    console.error('[SECURITY] TWILIO_AUTH_TOKEN is not configured – rejecting webhook');
    return res.status(503).json({ message: 'Webhook validation not configured' });
  }

  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    req.headers['x-twilio-signature'],
    getWebhookUrl(req),
    req.body || {}
  );

  if (!isValid) {
    console.warn('[SECURITY] Invalid Twilio webhook signature');
    return res.status(403).json({ message: 'Twilio signature validation failed' });
  }
  return next();
};

module.exports = { validateTwilioSignature, getWebhookUrl };
