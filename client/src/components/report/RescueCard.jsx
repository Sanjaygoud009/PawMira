import { useState, useRef } from 'react';
import { MapPin, Clock, Eye, AlertCircle, Share2, MessageCircle, CheckCircle, Activity, HeartPulse } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import html2canvas from 'html2canvas';

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
  const cardRef = useRef(null);

  const handleRespond = async () => {
    if (!user) return toast.error('Please login to respond.');
    try {
      setLoading(true);
      await api.post(`/reports/${report._id}/respond`);
      toast.success("You are now responding to this rescue!");
      onUpdate();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to respond');
    } finally {
      setLoading(false);
    }
  };

  const handleMonitor = async () => {
    if (!user) return toast.error('Please login to monitor.');
    try {
      await api.post(`/reports/${report._id}/monitor`);
      onUpdate();
    } catch (err) {
      toast.error('Failed to toggle monitor');
    }
  };

  const handleShare = async () => {
    try {
      toast.loading('Generating Share Card...', { id: 'share' });
      const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true });
      const image = canvas.toDataURL('image/jpeg', 0.9);
      
      const link = document.createElement('a');
      link.href = image;
      link.download = `PawMira-Rescue-${report._id.substring(0,6)}.jpg`;
      link.click();
      toast.success('Card downloaded! Share it on WhatsApp/Instagram.', { id: 'share' });
    } catch (err) {
      toast.error('Failed to generate share card', { id: 'share' });
    }
  };

  const isPrimary = user && report.primary_responder?._id === user._id;
  const isMonitoring = user && report.monitors?.includes(user._id);

  const timeAgo = formatDistanceToNow(new Date(report.created_at), { addSuffix: true });
  const verifiedAgo = formatDistanceToNow(new Date(report.last_activity_at || report.created_at), { addSuffix: true });

  const StatusIcon = STATUS_CONFIG[report.status]?.icon || AlertCircle;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral overflow-hidden hover:shadow-md transition-shadow relative">
      {/* Hidden container specifically styled for the downloaded card */}
      <div className="absolute top-[-9999px] left-[-9999px]">
        <div ref={cardRef} className="w-[1080px] h-[1920px] bg-[#1a1a2e] text-white flex flex-col p-16 font-sans relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1a1a2e]/80 to-[#1a1a2e] z-10 pointer-events-none"></div>
          <img src={report.image_url || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800'} alt="Rescue" className="absolute top-0 left-0 w-full h-[60%] object-cover z-0" crossOrigin="anonymous" />
          
          <div className="z-20 mt-auto flex flex-col gap-6">
            <div className="flex gap-4">
              <span className={`px-6 py-2 rounded-full font-bold text-2xl uppercase tracking-wider ${SEVERITY_COLORS[report.priority] || SEVERITY_COLORS.medium}`}>
                {report.priority} Emergency
              </span>
              <span className="bg-white/20 backdrop-blur-md px-6 py-2 rounded-full font-bold text-2xl flex items-center gap-2">
                <StatusIcon size={24} /> {STATUS_CONFIG[report.status]?.label}
              </span>
            </div>
            
            <h1 className="text-8xl font-black leading-tight tracking-tight mt-4 capitalize text-white drop-shadow-2xl">
              {report.issue_type.replace('_', ' ')}
            </h1>
            
            <div className="flex items-center gap-4 text-white/80 text-3xl mt-4 bg-black/40 backdrop-blur-sm p-6 rounded-2xl w-fit">
              <MapPin size={36} className="text-[#FF6B35]" />
              {report.address || 'Location hidden (Nearby)'}
            </div>
            
            <p className="text-3xl text-white/70 line-clamp-3 leading-relaxed max-w-4xl mt-6">{report.description}</p>
          </div>

          <div className="z-20 mt-24 pt-12 border-t border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center p-4">
                <img src="/pawmira-logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h2 className="text-4xl font-bold text-white">PawMira Rescue Network</h2>
                <p className="text-2xl text-[#FF6B35] font-medium mt-1">Join the community. Save a life.</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl text-white/60">Reported: {new Date(report.created_at).toLocaleDateString()}</p>
              <p className="text-2xl text-white font-bold mt-2">pawmira.org</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actual UI Card */}
      <div className="relative h-48 w-full bg-neutral">
        <img 
          src={report.image_url || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=500'} 
          alt="Rescue Case" 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${SEVERITY_COLORS[report.priority] || SEVERITY_COLORS.medium}`}>
            {report.priority}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 flex gap-2">
           <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm ${STATUS_CONFIG[report.status]?.color || STATUS_CONFIG.open.color} bg-white`}>
            <StatusIcon size={14} /> {STATUS_CONFIG[report.status]?.label}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col h-[calc(100%-12rem)]">
        <h3 className="font-bold text-lg text-text-dark capitalize mb-1">{report.issue_type.replace('_', ' ')}</h3>
        <p className="text-sm text-text-light line-clamp-2 mb-4 flex-grow">{report.description}</p>

        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-xs text-text-light">
            <MapPin size={14} className="text-primary shrink-0" />
            <span className="truncate">{report.address || 'Location approximate'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-light">
            <Clock size={14} className="shrink-0" />
            <span>Reported {timeAgo} • <span className="font-medium text-text-dark">Last verified {verifiedAgo}</span></span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2">
             <div className="flex items-center gap-2 text-primary font-medium">
               <Eye size={14} />
               {report.monitors?.length || 0} people monitoring
             </div>
             {report.primary_responder && (
               <div className="text-text-light">
                 Responder: <span className="font-medium text-text-dark">{report.primary_responder.name}</span>
               </div>
             )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-auto pt-4 border-t border-neutral">
          {report.status === 'open' || report.status === 'inactive' ? (
            <button 
              onClick={handleRespond}
              disabled={loading}
              className="flex-1 bg-primary text-white py-2 rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              {loading ? 'Processing...' : "I'm Responding"}
            </button>
          ) : isPrimary ? (
             <button 
              className="flex-1 bg-warning text-white py-2 rounded-xl text-sm font-medium hover:bg-yellow-600 transition-colors"
            >
              Update Proof
            </button>
          ) : (
            <button 
              onClick={handleRespond}
              disabled={loading || report.status === 'safe'}
              className="flex-1 bg-neutral text-text-dark py-2 rounded-xl text-sm font-medium hover:bg-neutral-dark transition-colors disabled:opacity-50"
            >
              Join as Backup
            </button>
          )}

          <button 
            onClick={handleMonitor}
            className={`p-2 rounded-xl border transition-colors ${isMonitoring ? 'bg-primary/10 border-primary/20 text-primary' : 'border-neutral text-text-light hover:bg-neutral'}`}
            title="Monitor this rescue"
          >
            <Eye size={18} />
          </button>

          <button 
            onClick={handleShare}
            className="p-2 rounded-xl border border-neutral text-text-light hover:bg-neutral transition-colors"
            title="Generate Share Card"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
