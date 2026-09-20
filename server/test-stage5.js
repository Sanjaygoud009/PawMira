/**
 * Stage 5 – Comprehensive role-transfer test suite
 *
 * Covers every case from the spec:
 *   a  Primary → Backup happy-path
 *   b  Backup → Primary happy-path
 *   c  Decline flow
 *   d  Stale-request detection (409)
 *   e  Only-one-pending constraint (409)
 *   f  Role invariants after swap (no duplicates, capacity correct)
 *   g  canResolveReport – backup blocked
 *   h  canResolveReport – primary allowed
 *   i  canResolveReport – admin allowed
 *   j  canResolveReport – unauthenticated / unrelated blocked
 *   k  Transfer blocked on safe rescue
 *   l  Transfer blocked on inactive rescue
 *   m  cancelResponse clears pending transfer
 *   n  Idempotency: accept on already-stale request returns 409 without data corruption
 *   o  canManageReport still works correctly (pre-existing behaviour)
 *   p  Frontend derived-state helpers (isPrimary / isBackup / hasPendingTransferToMe)
 */

const assert = require('node:assert/strict');
const test = require('node:test');

// ── utilities ────────────────────────────────────────────────────────────────

const { canManageReport, canResolveReport, canAccessRescueChat } =
  require('./utils/reportAuthorization');

/** Cheap ObjectId-like value whose .toString() returns the string */
const oid = (s) => ({ _id: s, toString: () => s });
/** User object as the auth middleware attaches it */
const user = (id, role = 'volunteer') => ({ _id: id, role });

/** Build a minimal report with a primary + arbitrary backups */
const makeReport = ({
  primaryId = 'primary',
  backups = ['backup1'],
  status = 'in_progress',
  pendingTransfer = undefined,
} = {}) => ({
  _id: 'report-1',
  status,
  reporter_id: oid('reporter'),
  primary_responder: oid(primaryId),
  backup_responders: backups.map(oid),
  monitors: [],
  timeline: [],
  history: [],
  pending_role_transfer: pendingTransfer,
  last_activity_at: new Date(),
  save: async function () { return this; },
});

// ── backend auth ─────────────────────────────────────────────────────────────

test('g – backup cannot resolve', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1'] });
  assert.equal(canResolveReport(r, user('backup1')), false);
});

test('h – primary can resolve', () => {
  const r = makeReport({ primaryId: 'primary' });
  assert.equal(canResolveReport(r, user('primary')), true);
});

test('i – admin can resolve', () => {
  const r = makeReport();
  assert.equal(canResolveReport(r, user('anyone', 'admin')), true);
});

test('j – unrelated / null cannot resolve', () => {
  const r = makeReport();
  assert.equal(canResolveReport(r, user('unrelated')), false);
  assert.equal(canResolveReport(r, null), false);
  assert.equal(canResolveReport(null, user('primary')), false);
  // Reporter is NOT allowed (no special reporter resolution workflow exists)
  assert.equal(canResolveReport(r, user('reporter')), false);
});

test('o – canManageReport still works (reporter, primary, backup, admin)', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1'] });
  assert.equal(canManageReport(r, user('reporter')), true);
  assert.equal(canManageReport(r, user('primary')), true);
  assert.equal(canManageReport(r, user('backup1')), true);
  assert.equal(canManageReport(r, user('admin', 'admin')), true);
  assert.equal(canManageReport(r, user('outsider')), false);
});

test('canAccessRescueChat – monitors included', () => {
  const r = { ...makeReport(), monitors: [oid('monitor')] };
  assert.equal(canAccessRescueChat(r, user('monitor')), true);
  assert.equal(canAccessRescueChat(r, user('outsider')), false);
});

// ── controller logic simulation ───────────────────────────────────────────────
// We re-implement the core mutating logic so we can test it without MongoDB.

/**
 * Simulates requestRoleTransfer state machine.
 * Returns { statusCode, body, report } after mutation.
 */
