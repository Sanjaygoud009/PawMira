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
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import StatusBadge from '../components/ui/StatusBadge';
import PriorityBadge from '../components/ui/PriorityBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

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
                    src={report.image_url}
                    alt="Report"
                    className="w-full h-24 object-cover rounded-lg"
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
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('-created_at');

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

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.patch(`/reports/${id}`, { status: newStatus });
      toast.success(`Report marked as ${newStatus.replace('_', ' ')}`);
      fetchReports();
    } catch (err) {
      toast.error('Failed to update report');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-dark">Dashboard</h1>
            <p className="text-sm text-text-light mt-0.5">
              Welcome, {user?.name || 'Volunteer'} • {reports.length} reports
            </p>
          </div>
          <button
            onClick={fetchReports}
            className="self-start flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-neutral rounded-xl hover:bg-neutral/30 transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
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
    </div>
  );
}
