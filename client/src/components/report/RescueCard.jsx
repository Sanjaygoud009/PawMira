import { useState } from 'react';
import { MapPin, Clock, Eye, AlertCircle, Share2, CheckCircle, Activity, HeartPulse, Crown, UserRoundCheck, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import Timeline from '../ui/Timeline';
import RescueChat from '../chat/RescueChat';

import { getSafeImageUrl } from '../../utils/imageUtils';

const SEVERITY_COLORS = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-blue-500 text-white',
};

const STATUS_CONFIG = {
  open: { label: 'Open Emergency', color: 'bg-error/10 text-error', icon: AlertCircle },
  in_progress: { label: 'Rescue In Progress', color: 'bg-warning/10 text-warning', icon: Activity },
  under_treatment: { label: 'Under Treatment', color: 'bg-blue-500/10 text-blue-600', icon: HeartPulse },
  safe: { label: 'Safe', color: 'bg-success/10 text-success', icon: CheckCircle },
  inactive: { label: 'Responder Inactive (Reopened)', color: 'bg-neutral text-text-light', icon: AlertCircle },
};

export default function RescueCard({ report, onUpdate, user }) {
  const [loading, setLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleRespond = async () => {
    if (!user) return toast.error('Please login to respond.');
    try {
      setLoading(true);
      const res = await api.post(`/reports/${report._id}/respond`);
      toast.success("You are now responding to this rescue!");
      onUpdate(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to respond');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelResponse = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.post(`/reports/${report._id}/cancel-response`);
      toast.success("Response cancelled.");
      onUpdate(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel response');
    } finally {
      setLoading(false);
    }
  };

  const handleMonitor = async () => {
    if (!user) return toast.error('Please login to monitor.');
    try {
      const res = await api.post(`/reports/${report._id}/monitor`);
      onUpdate({ ...report, monitors: res.data.monitors });
    } catch (err) {
      toast.error('Failed to toggle monitor');
    }
  };

  const handleRequestTransfer = async (targetUserId) => {
    if (!window.confirm("Are you sure you want to request a role transfer?")) return;
    try {
      setLoading(true);
      const res = await api.post(`/reports/${report._id}/transfer-request`, { targetUserId });
      toast.success("Transfer requested!");
      onUpdate(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request transfer');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToTransfer = async (action) => {
    try {
      setLoading(true);
      const res = await api.post(`/reports/${report._id}/transfer-respond`, { action });
      toast.success(action === 'accept' ? 'Role transferred successfully!' : 'Transfer declined');
      onUpdate(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to respond to transfer');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/feed?highlight=${report._id}`;
    const shareData = {
      title: `PawMira Rescue: ${report.issue_type.replace('_', ' ')}`,
      text: `Urgent rescue needed at ${report.address || 'Nearby'}. Severity: ${report.priority}. Help save a life!`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Thanks for sharing!');
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('[SHARE_ERROR]', err);
          toast.error('Failed to share');
        }
      }
    } else {
      // Fallback: Copy link to clipboard
      try {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        toast.success('Rescue info copied to clipboard! Share it with your friends.');
      } catch (err) {
        toast.error('Failed to copy link');
      }
    }
  };

  const primaryCount = report.primary_responder ? 1 : 0;
  const backupCount = report.backup_responders?.length || 0;
  const totalResponders = primaryCount + backupCount;
  const maxResponders = 3;
  const remainingSpots = Math.max(maxResponders - totalResponders, 0);

  // Helper: safely compare a possibly-populated ({_id,name}) or raw ObjectId/string
  const strId = (v) => (v?._id !== undefined ? v._id : v)?.toString?.() ?? String(v ?? '');

  const isPrimary = Boolean(user && report.primary_responder && strId(report.primary_responder) === user._id);
  const isBackup = Boolean(user && report.backup_responders?.some(b => strId(b) === user._id));
  const isMonitoring = Boolean(user && report.monitors?.some(m => strId(m) === user._id));
  const canChat = Boolean(user && (isPrimary || isBackup || isMonitoring || strId(report.reporter_id) === user._id));

  const userAcceptedEvents = report.timeline?.filter(e =>
    e.event_type === 'accepted' && (strId(e.user_id) === user?._id)
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) || [];

  const lastAcceptedAt = userAcceptedEvents.length > 0 ? new Date(userAcceptedEvents[0].created_at) : null;
  const fiveMinutesInMs = 5 * 60 * 1000;
  const canCancel = lastAcceptedAt && (Date.now() - lastAcceptedAt.getTime() <= fiveMinutesInMs) && report.status !== 'safe';

  const pendingTransfer = report.pending_role_transfer;
  // pending_role_transfer stores raw string IDs (not populated objects)
  const hasPendingTransferToMe = Boolean(pendingTransfer?.to_user && pendingTransfer.to_user.toString() === user?._id);
  const hasPendingTransferFromMe = Boolean(pendingTransfer?.from_user && pendingTransfer.from_user.toString() === user?._id);

  const canTransferPrimary = isPrimary && backupCount > 0 && !pendingTransfer && report.status !== 'safe';
  const canRequestPrimary = isBackup && !pendingTransfer && report.status !== 'safe';

  const timeAgo = formatDistanceToNow(new Date(report.created_at), { addSuffix: true });
  const verifiedAgo = formatDistanceToNow(new Date(report.last_activity_at || report.created_at), { addSuffix: true });

  const StatusIcon = STATUS_CONFIG[report.status]?.icon || AlertCircle;

  return (
    <article className="card overflow-hidden relative">

      {report.status === 'safe' && report.resolution_image_url ? (
        <div className="relative h-44 sm:h-52 w-full bg-neutral flex gap-0.5 overflow-hidden">
          <div className="relative w-1/2 h-full">
            <img
              src={getSafeImageUrl(report.image_url, undefined, 800)}
              alt={`Emergency: ${report.issue_type.replace('_', ' ')}`}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              loading="lazy"
            />
          </div>
          <div className="relative w-1/2 h-full">
            <img
              src={getSafeImageUrl(report.resolution_image_url, undefined, 800)}
              alt="Rescue proof"
              className="w-full h-full object-cover border-l-2 border-success"
              crossOrigin="anonymous"
              loading="lazy"
            />
            <div className="absolute bottom-2 right-2 bg-success text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
              Rescued
            </div>
          </div>
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm ${SEVERITY_COLORS[report.priority] || SEVERITY_COLORS.medium}`}>
              {report.priority}
            </span>
          </div>
          <div className="absolute bottom-3 left-3 flex gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-sm bg-white ${STATUS_CONFIG[report.status]?.color || STATUS_CONFIG.open.color}`}>
              <StatusIcon size={13} /> {STATUS_CONFIG[report.status]?.label}
            </span>
          </div>
        </div>
      ) : (
        <div className="relative h-44 sm:h-52 w-full bg-neutral">
          <img
            src={getSafeImageUrl(report.image_url, undefined, 800)}
            alt={`Rescue: ${report.issue_type.replace('_', ' ')}`}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            loading="lazy"
          />
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm ${SEVERITY_COLORS[report.priority] || SEVERITY_COLORS.medium}`}>
              {report.priority}
            </span>
          </div>
          <div className="absolute bottom-3 left-3 flex gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-sm bg-white ${STATUS_CONFIG[report.status]?.color || STATUS_CONFIG.open.color}`}>
              <StatusIcon size={13} /> {STATUS_CONFIG[report.status]?.label}
            </span>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5 flex flex-col">
        <h3 className="font-bold text-base sm:text-lg text-text-dark capitalize mb-1 truncate">{report.issue_type.replace('_', ' ')}</h3>
        <p className="text-sm text-text-light line-clamp-2 mb-3">{report.description}</p>

        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-xs text-text-light">
            <MapPin size={14} className="text-primary shrink-0" />
            {report.latitude && report.longitude ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-primary hover:underline"
                title="View on Google Maps"
              >
                {report.address || 'Location approximate'}
              </a>
            ) : (
              <span className="truncate">{report.address || 'Location approximate'}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-text-light">
            <Clock size={14} className="shrink-0" />
            <span>Reported {timeAgo} • <span className="font-medium text-text-dark">Last verified {verifiedAgo}</span></span>
          </div>
          <div className="flex flex-col gap-2 pt-2 border-t border-neutral/50">
            {report.status !== 'safe' && (
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-primary font-medium">
                  <Eye size={14} />
                  <span>{report.monitors?.length || 0} monitoring</span>
                </div>
                <div className="flex items-center gap-1.5 text-text-light font-medium">
                  <Activity size={13} className="text-success shrink-0" />
                  <span>
                    Responders: <strong className="text-text-dark">{totalResponders}/{maxResponders}</strong>
                    {remainingSpots > 0 ? ` (${remainingSpots} left)` : ' (Full)'}
                  </span>
                </div>
              </div>
            )}

            {totalResponders > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center mt-1">
                <span className="text-[11px] uppercase tracking-wider text-text-light font-bold">
                  {report.status === 'safe' ? 'Rescued By:' : 'Crew:'}
                </span>
                {report.primary_responder && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                    <Crown size={11} /> {report.primary_responder.name} (Primary)
                  </span>
                )}
                {report.backup_responders && report.backup_responders.map((b, idx) => (
                  <span key={b._id || idx} className="inline-flex items-center gap-1 bg-neutral text-text-dark border border-neutral px-2 py-0.5 rounded-full text-[11px] font-medium">
                    <UserRoundCheck size={11} /> {b.name || 'Backup'} (Backup)
                  </span>
                ))}
              </div>
            )}

            {hasPendingTransferFromMe && (
              <div className="mt-2 text-xs text-warning font-semibold bg-warning/10 p-2 rounded flex items-center justify-between">
                <span>Transfer request pending...</span>
              </div>
            )}
            {hasPendingTransferToMe && (
              <div className="mt-2 text-xs bg-primary/10 border border-primary/20 p-3 rounded-xl">
                <p className="font-semibold text-primary mb-2 leading-snug">
                  {pendingTransfer.direction === 'primary_to_backup'
                    ? 'You have been requested to become the Primary Responder!'
                    : 'A Backup responder has requested the Primary role!'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondToTransfer('accept')}
                    disabled={loading}
                    className="flex-1 min-h-[40px] bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark active:scale-95 transition-all shadow-sm disabled:opacity-50"
                  >Accept</button>
                  <button
                    onClick={() => handleRespondToTransfer('decline')}
                    disabled={loading}
                    className="flex-1 min-h-[40px] bg-error/10 text-error rounded-xl text-xs font-bold hover:bg-error/20 active:scale-95 transition-all disabled:opacity-50"
                  >Decline</button>
                </div>
              </div>
            )}
          </div>

          {/* Timeline UI */}
          {(report.timeline && report.timeline.length > 0) ? (
            <div className="pt-3 mt-3 border-t border-neutral/50">
              <span className="text-[11px] uppercase tracking-wider text-text-light font-bold mb-2 block">Rescue Progress:</span>
              <div className="max-h-32 sm:max-h-40 overflow-y-auto pr-2 no-scrollbar">
                <Timeline events={report.timeline} />
              </div>
            </div>
          ) : (
            report.history && report.history.length > 0 && (
              <div className="pt-3 mt-3 border-t border-neutral/50">
                <span className="text-[10px] uppercase tracking-wider text-text-light font-bold mb-2 block">Status History:</span>
                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
                  {report.history.map((h, i) => (
                    <div key={i} className="flex items-center shrink-0">
                      <span className="flex items-center gap-1 text-text-dark font-medium bg-neutral/50 px-2 py-1 rounded-md">
                        {STATUS_CONFIG[h.status]?.icon && (() => {
                          const Icon = STATUS_CONFIG[h.status].icon;
                          return <Icon size={12} className={STATUS_CONFIG[h.status]?.color.split(' ')[1]} />;
                        })()}
                        {STATUS_CONFIG[h.status]?.label || h.status}
                      </span>
                      {i < report.history.length - 1 && <span className="text-neutral-dark mx-1">→</span>}
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-neutral">
          {isPrimary && report.status !== 'safe' ? (
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="flex gap-2">
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('openResolveModal', { detail: report._id }))}
                  className="flex-1 min-h-[42px] bg-success text-white py-2 px-3 rounded-xl text-sm font-bold hover:bg-green-600 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                  title="Mark this rescue as safe and resolved."
                >
                  <CheckCircle size={16} /> Mark as Safe
                </button>
                {canCancel && (
                  <button
                    onClick={handleCancelResponse}
                    disabled={loading}
                    className="min-h-[42px] bg-error/10 text-error hover:bg-error/20 active:scale-95 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 shrink-0"
                    title="Cancel Response (within 5 minutes)"
                  >
                    {loading ? '...' : 'Cancel'}
                  </button>
                )}
              </div>
              {canTransferPrimary && (
                <div className="flex flex-wrap gap-2">
                  {report.backup_responders.map((b) => (
                    <button
                      key={b._id}
                      onClick={() => handleRequestTransfer(b._id)}
                      disabled={loading}
                      className="flex-1 min-h-[38px] border border-primary/20 text-primary py-1.5 px-3 rounded-xl text-xs font-bold hover:bg-primary/10 active:scale-95 transition-all shadow-sm"
                    >
                      Transfer to {(b.name || 'Backup').split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : report.status === 'safe' ? (
            <button
              disabled={true}
              className="flex-1 bg-green-50 text-success border border-success/30 py-2 rounded-xl text-sm font-bold cursor-default shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} /> Rescue Resolved
            </button>
          ) : isBackup ? (
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="flex gap-2">
                <button
                  disabled={true}
                  className="flex-1 min-h-[42px] bg-[#e8f5e9] text-success border border-success/30 py-2 px-3 rounded-xl text-sm font-semibold cursor-default shadow-sm truncate"
                  title="You have joined this rescue as a backup responder!"
                >
                  Joined as Backup
                </button>
                {canCancel && (
                  <button
                    onClick={handleCancelResponse}
                    disabled={loading}
                    className="min-h-[42px] bg-error/10 text-error hover:bg-error/20 active:scale-95 px-3 sm:px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 shrink-0"
                    title="Cancel Response (within 5 minutes)"
                  >
                    {loading ? '...' : 'Cancel'}
                  </button>
                )}
              </div>
              {canRequestPrimary && (
                <button
                  onClick={() => handleRequestTransfer(report.primary_responder._id)}
                  disabled={loading}
                  className="w-full min-h-[38px] border border-primary/20 text-primary py-1.5 rounded-xl text-xs font-bold hover:bg-primary/10 active:scale-95 transition-all shadow-sm"
                >
                  Request Primary Role
                </button>
              )}
            </div>
          ) : totalResponders >= maxResponders ? (
            <button
              disabled={true}
              className="flex-1 bg-neutral-dark text-text-light py-2 rounded-xl text-sm font-medium cursor-not-allowed opacity-60"
              title="All responder slots (3/3) are currently filled."
            >
              Responders Full
            </button>
          ) : report.status === 'open' || report.status === 'inactive' ? (
            <button
              onClick={handleRespond}
              disabled={loading}
              className="flex-1 min-h-[42px] bg-primary text-white py-2 px-3 rounded-xl text-sm font-semibold hover:bg-primary-hover active:scale-95 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : "I'm Responding"}
            </button>
          ) : (
            <button
              onClick={handleRespond}
              disabled={loading || report.status === 'safe'}
              className="flex-1 min-h-[42px] bg-neutral text-text-dark py-2 px-3 rounded-xl text-sm font-semibold hover:bg-neutral-dark border border-neutral active:scale-95 transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join as Backup'}
            </button>
          )}

          {canChat && report.status !== 'safe' && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="min-w-[42px] min-h-[42px] flex items-center justify-center rounded-xl border border-primary/20 text-primary hover:bg-primary/10 active:scale-95 transition-all shadow-sm"
              title="Open Rescue Chat"
              aria-label="Open Rescue Chat"
            >
              <MessageCircle size={18} />
            </button>
          )}

          {report.status !== 'safe' && (
            <button
              onClick={handleMonitor}
              className={`min-w-[42px] min-h-[42px] flex items-center justify-center rounded-xl border active:scale-95 transition-all ${isMonitoring ? 'bg-primary/10 border-primary/20 text-primary' : 'border-neutral text-text-light hover:bg-neutral'}`}
              title="Monitor this rescue"
              aria-label="Monitor this rescue"
            >
              <Eye size={18} />
            </button>
          )}

          <button
            onClick={handleShare}
            className="min-w-[42px] min-h-[42px] flex items-center justify-center rounded-xl border border-neutral text-text-light hover:bg-neutral active:scale-95 transition-all"
            title="Share this rescue"
            aria-label="Share this rescue"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>

      {isChatOpen && (
        <RescueChat
          reportId={report._id}
          report={report}
          user={user}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </article>
  );
}
