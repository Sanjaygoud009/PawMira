'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Report = require('./models/Report');
const { isValidCoordinates } = require('./utils/coordinates');
const { buildGeoQuery, createEscalationWorker } = require('./services/escalationService');

const get = (object, path) => path.split('.').reduce((value, key) => value && value[key], object);
const set = (object, path, value) => {
  const parts = path.split('.');
  const last = parts.pop();
  const parent = parts.reduce((value, key) => (value[key] ||= {}), object);
  parent[last] = value;
};
const unset = (object, path) => {
  const parts = path.split('.');
  const last = parts.pop();
  const parent = parts.reduce((value, key) => value && value[key], object);
  if (parent) delete parent[last];
};

const makeReport = (overrides = {}) => ({
  _id: 'report-1', status: 'open', is_deleted: false, escalation_level: 0,
  response_deadline: new Date(0), priority: 'high',
  location: { type: 'Point', coordinates: [78.4867, 17.385] },
  notification_jobs: { initial_volunteer: { state: 'pending' } },
  timeline: [], ...overrides,
});

const makeReportModel = (documents) => ({
  async findOneAndUpdate(filter, update) {
    const document = documents.find((candidate) => {
      if (filter._id && candidate._id !== filter._id) return false;
      if (filter.escalation_level !== undefined && candidate.escalation_level !== filter.escalation_level) return false;
      if (filter.status && candidate.status !== filter.status) return false;
      if (filter.is_deleted !== undefined && candidate.is_deleted !== filter.is_deleted) return false;
      if (filter.response_deadline && candidate.response_deadline > filter.response_deadline.$lte) return false;
      if (filter.$or) return filter.$or.some((condition) => Object.entries(condition).every(([path, expected]) => {
        const actual = get(candidate, path);
        return expected && expected.$lte ? actual <= expected.$lte : actual === expected;
      }));
      return true;
    });
    if (!document) return null;
    for (const [path, value] of Object.entries(update.$set || {})) set(document, path, value);
    if (update.$push?.timeline) document.timeline.push(update.$push.timeline);
    return document;
  },
  async updateOne(filter, update) {
    const document = documents.find((candidate) => Object.entries(filter).every(([path, expected]) => get(candidate, path) === expected));
    if (!document) return { modifiedCount: 0 };
    for (const [path, value] of Object.entries(update.$set || {})) set(document, path, value);
    for (const path of Object.keys(update.$unset || {})) unset(document, path);
    return { modifiedCount: 1 };
  },
});

const makeUsers = ({ volunteers = [], ngos = [], admins = [] } = {}) => ({
  find: (query) => ({ select: () => ({ lean: async () => {
    if (query.role === 'volunteer') return volunteers;
    if (query.role === 'ngo') return ngos;
    if (query.role === 'admin') return admins;
    return [];
  } }), }),
});

const makeNotifications = ({ failAfter = null } = {}) => {
  const rows = new Map();
  let calls = 0;
  return {
    rows,
    async bulkWrite(operations) {
      calls += 1;
      for (let index = 0; index < operations.length; index += 1) {
        const notification = operations[index].updateOne.update.$setOnInsert;
        const key = `${notification.user_id}:${notification.reference_id}:${notification.notification_event}`;
        if (!rows.has(key)) rows.set(key, notification);
        if (failAfter !== null && calls === 1 && index === failAfter) throw new Error('simulated partial write');
      }
    },
  };
};

test('coordinates require exactly valid longitude and latitude values', () => {
  for (const coordinates of [[-180, -90], [180, 90], [78.4867, 17.385]]) assert.equal(isValidCoordinates(coordinates), true);
  for (const coordinates of [[-180.1, 0], [180.1, 0], [0, -90.1], [0, 90.1], [0], [0, 0, 1], ['0', 0], [Infinity, 0]]) {
    assert.equal(isValidCoordinates(coordinates), false);
    assert.equal(buildGeoQuery(coordinates, 10000), null);
  }
});

test('Report schema enforces the coordinate invariant', async () => {
  const invalid = new Report({ reporter_phone: '1', issue_type: 'other', location: { type: 'Point', coordinates: [181, 0] } });
  await assert.rejects(invalid.validate());
  const valid = new Report({ reporter_phone: '1', issue_type: 'other', location: { type: 'Point', coordinates: [180, 90] } });
  await valid.validate();
});

