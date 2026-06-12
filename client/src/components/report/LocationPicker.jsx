import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Navigation, MapPin, Maximize2, Minimize2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition, disabled, defaultCenter }) {
  const markerRef = useRef(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          setPosition([latLng.lat, latLng.lng]);
        }
      },
    }),
    [setPosition]
  );

  useMapEvents({
    click(e) {
      if (!disabled) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  const markerPos = position || defaultCenter;

  return (
    <Marker 
      draggable={!disabled} 
      eventHandlers={eventHandlers} 
      position={markerPos} 
      ref={markerRef} 
    />
  );
}

export default function LocationPicker({ onLocationSelect, disabled }) {
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
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

  // Auto-detect on mount is intentionally disabled
  // User must click 'Auto Detect' or adjust the pin manually

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center bg-white border border-neutral p-3 rounded-2xl shadow-sm">
        <div className="flex-1 pr-3">
          <p className="text-sm font-semibold text-dark">Adjust Location</p>
          <p className="text-xs text-text-light mt-0.5">Drag the pin or tap the map</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center p-2 bg-neutral/20 text-dark rounded-xl hover:bg-neutral/40 transition-colors"
            title={isExpanded ? "Collapse Map" : "Expand Map"}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            type="button"
            onClick={detectLocation}
            disabled={disabled || loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold text-xs hover:bg-primary/20 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Navigation size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Detecting...' : 'Auto Detect'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-warning">{error}</p>
      )}

      <div className={`${isExpanded ? 'h-[400px] sm:h-[450px]' : 'h-[200px]'} transition-all duration-300 rounded-2xl overflow-hidden border border-neutral shadow-sm relative z-0`}>
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
          <LocationMarker position={position} setPosition={handlePositionChange} disabled={disabled} defaultCenter={defaultCenter} />
        </MapContainer>
      </div>
      
      {position && (
        <div className="flex items-center gap-2 px-3 py-2 bg-success/10 border border-success/20 rounded-xl">
          <MapPin size={14} className="text-success shrink-0" />
          <p className="text-xs text-success font-medium truncate">
            Selected: {position[0].toFixed(5)}, {position[1].toFixed(5)}
          </p>
        </div>
      )}
    </div>
  );
}
