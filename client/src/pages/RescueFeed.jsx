import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
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

const PAGE_SIZE = 20;

export default function RescueFeed() {
  const [view, setView] = useState('list'); // 'list' | 'map'
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('checking');
  const [resolveReportId, setResolveReportId] = useState(null);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  // A new reset invalidates every older request, including in-flight Load More requests.
  const fetchIdRef = useRef(0);
  const loadingMoreRef = useRef(false);

  // Build base query string (without page/limit)
  const buildGeoQuery = useCallback((lat, lng) => {
    if (lat && lng) return `&lat=${lat}&lng=${lng}&radius=50000`;
    return '';
  }, []);

  // Fetch a specific page (reset=true replaces list, false appends).
  const fetchPage = useCallback(async (pageNum, lat, lng, reset = true) => {
    if (!reset && loadingMoreRef.current) return false;

    let myFetchId = fetchIdRef.current;
    if (reset) {
      fetchIdRef.current += 1;
      myFetchId = fetchIdRef.current;
      loadingMoreRef.current = false;
      setLoadingMore(false);
    } else {
      loadingMoreRef.current = true;
    }

    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const geo = buildGeoQuery(lat, lng);
      const { data } = await api.get(`/reports?page=${pageNum}&limit=${PAGE_SIZE}${geo}`);

      // Discard any response belonging to an earlier feed state.
      if (myFetchId !== fetchIdRef.current) return false;

      const nextReports = Array.isArray(data) ? data : [];
      setHasMore(nextReports.length === PAGE_SIZE);

      if (reset) {
        setReports(nextReports);
        setPage(1);
      } else {
        setReports(prev => {
          // Deduplicate by _id when appending
          const existing = new Set(prev.map(r => r._id));
          return [...prev, ...nextReports.filter(r => !existing.has(r._id))];
        });
        setPage(pageNum);
      }
      return true;
    } catch (error) {
      if (myFetchId === fetchIdRef.current) console.error('Failed to fetch reports', error);
      return false;
    } finally {
      if (myFetchId === fetchIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    }
  }, [buildGeoQuery]);

  useEffect(() => {
    // 1. Immediate fetch so feed loads without waiting on geolocation prompt
    fetchPage(1, null, null, true);

    // 2. Asynchronous geolocation check to update user location & nearby sorting
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationStatus('allowed');
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          // Re-fetch page 1 with geo (replaces current list with geo-sorted results)
          fetchPage(1, coords[0], coords[1], true);
        },
        () => {
          setLocationStatus('blocked');
        },
        { timeout: 4000 }
      );
    } else {
      setLocationStatus('unavailable');
    }
  }, [fetchPage]);

  useEffect(() => {
    const handleOpenResolve = (e) => setResolveReportId(e.detail);
    window.addEventListener('openResolveModal', handleOpenResolve);
    return () => window.removeEventListener('openResolveModal', handleOpenResolve);
  }, []);

  useEffect(() => {
    if (highlightId && reports.length > 0 && view === 'list') {
      setTimeout(() => {
        const element = document.getElementById(`report-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-primary', 'rounded-2xl', 'transition-all', 'duration-1000');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-primary', 'transition-all', 'duration-1000');
          }, 4000);
        } else {
          toast.error('The highlighted report is not currently visible in your feed. It may have been resolved, deleted, or is outside your current location radius.', { duration: 5000 });
        }
      }, 500);
    }
  }, [highlightId, searchParams.get('t'), reports, view]);

  const handleLoadMore = () => {
    if (loadingMoreRef.current || loading) return;
    const nextPage = page + 1;
    if (userLocation) fetchPage(nextPage, userLocation[0], userLocation[1], false);
    else fetchPage(nextPage, null, null, false);
  };

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
      // Full refresh
      if (userLocation) fetchPage(1, userLocation[0], userLocation[1], true);
      else fetchPage(1, null, null, true);
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
            onClick={() => { if (userLocation) fetchPage(1, userLocation[0], userLocation[1], true); else fetchPage(1, null, null, true); }}
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
                        src={getSafeImageUrl(report.image_url, undefined, 800)}
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
          {reports.length === 0 && !loading && (
            <EmptyState preset="rescue" />
          )}
          {/* Pagination — Load More */}
          {hasMore && reports.length > 0 && (
            <div className="col-span-full flex justify-center py-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral bg-white px-6 py-3 text-sm font-semibold text-text-dark shadow-sm hover:border-primary/30 hover:text-primary transition-colors disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Loading more...
                  </>
                ) : (
                  'Load More Rescues'
                )}
              </button>
            </div>
          )}
          {!hasMore && reports.length > 0 && (
            <div className="col-span-full text-center py-6 text-sm text-text-light">
              All active rescues loaded · {reports.length} case{reports.length !== 1 ? 's' : ''} shown
            </div>
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