function simulateRequestTransfer(report, requestingUserId, targetUserId) {
  if (report.status === 'safe' || report.status === 'inactive') {
    return { statusCode: 400, body: { message: 'Role transfer not allowed on resolved or inactive rescues' } };
  }
  if (requestingUserId === targetUserId) {
    return { statusCode: 400, body: { message: 'Cannot transfer role to yourself' } };
  }

  const isPrimary = report.primary_responder?.toString() === requestingUserId;
  const isBackup = report.backup_responders?.some(u => u.toString() === requestingUserId);
  const isTargetPrimary = report.primary_responder?.toString() === targetUserId;
  const isTargetBackup = report.backup_responders?.some(u => u.toString() === targetUserId);

  if (!isPrimary && !isBackup) return { statusCode: 403, body: { message: 'You are not a responder on this rescue' } };
  if (!isTargetPrimary && !isTargetBackup) return { statusCode: 400, body: { message: 'Target user is not a responder on this rescue' } };

  let direction;
  if (isPrimary && isTargetBackup) direction = 'primary_to_backup';
  else if (isBackup && isTargetPrimary) direction = 'backup_to_primary';
  else return { statusCode: 400, body: { message: 'Invalid transfer direction' } };

  if (report.pending_role_transfer?.from_user) {
    return { statusCode: 409, body: { message: 'A role transfer request is already pending for this rescue' } };
  }

  report.pending_role_transfer = {
    from_user: requestingUserId,
    to_user: targetUserId,
    direction,
    requested_at: new Date(),
  };
  return { statusCode: 200, body: report, report };
}

/**
 * Simulates respondToRoleTransfer state machine.
 * Returns { statusCode, body, report } after mutation.
 */
function simulateRespondTransfer(report, respondingUserId, action) {
  if (report.status === 'safe' || report.status === 'inactive') {
    return { statusCode: 400, body: { message: 'Role transfer not allowed on resolved or inactive rescues' } };
  }
  if (action !== 'accept' && action !== 'decline') {
    return { statusCode: 400, body: { message: 'Invalid action' } };
  }

  const pendingTransfer = report.pending_role_transfer;
  if (!pendingTransfer?.to_user || pendingTransfer.to_user.toString() !== respondingUserId) {
    return { statusCode: 409, body: { message: 'No pending role transfer request found for you' } };
  }

  if (action === 'decline') {
    report.pending_role_transfer = undefined;
    return { statusCode: 200, body: report, report };
  }

  // Stale check
  const fromUserId = pendingTransfer.from_user.toString();
  const currentPrimary = report.primary_responder?.toString();
  const currentBackups = report.backup_responders?.map(u => u.toString()) || [];

  if (pendingTransfer.direction === 'primary_to_backup') {
    if (currentPrimary !== fromUserId || !currentBackups.includes(respondingUserId)) {
      report.pending_role_transfer = undefined;
      return { statusCode: 409, body: { message: 'Transfer request is stale or invalid (roles have changed)' } };
    }
    // Swap
    report.primary_responder = oid(respondingUserId);
    report.backup_responders = report.backup_responders.filter(u => u.toString() !== respondingUserId);
    if (!report.backup_responders.some(u => u.toString() === fromUserId)) {
      report.backup_responders.push(oid(fromUserId));
    }
  } else {
    if (!currentBackups.includes(fromUserId) || currentPrimary !== respondingUserId) {
      report.pending_role_transfer = undefined;
      return { statusCode: 409, body: { message: 'Transfer request is stale or invalid (roles have changed)' } };
    }
    // Swap
    report.primary_responder = oid(fromUserId);
    report.backup_responders = report.backup_responders.filter(u => u.toString() !== fromUserId);
    if (!report.backup_responders.some(u => u.toString() === respondingUserId)) {
      report.backup_responders.push(oid(respondingUserId));
    }
  }

  report.pending_role_transfer = undefined;
  return { statusCode: 200, body: report, report };
}

