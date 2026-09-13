const cron = require('node-cron');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const User = require('../models/User');

// Radius constants in metres (MongoDB $centerSphere uses radians: metres / Earth radius)
const EARTH_RADIUS_M = 6378100;
const NGO_RADIUS_M = 25000; // 25 km

/**
 * Build a $geoWithin/$centerSphere query for a given radius around a point.
 * Returns null if the coordinates are missing or structurally invalid so that
 * callers can skip geo-queries rather than accidentally doing global lookups.
 *
 * @param {number[]} coordinates - [longitude, latitude] from the report
 * @param {number} radiusM - search radius in metres
 * @returns {object|null}
 */
const buildGeoQuery = (coordinates, radiusM) => {
  if (
    !Array.isArray(coordinates) ||
    coordinates.length < 2 ||
    typeof coordinates[0] !== 'number' ||
    typeof coordinates[1] !== 'number' ||
    !isFinite(coordinates[0]) ||
    !isFinite(coordinates[1])
  ) {
    return null;
  }
  return {
    location: {
      $geoWithin: {
        $centerSphere: [coordinates, radiusM / EARTH_RADIUS_M],
      },
    },
  };
};

/**
 * Find verified users of a given role near the supplied coordinates.
 * Returns an empty array (never throws) if coordinates are invalid.
 *
 * @param {'volunteer'|'ngo'|'admin'} role
 * @param {number[]} coordinates - [lng, lat]
 * @param {number} radiusM
 * @returns {Promise<{_id: ObjectId}[]>}
 */
const findNearbyUsers = async (role, coordinates, radiusM) => {
  const geoQuery = buildGeoQuery(coordinates, radiusM);
  if (!geoQuery) return [];
  return User.find({ role, isVerified: true, ...geoQuery }).select('_id').lean();
};

/**
 * Core escalation worker.
 *
 * For every eligible report (open/pending, deadline passed, escalation_level === 0)
 * we atomically claim it with findOneAndUpdate before sending any notifications.
 * Only the execution that successfully flips escalation_level 0 → 1 will send
 * NGO/admin notifications, preventing duplicate notifications in concurrent runs.
 */
const runEscalation = async () => {
  try {
    const now = new Date();

    // Keep claiming reports one at a time until none are left.
    // This avoids loading all eligible reports into memory at once and
    // ensures each iteration works on a freshly-claimed document.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Atomic claim: find a report that needs escalation AND transition it
      // in the same operation.  If two workers run simultaneously only one
      // will receive the updated document; the other will get null and skip.
      const report = await Report.findOneAndUpdate(
        {
          status: { $in: ['open', 'pending'] },
          is_deleted: false,
          response_deadline: { $lte: now },
          escalation_level: 0, // only unclaimed reports
        },
        {
          $set: {
            escalation_level: 1,
            escalated_at: now,
            last_notification_at: now,
          },
          $push: {
            timeline: {
              event_type: 'escalated',
              description:
                'One-time escalation: nearby NGOs and coordinators alerted due to lack of response.',
              created_at: now,
            },
          },
        },
        {
          new: true,       // return the updated document
          lean: true,      // plain JS object – we only need fields, not a Mongoose doc
        }
      );

      // No more eligible reports – we're done for this tick.
      if (!report) break;

      const coordinates = report.location?.coordinates; // [lng, lat] or undefined

      // ── NGO notifications (25 km, geo-gated) ──────────────────────────────
      const ngos = await findNearbyUsers('ngo', coordinates, NGO_RADIUS_M);

      // ── Admin notifications (global) ──────────────────────────────────────
      const admins = await User.find({ role: 'admin', isVerified: true })
        .select('_id')
        .lean();

      // Build the notification batch
      const notifications = [];

      for (const ngo of ngos) {
        notifications.push({
          user_id: ngo._id,
          type: 'escalation',
          title: '🆘 NGO Support Needed',
          message: `An emergency rescue near you has been unattended. Please respond!`,
          reference_id: report._id,
          reference_model: 'Report',
        });
      }

      for (const admin of admins) {
        notifications.push({
          user_id: admin._id,
          type: 'system',
          title: '🔥 Escalated Emergency Alert',
          message: `Report ${report._id} has been unattended past its deadline and has been escalated. Immediate review required.`,
          reference_id: report._id,
          reference_model: 'Report',
        });
      }

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }

      console.log(
        `[ESCALATION] report=${report._id} ngos_notified=${ngos.length} admins_notified=${admins.length}`
      );
    }
  } catch (error) {
    console.error('[ESCALATION_ERROR]', error.message);
  }
};

const startEscalationService = () => {
  // Keep the existing 1-minute schedule unchanged.
  cron.schedule('* * * * *', runEscalation);
  console.log('Escalation service scheduled to run every minute.');
};

module.exports = { startEscalationService, runEscalation, buildGeoQuery, findNearbyUsers };
