'use strict';

const REPORT_RESPONDER_UPDATED = 'report_responder_updated';
const reportRoom = (reportId) => `report_${reportId}`;

const emitReportResponderUpdate = (io, report) => {
  if (!io || !report?._id) return;
  io.to(reportRoom(report._id)).emit(REPORT_RESPONDER_UPDATED, { report });
};

module.exports = { REPORT_RESPONDER_UPDATED, emitReportResponderUpdate, reportRoom };
