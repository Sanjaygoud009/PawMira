import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import RescueCard from '../components/report/RescueCard';
import { getSafeImageUrl } from '../utils/imageUtils';
import { Navigation, MapPin, List, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { SkeletonGrid, SkeletonRescueCard } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { AnimatePresence, motion } from 'framer-motion';
import ImageUpload from '../components/report/ImageUpload';
import toast from 'react-hot-toast';

function Modal({ title, onClose, children }) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-dark/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral bg-gray-50/50">
            <h2 className="text-lg font-bold text-dark">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral transition-colors text-text-light hover:text-dark">
              <X size={20} />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ResolveReportForm({ reportId, onClose, onSuccess }) {
  const [image, setImage] = useState(null);
  const [resolvedByName, setResolvedByName] = useState('');
  const [resolvedByRole, setResolvedByRole] = useState('Volunteer');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return toast.error('A photo of the safe animal is required!');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('image', image);
      if (resolvedByName) fd.append('resolved_by_name', resolvedByName);
      fd.append('resolved_by_role', resolvedByRole);
      
      await api.post(`/reports/${reportId}/resolve`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Amazing work! The animal is marked as safe. 💚');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 text-success rounded-full mb-3 shadow-sm border border-success/20">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h3 className="text-xl font-bold text-dark">Mark as Safe</h3>
        <p className="text-sm text-text-light mt-1">Provide proof of rescue to mark this emergency as resolved.</p>
      </div>
      
      <div>
        <label className="block text-xs font-semibold text-text-light mb-1.5 uppercase tracking-wide">Photo Proof *</label>
        <ImageUpload onImageSelect={setImage} disabled={submitting} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-text-light mb-1.5 uppercase tracking-wide">Your Name</label>
          <input value={resolvedByName} onChange={e => setResolvedByName(e.target.value)} placeholder="e.g. John Doe" className="w-full px-4 py-3 rounded-xl border border-neutral text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-gray-50/50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-light mb-1.5 uppercase tracking-wide">Your Role</label>
          <select value={resolvedByRole} onChange={e => setResolvedByRole(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-gray-50/50 appearance-none">
            <option value="Volunteer">Volunteer</option>
            <option value="NGO Partner">NGO Partner</option>
            <option value="Community Member">Community Member</option>
            <option value="Veterinarian">Veterinarian</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-neutral mt-6">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-neutral text-sm font-semibold text-text-dark hover:bg-neutral transition-colors shadow-sm">Cancel</button>
        <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-success text-white text-sm font-bold hover:bg-green-600 transition-all shadow-md shadow-success/20 disabled:opacity-60 disabled:cursor-not-allowed">
          {submitting ? 'Saving...' : 'Confirm Safe'}
        </button>
      </div>
    </form>
  );
}

// Map icon config
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function RescueFeed() {
  const [view, setView] = useState('list'); // 'list' | 'map'
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('checking');
  const [resolveReportId, setResolveReportId] = useState(null);
  const { user } = useAuth();

  const fetchReports = useCallback(async (lat, lng) => {
    try {
      setLoading(true);
      let query = '';
      if (lat && lng) {
        query = `?lat=${lat}&lng=${lng}&radius=50000`;
      }
      const { data } = await api.get(`/reports${query}`);
      setReports(data);
    } catch (error) {
      console.error('Failed to fetch reports', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationStatus('allowed');
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          fetchReports(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setLocationStatus('blocked');
          fetchReports(); // Fallback if user denies geolocation
        }
      );
    } else {
      setLocationStatus('unavailable');
      fetchReports();
    }
  }, [fetchReports]);

    useEffect(() => {
    const handleOpenResolve = (e) => setResolveReportId(e.detail);
    window.addEventListener('openResolveModal', handleOpenResolve);
    return () => window.removeEventListener('openResolveModal', handleOpenResolve);
  }, []);

  if (loading && reports.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <SkeletonGrid count={6} Component={SkeletonRescueCard} />
      </div>
    );
  }

  const handleUpdate = (updatedReport) => {
    if (updatedReport && updatedReport._id) {
      setReports(prev => prev.map(r => r._id === updatedReport._id ? { ...r, ...updatedReport } : r));
    } else {
      if (userLocation) fetchReports(userLocation[0], userLocation[1]);
      else fetchReports();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary mb-3">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Live cases
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-text-dark">Live Rescue Feed</h1>
          <p className="text-text-light text-sm mt-1">
            Real-time emergency reports near you. Prioritized by severity.
          </p>
          {locationStatus === 'blocked' && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning">
              <AlertTriangle size={14} />
              Location permission is off, so showing all active reports.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral bg-white px-4 py-2 text-sm font-semibold text-text-dark shadow-sm hover:border-primary/30 hover:text-primary transition-colors disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <div className="flex bg-neutral rounded-xl p-1 border border-neutral">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'list'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-light hover:text-text-dark'
              }`}
            >
              <List size={16} /> List
            </button>
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'map'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-light hover:text-text-dark'
              }`}
            >
              <MapPin size={16} /> Map
            </button>
          </div>
        </div>
      </div>

      {view === 'map' ? (
        <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-neutral shadow-sm relative z-0">
          <MapContainer
            center={userLocation || [17.385, 78.4867]}
            zoom={userLocation ? 12 : 5}
            className="h-full w-full"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OSM'
            />
            {userLocation && (
              <>
                <MapUpdater center={userLocation} />
                <Marker position={userLocation}>
                  <Popup className="custom-popup font-semibold text-sm">You are here</Popup>
                </Marker>
              </>
            )}
            {reports.map((report) => {
              if (!report.latitude || !report.longitude) return null;
              
              // Custom HTML icon for glowing effect
              const isCritical = report.priority === 'critical' || report.priority === 'high';
              const colorClass = isCritical ? 'bg-error' : 'bg-primary';
              
              const customIcon = L.divIcon({
                html: `
                  <div class="relative flex items-center justify-center w-10 h-10">
                    <span class="absolute inline-flex h-full w-full rounded-full ${colorClass} opacity-60 animate-ping"></span>
                    <span class="relative inline-flex rounded-full h-5 w-5 ${colorClass} border-[2.5px] border-white shadow-[0_0_12px_rgba(0,0,0,0.5)]"></span>
                  </div>
                `,
                className: 'bg-transparent border-none',
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                popupAnchor: [0, -20],
              });

              return (
                <Marker
                  key={report._id}
                  position={[report.latitude, report.longitude]}
                  icon={customIcon}
                >
                  <Popup className="custom-popup">
                    <div className="p-2 w-48">
                      <img 
                        src={getSafeImageUrl(report.image_url)} 
                        className="w-full h-24 object-cover rounded-lg mb-2" 
                        alt="Rescue" 
                      />
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: isCritical ? '#EF4444' : '#F97316' }}></span>
                        <h3 className="font-bold text-sm text-text-dark capitalize leading-tight">{report.issue_type.replace('_', ' ')}</h3>
                      </div>
                      <p className="text-xs text-text-light line-clamp-2">{report.description}</p>
                      <a href={`#report-${report._id}`} className="text-primary text-xs font-semibold mt-2 block hover:underline" onClick={() => setView('list')}>
                        View Details →
                      </a>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div id={`report-${report._id}`} key={report._id}>
              <RescueCard report={report} onUpdate={handleUpdate} user={user} />
            </div>
          ))}
          {reports.length === 0 && (
            <EmptyState preset="rescue" />
          )}
        </div>
      )}
      
      {resolveReportId && (
        <Modal title="Report Reunion" onClose={() => setResolveReportId(null)}>
          <ResolveReportForm 
            reportId={resolveReportId} 
            onClose={() => setResolveReportId(null)} 
            onSuccess={() => { setResolveReportId(null); handleUpdate(); }} 
          />
        </Modal>
      )}
    </div>
  );
}
