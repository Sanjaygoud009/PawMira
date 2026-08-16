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
