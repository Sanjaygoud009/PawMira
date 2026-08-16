const ALLOWED_STATUSES = new Set(['open', 'in_progress', 'under_treatment', 'safe', 'inactive']);
const ALLOWED_PRIORITIES = new Set(['low', 'medium', 'high', 'critical']);

const parseStrictNumber = (value, name, { min, max, integer = false } = {}) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} must be a number`);
  }

  const normalized = value.trim();
  const numericPattern = integer ? /^\d+$/ : /^[+-]?(?:\d+\.?\d*|\.\d+)$/;
  if (!numericPattern.test(normalized)) {
    throw new Error(`${name} must be a valid ${integer ? 'integer' : 'number'}`);
  }

  const number = Number(normalized);
  if (!Number.isFinite(number) || (integer && !Number.isInteger(number)) || number < min || number > max) {
    throw new Error(`${name} must be between ${min} and ${max}`);
  }

  return number;
};

const parseOptionalBoolean = (value, name) => {
  if (value === undefined) return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be true or false`);
};

exports.parseReportsQuery = (query) => {
  const { status, priority, lat, lng, radius, page, limit, include_safe } = query;

  if (status !== undefined && (typeof status !== 'string' || !ALLOWED_STATUSES.has(status))) {
    throw new Error('Invalid status value');
  }
  if (priority !== undefined && (typeof priority !== 'string' || !ALLOWED_PRIORITIES.has(priority))) {
    throw new Error('Invalid priority value');
  }

  const hasLat = lat !== undefined;
  const hasLng = lng !== undefined;
  if (hasLat !== hasLng) throw new Error('lat and lng must be provided together');

  const parsed = {
    status,
    priority,
    page: page === undefined ? 1 : parseStrictNumber(page, 'page', { min: 1, max: 1000000, integer: true }),
    limit: limit === undefined ? 20 : parseStrictNumber(limit, 'limit', { min: 1, max: 50, integer: true }),
    includeSafe: parseOptionalBoolean(include_safe, 'include_safe'),
  };

  if (hasLat) {
    parsed.lat = parseStrictNumber(lat, 'lat', { min: -90, max: 90 });
    parsed.lng = parseStrictNumber(lng, 'lng', { min: -180, max: 180 });
    parsed.radius = radius === undefined
      ? 50000
      : parseStrictNumber(radius, 'radius', { min: 1, max: 500000, integer: true });
  } else if (radius !== undefined) {
    throw new Error('radius requires lat and lng');
  }

  return parsed;
};

exports.ALLOWED_STATUSES = ALLOWED_STATUSES;
exports.ALLOWED_PRIORITIES = ALLOWED_PRIORITIES;
