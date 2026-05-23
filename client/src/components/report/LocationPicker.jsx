import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Navigation, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function LocationPicker({ onLocationSelect, disabled }) {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const defaultCenter = [17.385, 78.4867]; // Hyderabad

  const handlePositionChange = useCallback(
    (pos) => {
      setPosition(pos);
      onLocationSelect({ latitude: pos[0], longitude: pos[1] });
    },
    [onLocationSelect]
  );

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        handlePositionChange(coords);
        setLoading(false);
      },
      (err) => {
        setError('Unable to detect location. Please tap on the map.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handlePositionChange]);

  // Auto-detect on mount
  useEffect(() => {
    detectLocation();
  }, []);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={detectLocation}
        disabled={disabled || loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl font-medium text-sm hover:bg-primary/20 transition-colors disabled:opacity-50"
      >
        <Navigation size={16} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Detecting GPS...' : position ? 'Re-detect My Location' : 'Detect My Location'}
      </button>

      {error && (
        <p className="text-xs text-warning text-center">{error}</p>
      )}

      {position && (
        <div className="flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/20 rounded-xl">
          <MapPin size={14} className="text-success shrink-0" />
          <p className="text-xs text-success font-medium truncate">
            Location: {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </p>
        </div>
      )}

      <div className="h-56 rounded-2xl overflow-hidden border border-neutral shadow-sm">
        <MapContainer
          center={position || defaultCenter}
          zoom={position ? 15 : 12}
          className="h-full w-full"
          key={position ? `${position[0]}-${position[1]}` : 'default'}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={handlePositionChange} />
        </MapContainer>
      </div>

      <p className="text-xs text-text-light text-center">
        📍 Tap the map to adjust the pin location
      </p>
    </div>
  );
}