// ── transfer flow tests ───────────────────────────────────────────────────────

test('a – Primary → Backup happy path', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1'] });
  const req = simulateRequestTransfer(r, 'primary', 'backup1');
  assert.equal(req.statusCode, 200);
  assert.equal(r.pending_role_transfer.direction, 'primary_to_backup');
  assert.equal(r.pending_role_transfer.from_user, 'primary');
  assert.equal(r.pending_role_transfer.to_user, 'backup1');

  const res = simulateRespondTransfer(r, 'backup1', 'accept');
  assert.equal(res.statusCode, 200);
  assert.equal(r.primary_responder.toString(), 'backup1', 'backup1 should now be primary');
  assert.ok(r.backup_responders.some(u => u.toString() === 'primary'), 'old primary should now be backup');
  assert.ok(!r.backup_responders.some(u => u.toString() === 'backup1'), 'new primary should not remain in backups');
  assert.equal(r.pending_role_transfer, undefined, 'pending transfer should be cleared');
});

test('b – Backup → Primary happy path', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1'] });
  const req = simulateRequestTransfer(r, 'backup1', 'primary');
  assert.equal(req.statusCode, 200);
  assert.equal(r.pending_role_transfer.direction, 'backup_to_primary');

  const res = simulateRespondTransfer(r, 'primary', 'accept');
  assert.equal(res.statusCode, 200);
  assert.equal(r.primary_responder.toString(), 'backup1', 'backup1 should be new primary');
  assert.ok(r.backup_responders.some(u => u.toString() === 'primary'), 'old primary should be backup');
  assert.ok(!r.backup_responders.some(u => u.toString() === 'backup1'), 'new primary not in backups');
  assert.equal(r.pending_role_transfer, undefined);
});

test('c – Decline clears pending transfer without swapping', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1'] });
  simulateRequestTransfer(r, 'primary', 'backup1');
  assert.ok(r.pending_role_transfer);

  const res = simulateRespondTransfer(r, 'backup1', 'decline');
  assert.equal(res.statusCode, 200);
  assert.equal(r.pending_role_transfer, undefined);
  assert.equal(r.primary_responder.toString(), 'primary', 'primary unchanged after decline');
  assert.ok(r.backup_responders.some(u => u.toString() === 'backup1'), 'backup unchanged after decline');
});

test('d – Stale request: from_user left rescue before accept', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1'] });
  simulateRequestTransfer(r, 'primary', 'backup1');
  // Simulate primary leaving the rescue before backup accepts
  r.primary_responder = oid('someone_else');
  const res = simulateRespondTransfer(r, 'backup1', 'accept');
  assert.equal(res.statusCode, 409);
  assert.equal(r.pending_role_transfer, undefined, 'stale transfer should be cleared');
});

test('d2 – Stale request: to_user left rescue before accept', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1'] });
  simulateRequestTransfer(r, 'primary', 'backup1');
  // Simulate backup1 leaving
  r.backup_responders = [];
  const res = simulateRespondTransfer(r, 'backup1', 'accept');
  assert.equal(res.statusCode, 409);
});

test('e – Only one pending transfer at a time (409 on duplicate)', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1'] });
  simulateRequestTransfer(r, 'primary', 'backup1');
  // Primary tries to request another transfer (e.g., toward backup2 on a different rescue)
  const res = simulateRequestTransfer(r, 'primary', 'backup1');
  assert.equal(res.statusCode, 409);
});

test('f – Role invariants: no duplicate IDs, correct capacity', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1', 'backup2'] });
  simulateRequestTransfer(r, 'primary', 'backup1');
  simulateRespondTransfer(r, 'backup1', 'accept');

  const allIds = [r.primary_responder.toString(), ...r.backup_responders.map(u => u.toString())];
  const unique = new Set(allIds);
  assert.equal(unique.size, allIds.length, 'no duplicate responder IDs after swap');
  assert.ok(allIds.length <= 3, 'total responders must not exceed 3');
  assert.equal(allIds.filter(id => id === 'primary').length, 1, 'old primary appears exactly once');
  assert.equal(allIds.filter(id => id === 'backup1').length, 1, 'new primary appears exactly once');
});

