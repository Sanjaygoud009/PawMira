const cron = require('node-cron');
const Report = require('../models/Report');
const Notification = require('../models/Notification');
const User = require('../models/User');

const runEscalation = async () => {
  try {
    const now = new Date();
    // Find open reports that have passed their deadline
    const unattendedReports = await Report.find({
      status: { $in: ['open', 'pending'] },
      is_deleted: false,
      response_deadline: { $lte: now },
      escalation_level: { $lt: 3 }
    });

    for (const report of unattendedReports) {
      report.escalation_level += 1;
      report.escalated_at = now;
      report.last_notification_at = now;

      if (report.escalation_level === 1) {
        // Level 1: Notify Volunteers
        // Here we could find nearby volunteers if location indexing was fully used
        // For Phase 1 MVP, we notify all general volunteers as a fallback
        const volunteers = await User.find({ role: 'volunteer' }).select('_id');
        
        const notifications = volunteers.map(v => ({
          user_id: v._id,
          type: 'escalation',
          title: '🚨 Urgent Rescue Needed',
          message: `A ${report.priority} priority rescue is unattended. Can you help?`,
          reference_id: report._id,
          reference_model: 'Report'
        }));
        
        if (notifications.length) await Notification.insertMany(notifications);
        
        report.response_deadline = new Date(now.getTime() + 60 * 60000); // Wait 60 mins before Level 2
        
        report.timeline.push({
          event_type: 'escalated',
          description: 'Escalation Level 1: Nearby Volunteers notified due to lack of response.',
          created_at: now
        });
      }
      else if (report.escalation_level === 2) {
        // Level 2: Notify NGOs
        const ngos = await User.find({ role: 'ngo' }).select('_id');
        
        const notifications = ngos.map(n => ({
          user_id: n._id,
          type: 'escalation',
          title: '🆘 NGO Support Needed',
          message: `An emergency rescue has been unattended for 60 mins. Please respond!`,
          reference_id: report._id,
          reference_model: 'Report'
        }));
        
        if (notifications.length) await Notification.insertMany(notifications);
        
        report.response_deadline = new Date(now.getTime() + 30 * 60000); // Wait 30 mins before Level 3
        
        report.timeline.push({
          event_type: 'escalated',
          description: 'Escalation Level 2: Partner NGOs alerted.',
          created_at: now
        });
      }
      else if (report.escalation_level === 3) {
        // Level 3: Admin Alert & Critical Status
        report.priority = 'critical';
        
        const admins = await User.find({ role: 'admin' }).select('_id');
        
        const notifications = admins.map(a => ({
          user_id: a._id,
          type: 'system',
          title: '🔥 CRITICAL ESCALATION',
          message: `Report ${report._id} has been unattended for 2 hours! Immediate action required.`,
          reference_id: report._id,
          reference_model: 'Report'
        }));
        
        if (notifications.length) await Notification.insertMany(notifications);
        
        report.timeline.push({
          event_type: 'escalated',
          description: 'Escalation Level 3: Admins alerted. Status upgraded to CRITICAL.',
          created_at: now
        });
        
        // No further automatic escalation deadline
      }

      await report.save();
    }
  } catch (error) {
    console.error('Error running escalation service:', error);
  }
};

const startEscalationService = () => {
  // Run every minute
  cron.schedule('* * * * *', runEscalation);
  console.log('Escalation service scheduled to run every minute.');
};

module.exports = { startEscalationService, runEscalation };
