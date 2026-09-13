export const REPORT_RESPONDER_UPDATED = 'report_responder_updated';

export const mergeReportUpdate = (reports, updatedReport) => (
  reports.map((report) => (
    report._id === updatedReport._id ? { ...report, ...updatedReport } : report
  ))
);

export const subscribeToReportUpdates = (socket, onReportUpdate) => {
  socket.on(REPORT_RESPONDER_UPDATED, onReportUpdate);
  return () => socket.off(REPORT_RESPONDER_UPDATED, onReportUpdate);
};
