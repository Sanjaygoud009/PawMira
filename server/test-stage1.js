const assert = require('node:assert/strict');
const test = require('node:test');
const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const { parseReportsQuery } = require('./utils/reportQuery');
const { canManageReport, canAccessRescueChat } = require('./utils/reportAuthorization');
const { validateRescueMessage } = require('./utils/rescueChat');
const { authenticateSocket } = require('./utils/socketAuth');
const { buildWhatsAppReportData } = require('./utils/whatsappReport');
const { validateTwilioSignature } = require('./utils/twilioWebhook');
const { emitReportResponderUpdate, REPORT_RESPONDER_UPDATED, reportRoom } = require('./utils/reportRealtime');
const { cleanupRejectedImage, validateReportImageAnalysis, validateRescueProofAnalysis } = require('./utils/imageValidator');

const id = (value) => ({ toString: () => value });
const report = {
  reporter_id: id('reporter'),
  primary_responder: id('primary'),
  backup_responders: [id('backup')],
  monitors: [id('monitor')],
};
const user = (value, role = 'volunteer') => ({ _id: id(value), role });

test('report query validation rejects malformed and unsafe values', () => {
  assert.deepEqual(parseReportsQuery({ status: 'open', priority: 'high', lat: '17.385', lng: '78.4867', radius: '50000', page: '2', limit: '20' }), {
    status: 'open', priority: 'high', lat: 17.385, lng: 78.4867, radius: 50000, page: 2, limit: 20, includeSafe: false,
  });
  assert.equal(parseReportsQuery({ lat: '0', lng: '0' }).lat, 0);
  for (const query of [
    { limit: '20abc' }, { lat: 'abc', lng: '1' }, { lat: '91', lng: '1' },
    { lat: '1', lng: 'Infinity' }, { lat: '1', lng: '2', radius: '-1' },
    { status: 'pending' }, { priority: 'urgent' }, { radius: '50' }, { include_safe: 'yes' },
  ]) assert.throws(() => parseReportsQuery(query));
});

test('report and chat authorization enforce the intended participant roles', () => {
  for (const participant of ['reporter', 'primary', 'backup']) assert.equal(canManageReport(report, user(participant)), true);
  assert.equal(canManageReport(report, user('monitor')), false);
  assert.equal(canManageReport(report, user('admin-user', 'admin')), true);
  for (const participant of ['reporter', 'primary', 'backup', 'monitor']) assert.equal(canAccessRescueChat(report, user(participant)), true);
  assert.equal(canAccessRescueChat(report, user('outsider')), false);
});

test('socket authentication accepts a valid JWT and rejects missing/invalid tokens', async () => {
  const secret = 'stage1-test-secret';
  const validToken = jwt.sign({ id: 'user-1' }, secret);
  const fakeUser = { _id: id('user-1'), role: 'volunteer' };
  const fakeUsers = { findById: () => ({ select: async () => fakeUser }) };
  const socket = { handshake: { auth: { token: validToken }, headers: {} } };
  await authenticateSocket(socket, (error) => assert.equal(error, undefined), { jwt, User: fakeUsers, jwtSecret: secret });
  assert.equal(socket.user, fakeUser);

  const missingSocket = { handshake: { auth: {}, headers: {} } };
  await authenticateSocket(missingSocket, (error) => assert.match(error.message, /Token missing/), { jwt, User: fakeUsers, jwtSecret: secret });
  const invalidSocket = { handshake: { auth: { token: 'invalid' }, headers: {} } };
  await authenticateSocket(invalidSocket, (error) => assert.match(error.message, /Invalid token/), { jwt, User: fakeUsers, jwtSecret: secret });
});

test('rescue messages are trimmed and bounded without trusting client metadata', () => {
  assert.deepEqual(validateRescueMessage('  hello  '), { ok: true, content: 'hello' });
  assert.equal(validateRescueMessage('   ').ok, false);
  assert.equal(validateRescueMessage({ text: 'no' }).ok, false);
  assert.equal(validateRescueMessage('x'.repeat(2001)).ok, false);
});

test('WhatsApp report payload uses the Report schema status model', () => {
  const payload = buildWhatsAppReportData({ image_url: 'image', description: 'help', longitude: 78.4, latitude: 17.3 }, 'whatsapp:+911234');
  assert.equal(payload.status, 'open');
  assert.equal(payload.history[0].status, 'open');
});

