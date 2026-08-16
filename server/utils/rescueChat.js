const MAX_RESCUE_MESSAGE_LENGTH = 2000;

exports.MAX_RESCUE_MESSAGE_LENGTH = MAX_RESCUE_MESSAGE_LENGTH;

exports.validateRescueMessage = (content) => {
  if (typeof content !== 'string') return { ok: false, error: 'Message content must be text' };
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: 'Message cannot be empty' };
  if (trimmed.length > MAX_RESCUE_MESSAGE_LENGTH) {
    return { ok: false, error: `Message must be ${MAX_RESCUE_MESSAGE_LENGTH} characters or fewer` };
  }
  return { ok: true, content: trimmed };
};
