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

  const handleMonitor = async () => {
    if (!user) return toast.error('Please login to monitor.');
    try {
      const res = await api.post(`/reports/${report._id}/monitor`);
      onUpdate({ ...report, monitors: res.data.monitors });
    } catch (err) {
      toast.error('Failed to toggle monitor');
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

  const isPrimary = user && report.primary_responder?._id === user._id;
  const isBackup = user && report.backup_responders?.some(b => (b._id || b) === user._id);
  const isMonitoring = user && report.monitors?.includes(user._id);
  const canChat = user && (isPrimary || isBackup || isMonitoring || report.reporter_id === user._id);

  const timeAgo = formatDistanceToNow(new Date(report.created_at), { addSuffix: true });
  const verifiedAgo = formatDistanceToNow(new Date(report.last_activity_at || report.created_at), { addSuffix: true });

  const StatusIcon = STATUS_CONFIG[report.status]?.icon || AlertCircle;

  return (
    <article className="card overflow-hidden relative">

      <div className="relative h-48 w-full bg-neutral">
        <img 
          src={getSafeImageUrl(report.image_url)} 
          alt={`Rescue: ${report.issue_type.replace('_', ' ')}`}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
          loading="lazy"
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${SEVERITY_COLORS[report.priority] || SEVERITY_COLORS.medium}`}>
            {report.priority}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 flex gap-2">
           <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm bg-white ${STATUS_CONFIG[report.status]?.color || STATUS_CONFIG.open.color}`}>
            <StatusIcon size={14} /> {STATUS_CONFIG[report.status]?.label}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col h-[calc(100%-12rem)]">
        <h3 className="font-bold text-base sm:text-lg text-text-dark capitalize mb-1 truncate">{report.issue_type.replace('_', ' ')}</h3>
        <p className="text-sm text-text-light line-clamp-2 mb-3 flex-grow">{report.description}</p>

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
              <div className="flex items-center justify-between text-xs">
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
                <span className="text-[10px] uppercase tracking-wider text-text-light font-bold">
                  {report.status === 'safe' ? 'Rescued By:' : 'Crew:'}
                </span>
                {report.primary_responder && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                    <Crown size={11} /> {report.primary_responder.name} (Lead)
                  </span>
                )}
                {report.backup_responders && report.backup_responders.map((b, idx) => (
                  <span key={b._id || idx} className="inline-flex items-center gap-1 bg-neutral text-text-dark border border-neutral px-2 py-0.5 rounded-full text-[10px] font-medium">
                    <UserRoundCheck size={11} /> {b.name || 'Backup'}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Timeline UI */}
          {(report.timeline && report.timeline.length > 0) ? (
            <div className="pt-3 mt-3 border-t border-neutral/50">
              <span className="text-[10px] uppercase tracking-wider text-text-light font-bold mb-2 block">Rescue Progress:</span>
              <div className="max-h-40 overflow-y-auto pr-2 no-scrollbar">
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

        <div className="flex items-center gap-2 mt-auto pt-4 border-t border-neutral">
          {isPrimary && report.status !== 'safe' ? (
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('openResolveModal', { detail: report._id }))}
              className="flex-1 bg-success text-white py-2 rounded-xl text-sm font-bold hover:bg-green-600 transition-colors shadow-sm flex items-center justify-center gap-2"
              title="Mark this rescue as safe and resolved."
            >
              <CheckCircle size={16} /> Mark as Safe
            </button>
          ) : report.status === 'safe' ? (
            <button 
              disabled={true}
              className="flex-1 bg-green-50 text-success border border-success/30 py-2 rounded-xl text-sm font-bold cursor-default shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} /> Rescue Resolved
            </button>
          ) : isBackup ? (
            <button 
              disabled={true}
              className="flex-1 bg-[#e8f5e9] text-success border border-success/30 py-2 rounded-xl text-sm font-medium cursor-default shadow-sm font-semibold"
              title="You have joined this rescue as a backup responder!"
            >
              Joined as Backup
            </button>
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
              className="flex-1 bg-primary text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : "I'm Responding"}
            </button>
          ) : (
            <button 
              onClick={handleRespond}
              disabled={loading || report.status === 'safe'}
              className="flex-1 bg-neutral text-text-dark py-2 rounded-xl text-sm font-medium hover:bg-neutral-dark border border-neutral transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join as Backup'}
            </button>
          )}

          {canChat && report.status !== 'safe' && (
            <button 
              onClick={() => setIsChatOpen(true)}
              className="p-2 rounded-xl border border-primary/20 text-primary hover:bg-primary/10 transition-colors shadow-sm"
              title="Open Rescue Chat"
              aria-label="Open Rescue Chat"
            >
              <MessageCircle size={18} />
            </button>
          )}

          {report.status !== 'safe' && (
            <button 
              onClick={handleMonitor}
              className={`p-2 rounded-xl border transition-colors ${isMonitoring ? 'bg-primary/10 border-primary/20 text-primary' : 'border-neutral text-text-light hover:bg-neutral'}`}
              title="Monitor this rescue"
              aria-label="Monitor this rescue"
            >
              <Eye size={18} />
            </button>
          )}

          <button 
            onClick={handleShare}
            className="p-2 rounded-xl border border-neutral text-text-light hover:bg-neutral transition-colors"
            title="Generate Share Card"
            aria-label="Share this rescue"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
      
      {isChatOpen && (
        <RescueChat 
          reportId={report._id} 
          user={user} 
          onClose={() => setIsChatOpen(false)} 
        />
      )}
    </article>
  );
}
