import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import RescueCard from '../components/report/RescueCard';
import { Navigation, MapPin, List } from 'lucide-react';
import { PageLoader } from '../components/ui/LoadingSpinner';

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
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          fetchReports(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          fetchReports(); // Fallback if user denies geolocation
        }
      );
    } else {
      fetchReports();
    }
  }, [fetchReports]);

  if (loading && reports.length === 0) return <PageLoader />;

  const handleUpdate = () => {
    if (userLocation) fetchReports(userLocation[0], userLocation[1]);
    else fetchReports();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-dark">Live Rescue Feed</h1>
          <p className="text-text-light text-sm mt-1">
            Real-time emergency reports near you. Prioritized by severity.
          </p>
        </div>

        <div className="flex bg-neutral rounded-xl p-1 border border-neutral">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'list'
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-light hover:text-text-dark'
            }`}
          >
            <List size={16} /> List
          </button>
          <button
            onClick={() => setView('map')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'map'
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-light hover:text-text-dark'
            }`}
          >
            <MapPin size={16} /> Map
          </button>
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
            {userLocation && <MapUpdater center={userLocation} />}
            {reports.map((report) => (
              <Marker
                key={report._id}
                position={[report.latitude, report.longitude]}
              >
                <Popup className="custom-popup">
                  <div className="p-2 w-48">
                    <img 
                      src={report.image_url || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=500'} 
                      className="w-full h-24 object-cover rounded-lg mb-2" 
                      alt="Rescue" 
                    />
                    <h3 className="font-bold text-sm text-text-dark capitalize">{report.issue_type.replace('_', ' ')}</h3>
                    <p className="text-xs text-text-light line-clamp-2 mt-1">{report.description}</p>
                    <a href={`#report-${report._id}`} className="text-primary text-xs font-semibold mt-2 block hover:underline" onClick={() => setView('list')}>
                      View Details →
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
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
            <div className="col-span-full py-12 text-center text-text-light">
              <p>No active rescues found in your area.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