test('Twilio validation accepts a correctly signed deployed request and rejects missing configuration', () => {
  const previous = { NODE_ENV: process.env.NODE_ENV, RENDER: process.env.RENDER, TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN, WHATSAPP_WEBHOOK_URL: process.env.WHATSAPP_WEBHOOK_URL };
  const token = 'twilio-stage1-token';
  const url = 'https://pawmira.in/api/whatsapp';
  const body = { From: 'whatsapp:+911234', Body: 'YES' };
  process.env.NODE_ENV = 'production';
  process.env.TWILIO_AUTH_TOKEN = token;
  process.env.WHATSAPP_WEBHOOK_URL = url;
  const signature = twilio.getExpectedTwilioSignature(token, url, body);
  const request = { headers: { 'x-twilio-signature': signature }, body, protocol: 'https', get: () => 'pawmira.in', originalUrl: '/api/whatsapp' };
  let nextCalled = false;
  validateTwilioSignature(request, { status: () => ({ json: () => assert.fail('unexpected rejection') }) }, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  process.env.TWILIO_AUTH_TOKEN = '';
  let statusCode;
  validateTwilioSignature(request, { status: (code) => { statusCode = code; return { json: () => {} }; } }, () => assert.fail('unexpected acceptance'));
  assert.equal(statusCode, 503);
  Object.assign(process.env, previous);
});

test('report responder updates emit only to the affected report room', () => {
  const emitted = [];
  const io = { to: (room) => ({ emit: (event, payload) => emitted.push({ room, event, payload }) }) };
  const updatedReport = { _id: 'report-1', primary_responder: { _id: 'user-1', name: 'Lead' }, backup_responders: [] };
  emitReportResponderUpdate(io, updatedReport);
  assert.deepEqual(emitted, [{ room: reportRoom('report-1'), event: REPORT_RESPONDER_UPDATED, payload: { report: updatedReport } }]);
  emitReportResponderUpdate(io, null);
  assert.equal(emitted.length, 1);
});

test('report realtime client helper merges state and cleans up its listener', async () => {
  const { REPORT_RESPONDER_UPDATED, mergeReportUpdate, subscribeToReportUpdates } = await import('../client/src/utils/reportRealtime.js');
  const listeners = new Map();
  const socket = {
    on: (event, listener) => listeners.set(event, listener),
    off: (event, listener) => { if (listeners.get(event) === listener) listeners.delete(event); },
  };
  const current = [{ _id: 'report-1', status: 'open', backup_responders: [] }, { _id: 'report-2', status: 'open' }];
  const updated = { _id: 'report-1', status: 'in_progress', primary_responder: { _id: 'user-1', name: 'Lead' }, backup_responders: [] };
  assert.deepEqual(mergeReportUpdate(current, updated), [updated, current[1]]);
  const handler = () => {};
  const unsubscribe = subscribeToReportUpdates(socket, handler);
  assert.equal(listeners.get(REPORT_RESPONDER_UPDATED), handler);
  unsubscribe();
  assert.equal(listeners.has(REPORT_RESPONDER_UPDATED), false);
});

test('rescue proof validation accepts animal photos and responder-with-animal photos', () => {
  assert.equal(validateRescueProofAnalysis({ isValidLiveAnimal: true, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: false, isSameAnimal: true }).isRescueProof, true);
  assert.equal(validateRescueProofAnalysis({ isValidLiveAnimal: true, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: false, isSameAnimal: true, reason: 'Responder holding a dog' }).isRescueProof, true);
});

test('rescue proof validation rejects responder-only selfies and images without animals', () => {
  for (const analysis of [
    { isValidLiveAnimal: false, isFakeOrExtinct: false, isHumanOnly: true, isUnclear: false, isSameAnimal: false },
    { isValidLiveAnimal: false, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: false, isSameAnimal: false },
  ]) {
    const result = validateRescueProofAnalysis(analysis);
    assert.equal(result.isRescueProof, false);
  }
});

test('rescue proof validation fails safely when AI output is unavailable or malformed', () => {
  const result = validateRescueProofAnalysis(null);
  assert.equal(result.isRescueProof, false);
  assert.equal(result.serviceError, true);
});

test('initial report image validation accepts animal-only and human-with-animal photos', () => {
  for (const analysis of [
    { isValidLiveAnimal: true, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: false },
    { isValidLiveAnimal: true, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: false, description: 'Person holding a dog' },
  ]) assert.equal(validateReportImageAnalysis(analysis).isAnimal, true);
});

test('initial report image validation rejects selfies, non-animal images, and unclear results', () => {
  for (const analysis of [
    { isValidLiveAnimal: false, isFakeOrExtinct: false, isHumanOnly: true, isUnclear: false },
    { isValidLiveAnimal: false, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: false },
    { isValidLiveAnimal: false, isFakeOrExtinct: false, isHumanOnly: false, isUnclear: true },
    { isValidLiveAnimal: false, isFakeOrExtinct: true, isHumanOnly: false, isUnclear: false }, // added for toy/dinosaur
  ]) assert.equal(validateReportImageAnalysis(analysis).isAnimal, false);
  assert.equal(validateReportImageAnalysis(null).serviceError, true);
});

test('rejected Cloudinary images are cleaned up when an upload has a filename', async () => {
  const destroyed = [];
  await cleanupRejectedImage({ filename: 'rejected-image' }, { destroy: async (filename) => destroyed.push(filename) });
  await cleanupRejectedImage({ path: 'no-filename' }, { destroy: async () => assert.fail('unexpected cleanup') });
  assert.deepEqual(destroyed, ['rejected-image']);
});
