const isIdMatch = (value, userId) => value && value.toString() === userId;

exports.canManageReport = (report, user) => {
  if (!report || !user) return false;
  const userId = user._id.toString();
  return user.role === 'admin'
    || isIdMatch(report.reporter_id, userId)
    || isIdMatch(report.primary_responder, userId)
    || (report.backup_responders || []).some((id) => isIdMatch(id, userId));
};

exports.canAccessRescueChat = (report, user) => {
  if (exports.canManageReport(report, user)) return true;
  const userId = user?._id?.toString();
  return Boolean(userId && (report.monitors || []).some((id) => isIdMatch(id, userId)));
};