test('initial volunteer notification is idempotent and zero recipients completes normally', async () => {
  const report = makeReport();
  const notifications = makeNotifications();
  let clock = new Date(1000);
  const worker = createEscalationWorker({ ReportModel: makeReportModel([report]), NotificationModel: notifications, UserModel: makeUsers(), now: () => clock, createLeaseOwner: () => 'owner-1' });
  assert.equal(await worker.processNotificationJob(report._id, 'initial_volunteer'), true);
  assert.equal(report.notification_jobs.initial_volunteer.state, 'completed');
  assert.equal(notifications.rows.size, 0);
});

test('partial notification persistence retries only missing initial-volunteer rows', async () => {
  const report = makeReport();
  const notifications = makeNotifications({ failAfter: 0 });
  const users = makeUsers({ volunteers: [{ _id: 'vol-1' }, { _id: 'vol-2' }] });
  let clock = new Date(1000);
  const worker = createEscalationWorker({ ReportModel: makeReportModel([report]), NotificationModel: notifications, UserModel: users, now: () => clock, createLeaseOwner: () => `owner-${clock.getTime()}` });
  assert.equal(await worker.processNotificationJob(report._id, 'initial_volunteer'), false);
  assert.equal(notifications.rows.size, 1);
  clock = new Date(clock.getTime() + 120001);
  assert.equal(await worker.processNotificationJob(report._id, 'initial_volunteer'), true);
  assert.equal(notifications.rows.size, 2);
  assert.equal(report.notification_jobs.initial_volunteer.state, 'completed');
});

test('concurrent workers receive only one lease and expired leases recover', async () => {
  const report = makeReport();
  const notifications = makeNotifications();
  let clock = new Date(1000);
  const options = { ReportModel: makeReportModel([report]), NotificationModel: notifications, UserModel: makeUsers({ volunteers: [{ _id: 'vol-1' }] }), now: () => clock };
  const first = createEscalationWorker({ ...options, createLeaseOwner: () => 'first' });
  const second = createEscalationWorker({ ...options, createLeaseOwner: () => 'second' });
  const [one, two] = await Promise.all([first.processNotificationJob(report._id, 'initial_volunteer'), second.processNotificationJob(report._id, 'initial_volunteer')]);
  assert.deepEqual([one, two].sort(), [false, true]);
  assert.equal(notifications.rows.size, 1);

  const retry = makeReport();
  const retryWorker = createEscalationWorker({ ...options, ReportModel: makeReportModel([retry]), createLeaseOwner: () => 'expired-owner' });
  assert.ok(await retryWorker.claimNotificationJob('initial_volunteer', retry._id));
  clock = new Date(clock.getTime() + 120001);
  assert.equal(await retryWorker.processNotificationJob(retry._id, 'initial_volunteer'), true);
  assert.equal(retry.notification_jobs.initial_volunteer.state, 'completed');
});

test('one escalation atomically creates distinct NGO and admin jobs with idempotent writes', async () => {
  const report = makeReport({ notification_jobs: {} });
  const notifications = makeNotifications();
  const worker = createEscalationWorker({
    ReportModel: makeReportModel([report]), NotificationModel: notifications,
    UserModel: makeUsers({ ngos: [{ _id: 'ngo-1' }], admins: [{ _id: 'admin-1' }] }),
    now: () => new Date(1000), createLeaseOwner: () => 'owner',
  });
  await worker.runEscalation();
  assert.equal(report.escalation_level, 1);
  assert.equal(report.timeline.filter((event) => event.event_type === 'escalated').length, 1);
  assert.equal(report.notification_jobs.escalation_ngo.state, 'completed');
  assert.equal(report.notification_jobs.escalation_admin.state, 'completed');
  assert.equal(notifications.rows.size, 2);
  await worker.runEscalation();
  assert.equal(report.timeline.filter((event) => event.event_type === 'escalated').length, 1);
  assert.equal(notifications.rows.size, 2);
});

test('invalid report coordinates skip NGO delivery but retain global admin escalation', async () => {
  const report = makeReport({ location: { type: 'Point', coordinates: [200, 0] }, notification_jobs: {
    escalation_ngo: { state: 'pending' }, escalation_admin: { state: 'pending' },
  } });
  const notifications = makeNotifications();
  const worker = createEscalationWorker({
    ReportModel: makeReportModel([report]), NotificationModel: notifications,
    UserModel: makeUsers({ ngos: [{ _id: 'ngo-1' }], admins: [{ _id: 'admin-1' }] }),
    now: () => new Date(1000), createLeaseOwner: () => 'owner',
  });
  assert.equal(await worker.processNotificationJob(report._id, 'escalation_ngo'), true);
  assert.equal(await worker.processNotificationJob(report._id, 'escalation_admin'), true);
  assert.equal(notifications.rows.size, 1);
  assert.equal([...notifications.rows.values()][0].notification_event, 'escalation_admin');
});
