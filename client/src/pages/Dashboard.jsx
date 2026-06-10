import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  List,
  Map as MapIcon,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Phone,
  User,
  Heart,
  Trophy,
  Medal,
  Settings,
  MapPin,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import StatusBadge from '../components/ui/StatusBadge';
import PriorityBadge from '../components/ui/PriorityBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getSafeImageUrl } from '../utils/imageUtils';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom colored markers
const createColoredIcon = (color) =>
  new L.DivIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });

const markerColors = {
  pending: '#F59E0B',
  in_progress: '#3B82F6',
  rescued: '#22C55E',
};

function StatsBar({ reports }) {
  const stats = [
    {
      label: 'Pending',
      count: reports.filter((r) => r.status === 'pending').length,
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
    {
      label: 'In Progress',
      count: reports.filter((r) => r.status === 'in_progress').length,
      icon: RefreshCw,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Rescued',
      count: reports.filter((r) => r.status === 'rescued').length,
      icon: CheckCircle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`${stat.bg} rounded-2xl p-4 text-center border border-neutral/30`}
        >
          <stat.icon size={20} className={`mx-auto ${stat.color} mb-1`} />
          <p className="text-2xl font-black text-dark">{stat.count}</p>
          <p className="text-xs font-medium text-text-light">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

function ReportCard({ report, onUpdateStatus }) {
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      await onUpdateStatus(report._id, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-neutral/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {report.image_url && (
        <img
          src={report.image_url}
          alt="Report"
          className="w-full h-40 object-cover"
          loading="lazy"
        />
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={report.status} />
              <PriorityBadge priority={report.priority} />
            </div>
            <p className="text-xs text-text-light capitalize">
              {report.issue_type?.replace('_', ' ')} • {report.source}
            </p>
          </div>
          <p className="text-[10px] text-text-light whitespace-nowrap">
            {new Date(report.created_at).toLocaleDateString()}
          </p>
        </div>

        {report.description && (
          <p className="text-sm text-text line-clamp-2">{report.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-text-light">
          {report.reporter_phone && (
            <span className="flex items-center gap-1">
              <Phone size={12} /> {report.reporter_phone}
            </span>
          )}
          {report.reporter_name && (
            <span className="flex items-center gap-1">
              <User size={12} /> {report.reporter_name}
            </span>
          )}
        </div>

        {/* Action buttons */}
        {report.status !== 'rescued' && (
          <div className="flex gap-2 pt-1">
            {report.status === 'pending' && (
              <button
                onClick={() => handleUpdate('in_progress')}
                disabled={updating}
                className="flex-1 py-2 text-xs font-semibold bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                Accept Case
              </button>
            )}
            {report.status === 'in_progress' && (
              <button
                onClick={() => handleUpdate('rescued')}
                disabled={updating}
                className="flex-1 py-2 text-xs font-semibold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                Mark Rescued ✓
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MapView({ reports, onUpdateStatus }) {
  const validReports = reports.filter(
    (r) => r.latitude && r.longitude
  );

  const center = validReports.length > 0
    ? [validReports[0].latitude, validReports[0].longitude]
    : [17.385, 78.4867];

  return (
    <div className="h-[60vh] rounded-2xl overflow-hidden border border-neutral shadow-sm">
      <MapContainer center={center} zoom={12} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validReports.map((report) => (
          <Marker
            key={report._id}
            position={[report.latitude, report.longitude]}
            icon={createColoredIcon(markerColors[report.status] || '#F59E0B')}
          >
            <Popup>
              <div className="space-y-2 min-w-[200px]">
                {report.image_url && (
                  <img
                    src={getSafeImageUrl(report.image_url)}
                    alt="Report"
                    className="w-16 h-16 object-cover rounded-xl"
                  />
                )}
                <div className="flex items-center gap-2">
                  <StatusBadge status={report.status} />
                  <PriorityBadge priority={report.priority} />
                </div>
                <p className="text-xs text-gray-600 capitalize">{report.issue_type}</p>
                {report.description && (
                  <p className="text-xs text-gray-700 line-clamp-2">{report.description}</p>
                )}
                {report.reporter_phone && (
                  <p className="text-xs text-gray-500">📞 {report.reporter_phone}</p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default function Dashboard() {
  const { user, updateUser } = useAuth(); // Assume updateUser exists or we use local state
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'rescues' | 'inbox'
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('-created_at');

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editMessageContent, setEditMessageContent] = useState('');

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    service_area: user?.service_area || '',
    city: user?.city || '',
    state: user?.state || ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      params.sort = sortBy;

      const { data } = await api.get('/reports', { params });
      setReports(data.data || []);
    } catch (err) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, sortBy]);

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api.get('/messages');
      setMessages(data);
    } catch (err) {
      toast.error('Failed to load messages');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'rescues') fetchReports();
    else if (activeTab === 'inbox') fetchMessages();
  }, [activeTab, fetchReports, fetchMessages]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/reports/${id}`, { status: newStatus });
      toast.success(`Report marked as ${newStatus.replace('_', ' ')}`);
      fetchReports();
    } catch (err) {
      toast.error('Failed to update report');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const { data } = await api.post('/messages', { content: newMessage });
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const handleEditMessage = async (e) => {
    e.preventDefault();
    if (!editMessageContent.trim() || !editingMessageId) return;
    try {
      const { data } = await api.put(`/messages/${editingMessageId}`, { content: editMessageContent });
      setMessages(prev => prev.map(m => m._id === editingMessageId ? data : m));
      setEditingMessageId(null);
      setEditMessageContent('');
      toast.success('Message updated');
    } catch (err) {
      toast.error('Failed to edit message');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/profile', profileForm);
      toast.success('Profile updated successfully!');
      if (updateUser) updateUser(data); // update context if available
      setTimeout(() => window.location.reload(), 1000); // quick refresh to see changes
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-dark">Dashboard</h1>
            <p className="text-sm text-text-light mt-0.5">
              Welcome, {user?.name || 'Volunteer'}
            </p>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'profile' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-neutral text-text-dark hover:bg-neutral-dark'}`}
            >
              <User size={16} /> My Hero Profile
            </button>
            <button
              onClick={() => setActiveTab('rescues')}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'rescues' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-neutral text-text-dark hover:bg-neutral-dark'}`}
            >
              <AlertTriangle size={16} /> Active Rescues
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'inbox' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-neutral text-text-dark hover:bg-neutral-dark'}`}
            >
              Platform Inbox
            </button>
          </div>
        </div>

        {activeTab === 'profile' && user ? (
          <div className="space-y-6 animate-in fade-in">
            {/* Hero Summary */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl p-6 sm:p-8 border border-primary/20 shadow-sm relative overflow-hidden">
              <div className="absolute -right-10 -top-10 opacity-10">
                <Trophy size={200} />
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
                <div className="w-20 h-20 bg-white rounded-full flex justify-center items-center shadow-md border-4 border-primary/20">
                  <span className="text-3xl">🦸</span>
                </div>
                <div>
                  <h2 className="text-3xl font-black text-dark mb-1">{user.hero_level || 'Animal Friend 🐾'}</h2>
                  <p className="text-primary font-bold flex items-center gap-2">
                    <Heart size={18} fill="currentColor" /> {user.hearts || 0} Total Hearts
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 relative z-10">
                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white">
                  <p className="text-sm font-bold text-text-light uppercase tracking-wider mb-1">Rescues</p>
                  <p className="text-2xl font-black text-dark">{user.rescue_count || 0}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white">
                  <p className="text-sm font-bold text-text-light uppercase tracking-wider mb-1">Reunited</p>
                  <p className="text-2xl font-black text-dark">{user.reunited_pets_count || 0}</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Achievements */}
              <div className="bg-white rounded-3xl p-6 border border-neutral shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Medal className="text-yellow-500" />
                  <h3 className="font-bold text-lg">My Achievements ({user.achievements?.length || 0})</h3>
                </div>
                {(!user.achievements || user.achievements.length === 0) ? (
                  <p className="text-text-light text-sm italic">Complete your first rescue to start earning badges!</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {user.achievements.map((ach, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-neutral/50 rounded-xl border border-neutral">
                        <div className="bg-yellow-100 p-2 rounded-lg"><Trophy size={16} className="text-yellow-600"/></div>
                        <div>
                          <p className="font-bold text-sm text-dark">{ach.title}</p>
                          <p className="text-[10px] text-text-light">Earned on {new Date(ach.earned_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Profile Settings */}
              <div className="bg-white rounded-3xl p-6 border border-neutral shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="text-text-light" />
                  <h3 className="font-bold text-lg">Profile & Location Settings</h3>
                </div>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-light uppercase tracking-wider mb-1">Service Area (Neighborhood/Zone)</label>
                    <input
                      type="text"
                      value={profileForm.service_area}
                      onChange={e => setProfileForm({ ...profileForm, service_area: e.target.value })}
                      placeholder="e.g. KPHB, Madhapur"
                      className="w-full px-4 py-2 border border-neutral rounded-xl bg-neutral/30 focus:outline-none focus:border-primary text-sm"
                    />
                    <p className="text-[10px] text-text-light mt-1">This connects you to the local Area Leaderboard.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-text-light uppercase tracking-wider mb-1">City</label>
                      <input
                        type="text"
                        value={profileForm.city}
                        onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                        className="w-full px-4 py-2 border border-neutral rounded-xl bg-neutral/30 focus:outline-none focus:border-primary text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-light uppercase tracking-wider mb-1">State</label>
                      <input
                        type="text"
                        value={profileForm.state}
                        onChange={e => setProfileForm({ ...profileForm, state: e.target.value })}
                        className="w-full px-4 py-2 border border-neutral rounded-xl bg-neutral/30 focus:outline-none focus:border-primary text-sm"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={savingProfile} className="w-full bg-dark text-white py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-colors disabled:opacity-50">
                    {savingProfile ? 'Saving...' : 'Save Settings'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : activeTab === 'rescues' ? (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold text-text-light">{reports.length} reports</p>
              <button
                onClick={fetchReports}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-neutral rounded-xl hover:bg-neutral/30 transition-colors"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            {/* Stats */}
            <StatsBar reports={reports} />

        {/* Filters & View Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-text-light" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-neutral rounded-xl bg-white focus:outline-none focus:border-primary"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="rescued">Rescued</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-neutral rounded-xl bg-white focus:outline-none focus:border-primary"
            >
              <option value="">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="sm:ml-auto flex items-center bg-white border border-neutral rounded-xl overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                view === 'list' ? 'bg-primary text-white' : 'text-text-light hover:text-dark'
              }`}
            >
              <List size={14} /> List
            </button>
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                view === 'map' ? 'bg-primary text-white' : 'text-text-light hover:text-dark'
              }`}
            >
              <MapIcon size={14} /> Map
            </button>
          </div>
        </div>

            {/* Content */}
            {loading ? (
              <div className="py-20">
                <LoadingSpinner size="lg" className="mx-auto" />
              </div>
            ) : reports.length === 0 ? (
              <div className="py-20 text-center">
                <AlertTriangle size={40} className="mx-auto text-neutral-dark mb-4" />
                <p className="text-lg font-semibold text-dark">No reports found</p>
                <p className="text-sm text-text-light mt-1">Try adjusting your filters</p>
              </div>
            ) : view === 'map' ? (
              <MapView reports={reports} onUpdateStatus={handleUpdateStatus} />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report) => (
                  <ReportCard
                    key={report._id}
                    report={report}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in h-[600px] flex flex-col bg-white border border-neutral rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-neutral bg-gray-50/50">
              <h2 className="font-bold text-dark">Support & Announcements</h2>
              <p className="text-xs text-text-light">Messages from the PawMira Admin team</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar flex flex-col bg-slate-50/30">
              {messages.map(m => {
                const isAdmin = m.sender !== user._id; // Anything not from me is from admin/broadcast
                const isBroadcast = m.receiver === null;
                return (
                  <div key={m._id} className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-4 text-sm group ${isAdmin ? 'bg-white border border-neutral shadow-sm self-start rounded-tl-none' : 'bg-primary text-white self-end rounded-tr-none shadow-md shadow-primary/20'}`}>
                    {isAdmin && isBroadcast && (
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-primary mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> Broadcast
                      </div>
                    )}
                    {isAdmin && !isBroadcast && (
                      <div className="text-[10px] uppercase tracking-wider font-bold text-text-light mb-1">Admin Support</div>
                    )}
                    
                    {editingMessageId === m._id ? (
                      <form onSubmit={handleEditMessage} className="flex flex-col gap-2 mt-1">
                        <input 
                          autoFocus
                          value={editMessageContent}
                          onChange={(e) => setEditMessageContent(e.target.value)}
                          className="w-full bg-white/20 text-white placeholder-white/50 border border-white/30 rounded-lg px-3 py-2 text-sm focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setEditingMessageId(null)} className="text-[11px] text-white/80 hover:text-white">Cancel</button>
                          <button type="submit" className="text-[11px] font-bold text-white bg-white/20 px-3 py-1 rounded-md hover:bg-white/30">Save</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex justify-between items-start gap-2">
                          <span className={isAdmin ? 'text-dark leading-relaxed' : 'text-white leading-relaxed'}>{m.content}</span>
                          {!isAdmin && (
                            <button onClick={() => { setEditingMessageId(m._id); setEditMessageContent(m.content); }} className="opacity-0 group-hover:opacity-100 text-white/80 hover:text-white transition-opacity">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                          )}
                        </div>
                        <p className={`text-[10px] mt-2 font-medium ${isAdmin ? 'text-text-light' : 'text-white/80'}`}>
                          {format(new Date(m.created_at), 'MMM d, h:mm a')} {m.is_edited && <span className="italic ml-1 opacity-80">(edited)</span>}
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-text-light">
                  <p>No messages yet.</p>
                </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-neutral bg-white flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Message the PawMira Admin team..."
                className="flex-1 bg-neutral rounded-xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />
              <button type="submit" disabled={!newMessage.trim()} className="bg-primary text-white px-8 rounded-xl font-bold text-sm hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-md shadow-primary/20">
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
