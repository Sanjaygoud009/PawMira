const mongoose = require('mongoose');
const crypto = require('crypto');

// The encryption key must be exactly 32 bytes (256 bits) for aes-256-cbc.
// It MUST come from the environment — there is intentionally no hardcoded fallback.
// Silently using a default key would encrypt new messages with a key that cannot
// decrypt previously stored messages once a real key is configured, and it would
// ship a known weak key in source control.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || Buffer.byteLength(ENCRYPTION_KEY, 'utf8') !== 32) {
  throw new Error(
    '[CONFIG_ERROR] ENCRYPTION_KEY environment variable is required and must be ' +
    'exactly 32 bytes (256 bits) for aes-256-cbc message encryption. ' +
    'Current length: ' + (ENCRYPTION_KEY ? Buffer.byteLength(ENCRYPTION_KEY, 'utf8') : 0) + ' bytes.'
  );
}

const IV_LENGTH = 16; // For AES, this is always 16

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: false for broadcast messages
  },
  content: {
    type: String,
    required: true,
  },
  is_read: {
    type: Boolean,
    default: false,
  },
  is_edited: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt content before saving
MessageSchema.pre('save', function (next) {
  if (this.isModified('content')) {
    try {
      let iv = crypto.randomBytes(IV_LENGTH);
      let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
      let encrypted = cipher.update(this.content);
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      this.content = iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Decrypt content when accessing
MessageSchema.methods.getDecryptedContent = function () {
  try {
    let textParts = this.content.split(':');
    if (textParts.length !== 2) return this.content; // Fallback for unencrypted old messages if any
    
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (err) {
    console.error('Decryption failed for message ID:', this._id);
    return '[Encrypted Content Unavailable]';
  }
};

module.exports = mongoose.model('Message', MessageSchema);