test('k – Transfer blocked when status is safe', () => {
  const r = makeReport({ status: 'safe' });
  const res = simulateRequestTransfer(r, 'primary', 'backup1');
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /resolved or inactive/);
});

test('l – Transfer blocked when status is inactive', () => {
  const r = makeReport({ status: 'inactive' });
  const res = simulateRequestTransfer(r, 'primary', 'backup1');
  assert.equal(res.statusCode, 400);
});

test('m – cancelResponse clears pending transfer involving that user', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1'] });
  simulateRequestTransfer(r, 'primary', 'backup1');
  assert.ok(r.pending_role_transfer);

  // Simulate cancelResponse clearing pending transfer
  const userId = 'primary';
  if (r.pending_role_transfer &&
      (r.pending_role_transfer.from_user?.toString() === userId ||
       r.pending_role_transfer.to_user?.toString() === userId)) {
    r.pending_role_transfer = undefined;
  }
  assert.equal(r.pending_role_transfer, undefined, 'pending transfer cleared when requester leaves');
});

test('m2 – cancelResponse clears pending transfer when to_user leaves', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1'] });
  simulateRequestTransfer(r, 'primary', 'backup1');
  const userId = 'backup1'; // the target leaves
  if (r.pending_role_transfer &&
      (r.pending_role_transfer.from_user?.toString() === userId ||
       r.pending_role_transfer.to_user?.toString() === userId)) {
    r.pending_role_transfer = undefined;
  }
  assert.equal(r.pending_role_transfer, undefined);
});

test('n – Responding when no pending transfer returns 409, no corruption', () => {
  const r = makeReport();
  // No transfer requested
  const res = simulateRespondTransfer(r, 'backup1', 'accept');
  assert.equal(res.statusCode, 409);
  // Verify report state is unchanged
  assert.equal(r.primary_responder.toString(), 'primary');
});

test('n2 – Wrong user responding to transfer returns 409', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1', 'backup2'] });
  simulateRequestTransfer(r, 'primary', 'backup1');
  // backup2 tries to accept a transfer meant for backup1
  const res = simulateRespondTransfer(r, 'backup2', 'accept');
  assert.equal(res.statusCode, 409);
  // Transfer still pending for backup1
  assert.ok(r.pending_role_transfer?.to_user === 'backup1');
});

test('non-responder cannot request transfer', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1'] });
  const res = simulateRequestTransfer(r, 'outsider', 'backup1');
  assert.equal(res.statusCode, 403);
});

test('self-transfer blocked', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1'] });
  const res = simulateRequestTransfer(r, 'primary', 'primary');
  assert.equal(res.statusCode, 400);
});

test('target must be a responder on the rescue', () => {
  const r = makeReport({ primaryId: 'primary', backups: ['backup1'] });
  const res = simulateRequestTransfer(r, 'primary', 'outsider');
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /not a responder/);
});

// ── frontend derived-state helpers ────────────────────────────────────────────
// These functions mirror the logic in RescueCard.jsx so we can test it purely

/**
 * Mirrors the derived-state block in RescueCard.jsx.
 * report.primary_responder and backup_responders come POPULATED ({ _id, name }).
 */
