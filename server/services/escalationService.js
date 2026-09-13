'use strict';

const crypto = require('crypto');
const cron = require('node-cron');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { isValidCoordinates } = require('../utils/coordinates');

const EARTH_RADIUS_M = 6378100;
const VOLUNTEER_RADIUS_NEAR_M = 10000;
const VOLUNTEER_RADIUS_FAR_M = 25000;
const NGO_RADIUS_M = 25000;
const LEASE_MS = 2 * 60 * 1000;
const JOB_KEYS = ['initial_volunteer', 'escalation_ngo', 'escalation_admin'];

const buildGeoQuery = (coordinates, radiusM) => {
  if (!isValidCoordinates(coordinates)) return null;
  return { location: { $geoWithin: { $centerSphere: [coordinates, radiusM / EARTH_RADIUS_M] } } };
};

const findNearbyUsers = async (role, coordinates, radiusM, UserModel = User) => {
  const geoQuery = buildGeoQuery(coordinates, radiusM);
  if (!geoQuery) return [];
  return UserModel.find({ role, isVerified: true, ...geoQuery }).select('_id').lean();
};

const jobPath = (key, field) => `notification_jobs.${key}.${field}`;

const jobClaimFilter = (key, now) => ({
  $or: [
    { [jobPath(key, 'state')]: 'pending' },
    { [jobPath(key, 'state')]: 'processing', [jobPath(key, 'lease_expires_at')]: { $lte: now } },
  ],
});

const buildNotificationOperations = (notifications) => notifications.map((notification) => ({
  updateOne: {
    filter: {
      user_id: notification.user_id,
      reference_id: notification.reference_id,
      reference_model: notification.reference_model,
      notification_event: notification.notification_event,
    },
    update: { $setOnInsert: notification },
    upsert: true,
  },
}));

const buildNotifications = async (report, key, UserModel) => {
  const reference = { reference_id: report._id, reference_model: 'Report' };
  if (key === 'initial_volunteer') {
    const coordinates = report.location?.coordinates;
    let volunteers = await findNearbyUsers('volunteer', coordinates, VOLUNTEER_RADIUS_NEAR_M, UserModel);
    if (volunteers.length === 0) volunteers = await findNearbyUsers('volunteer', coordinates, VOLUNTEER_RADIUS_FAR_M, UserModel);
    return volunteers.map((user) => ({
      user_id: user._id, type: 'escalation', title: 'Urgent Rescue Needed',
      message: `A ${report.priority} priority rescue near you needs a responder. Can you help?`,
      notification_event: 'initial_volunteer', ...reference,
    }));
  }
  if (key === 'escalation_ngo') {
    const ngos = await findNearbyUsers('ngo', report.location?.coordinates, NGO_RADIUS_M, UserModel);
    return ngos.map((user) => ({
      user_id: user._id, type: 'escalation', title: 'NGO Support Needed',
      message: 'An emergency rescue near you has been unattended. Please respond!',
      notification_event: 'escalation_ngo', ...reference,
    }));
  }
  if (key === 'escalation_admin') {
    const admins = await UserModel.find({ role: 'admin', isVerified: true }).select('_id').lean();
    return admins.map((user) => ({
      user_id: user._id, type: 'system', title: 'Escalated Emergency Alert',
      message: `Report ${report._id} has been unattended past its deadline and has been escalated. Immediate review required.`,
      notification_event: 'escalation_admin', ...reference,
    }));
  }
  throw new Error(`Unknown notification job: ${key}`);
};

const createEscalationWorker = ({
  ReportModel = Report,
  NotificationModel = Notification,
  UserModel = User,
  now = () => new Date(),
  createLeaseOwner = () => crypto.randomUUID(),
} = {}) => {
  const claimNotificationJob = async (key, reportId) => {
    const claimedAt = now();
    const leaseOwner = createLeaseOwner();
    const filter = jobClaimFilter(key, claimedAt);
    if (reportId) filter._id = reportId;
    const report = await ReportModel.findOneAndUpdate(filter, {
      $set: {
        [jobPath(key, 'state')]: 'processing',
        [jobPath(key, 'lease_owner')]: leaseOwner,
        [jobPath(key, 'lease_expires_at')]: new Date(claimedAt.getTime() + LEASE_MS),
      },
    }, { new: true, lean: true });
    return report ? { report, leaseOwner } : null;
  };

  const completeNotificationJob = async (reportId, key, leaseOwner) => {
    const result = await ReportModel.updateOne({
      _id: reportId,
      [jobPath(key, 'state')]: 'processing',
      [jobPath(key, 'lease_owner')]: leaseOwner,
    }, {
      $set: { [jobPath(key, 'state')]: 'completed' },
      $unset: { [jobPath(key, 'lease_owner')]: '', [jobPath(key, 'lease_expires_at')]: '' },
    });
    return result.modifiedCount === 1;
  };

  const processNotificationJob = async (reportId, key) => {
    const claim = await claimNotificationJob(key, reportId);
    if (!claim) return false;
    try {
      const notifications = await buildNotifications(claim.report, key, UserModel);
      if (notifications.length) {
        await NotificationModel.bulkWrite(buildNotificationOperations(notifications), { ordered: false });
      }
      return completeNotificationJob(claim.report._id, key, claim.leaseOwner);
    } catch (error) {
      // Keep the lease until expiry. A retry can upsert missing recipients
      // without duplicating records already written by this attempt.
      console.error(`[NOTIFICATION_JOB_ERROR] report=${claim.report._id} job=${key} ${error.message}`);
      return false;
    }
  };

  const runPendingNotificationJobs = async () => {
    for (const key of JOB_KEYS) {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const completed = await processNotificationJob(undefined, key);
        if (!completed) break;
      }
    }
  };

  const runEscalation = async () => {
    const deadline = now();
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const report = await ReportModel.findOneAndUpdate({
          status: 'open', is_deleted: false, response_deadline: { $lte: deadline }, escalation_level: 0,
        }, {
          $set: {
            escalation_level: 1, escalated_at: deadline, last_notification_at: deadline,
            'notification_jobs.escalation_ngo.state': 'pending',
            'notification_jobs.escalation_admin.state': 'pending',
          },
          $push: { timeline: {
            event_type: 'escalated',
            description: 'One-time escalation: nearby NGOs and coordinators alerted due to lack of response.',
            created_at: deadline,
          } },
        }, { new: true, lean: true });
        if (!report) break;
      }
      await runPendingNotificationJobs();
    } catch (error) {
      console.error('[ESCALATION_ERROR]', error.message);
    }
  };

  return { claimNotificationJob, completeNotificationJob, processNotificationJob, runEscalation, runPendingNotificationJobs };
};

const defaultWorker = createEscalationWorker();
const startEscalationService = () => {
  cron.schedule('* * * * *', defaultWorker.runEscalation);
  console.log('Escalation service scheduled to run every minute.');
};

module.exports = {
  startEscalationService,
  runEscalation: defaultWorker.runEscalation,
  processNotificationJob: defaultWorker.processNotificationJob,
  buildGeoQuery,
  buildNotificationOperations,
  createEscalationWorker,
  findNearbyUsers,
  jobClaimFilter,
};