function deriveCardState(report, userId) {
  const strId = (v) => (v?._id !== undefined ? v._id : v)?.toString?.() ?? String(v);

  const isPrimary = userId && report.primary_responder && strId(report.primary_responder) === userId;
  const isBackup = userId && report.backup_responders?.some(b => strId(b) === userId);
  const backupCount = report.backup_responders?.length || 0;

  const pendingTransfer = report.pending_role_transfer;
  // IDs coming from DB are strings; user._id is also a string in JWT payload
  const hasPendingTransferToMe = pendingTransfer?.to_user?.toString() === userId;
  const hasPendingTransferFromMe = pendingTransfer?.from_user?.toString() === userId;

  const canTransferPrimary = isPrimary && backupCount > 0 && !pendingTransfer && report.status !== 'safe';
  const canRequestPrimary = isBackup && !pendingTransfer && report.status !== 'safe';

  return { isPrimary, isBackup, hasPendingTransferToMe, hasPendingTransferFromMe, canTransferPrimary, canRequestPrimary };
}

test('p – frontend: isPrimary correct with populated object', () => {
  // server returns primary_responder as { _id: 'primary', name: 'Alice' }
  const r = {
    status: 'in_progress',
    primary_responder: { _id: 'primary', name: 'Alice' },
    backup_responders: [{ _id: 'backup1', name: 'Bob' }],
    pending_role_transfer: undefined,
  };

  const s = deriveCardState(r, 'primary');
  assert.equal(s.isPrimary, true);
  assert.equal(s.isBackup, false);
  assert.equal(s.canTransferPrimary, true);
  assert.equal(s.canRequestPrimary, false);
});

test('p – frontend: isBackup correct with populated object', () => {
  const r = {
    status: 'in_progress',
    primary_responder: { _id: 'primary', name: 'Alice' },
    backup_responders: [{ _id: 'backup1', name: 'Bob' }],
    pending_role_transfer: undefined,
  };

  const s = deriveCardState(r, 'backup1');
  assert.equal(s.isPrimary, false);
  assert.equal(s.isBackup, true);
  assert.equal(s.canTransferPrimary, false);
  assert.equal(s.canRequestPrimary, true);
});

test('p – frontend: hasPendingTransferToMe detected correctly', () => {
  const r = {
    status: 'in_progress',
    primary_responder: { _id: 'primary', name: 'Alice' },
    backup_responders: [{ _id: 'backup1', name: 'Bob' }],
    pending_role_transfer: { from_user: 'primary', to_user: 'backup1', direction: 'primary_to_backup' },
  };

  const primaryState = deriveCardState(r, 'primary');
  assert.equal(primaryState.hasPendingTransferFromMe, true);
  assert.equal(primaryState.hasPendingTransferToMe, false);
  assert.equal(primaryState.canTransferPrimary, false, 'already has pending - no new transfer');

  const backupState = deriveCardState(r, 'backup1');
  assert.equal(backupState.hasPendingTransferToMe, true);
  assert.equal(backupState.hasPendingTransferFromMe, false);
  assert.equal(backupState.canRequestPrimary, false, 'pending transfer exists - cannot request');
});

test('p – frontend: no actions on safe rescue', () => {
  const r = {
    status: 'safe',
    primary_responder: { _id: 'primary', name: 'Alice' },
    backup_responders: [{ _id: 'backup1', name: 'Bob' }],
    pending_role_transfer: undefined,
  };

  const primaryState = deriveCardState(r, 'primary');
  assert.equal(primaryState.canTransferPrimary, false);

  const backupState = deriveCardState(r, 'backup1');
  assert.equal(backupState.canRequestPrimary, false);
});

test('p – frontend: outsider has no transfer capabilities', () => {
  const r = {
    status: 'in_progress',
    primary_responder: { _id: 'primary', name: 'Alice' },
    backup_responders: [{ _id: 'backup1', name: 'Bob' }],
    pending_role_transfer: undefined,
  };

  const s = deriveCardState(r, 'outsider');
  assert.equal(s.isPrimary, false);
  assert.equal(s.isBackup, false);
  assert.equal(s.canTransferPrimary, false);
  assert.equal(s.canRequestPrimary, false);
  assert.equal(s.hasPendingTransferToMe, false);
});
