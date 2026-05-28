import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Search, Heart, MapPin, List, Map, X, Plus, Phone, Calendar, Tag, PawPrint } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getSafeImageUrl } from '../utils/imageUtils';
import ImageUpload from '../components/report/ImageUpload';
import LocationPicker from '../components/report/LocationPicker';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ANIMAL_TYPES = ['dog', 'cat', 'other'];
const STATUS_COLORS = {
  searching: 'bg-orange-100 text-orange-700 border-orange-200',
  found: 'bg-blue-100 text-blue-700 border-blue-200',
  reunited: 'bg-green-100 text-green-700 border-green-200',
  active: 'bg-orange-100 text-orange-700 border-orange-200',
  matched: 'bg-blue-100 text-blue-700 border-blue-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
};
const ANIMAL_EMOJI = { dog: '🐕', cat: '🐈', other: '🐾' };

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function PetCard({ pet, type }) {
  const isLost = type === 'lost';
  const date = isLost ? pet.last_seen_at : pet.found_at;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-neutral shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative h-44 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
        {pet.image_url ? (
          <img src={getSafeImageUrl(pet.image_url)} alt="Pet" className="w-full h-full object-cover" crossOrigin="anonymous" />
        ) : (
          <span className="text-5xl">{ANIMAL_EMOJI[pet.animal_type] || '🐾'}</span>
        )}
        <div className="absolute top-3 left-3"><StatusBadge status={pet.status} /></div>
        {isLost && <div className="absolute top-3 right-3 bg-primary/90 text-white text-xs font-bold px-2 py-1 rounded-full">LOST</div>}
        {!isLost && <div className="absolute top-3 right-3 bg-secondary/90 text-white text-xs font-bold px-2 py-1 rounded-full">FOUND</div>}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            {isLost && <h3 className="font-bold text-dark text-base">{pet.pet_name}</h3>}
            <p className="text-sm text-text-light capitalize">{pet.animal_type}{pet.breed ? ` · ${pet.breed}` : ''}</p>
          </div>
        </div>
        {isLost && pet.color && (
          <div className="flex items-center gap-1.5 text-xs text-text-light">
            <Tag size={12} /><span>{pet.color}</span>
          </div>
        )}
        <p className="text-sm text-text line-clamp-2">{pet.description}</p>
        <div className="flex items-center gap-1.5 text-xs text-text-light">
          <Calendar size={12} />
          <span>{date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
        </div>
        {pet.latitude && !isLost && (
          <div className="flex items-center gap-1.5 text-xs text-text-light">
            <MapPin size={12} /><span>{pet.latitude?.toFixed(4)}, {pet.longitude?.toFixed(4)}</span>
          </div>
        )}
        <div className="flex items-center gap-2 mt-1">
          <a
            href={`tel:${isLost ? pet.contact_phone : pet.finder_contact}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-semibold hover:bg-primary hover:text-white transition-colors"
          >
            <Phone size={14} /> Contact
          </a>
          {isLost && pet.status === 'searching' && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openReuniteModal', { detail: pet._id }))}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-100 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-600 hover:text-white transition-colors border border-green-200"
            >
              🎉 Reunited
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function LostPetForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({ pet_name: '', animal_type: 'dog', breed: '', color: '', last_seen_at: '', description: '', contact_phone: '' });
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) return toast.error('Please select a location on the map');
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      // No longer sending exact lat/lng for privacy on lost pets!
      if (image) fd.append('image', image);
      await axios.post(`${API}/lost-found/lost-pets`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Lost pet report submitted! 🙏');
      onSuccess();
    } catch {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-text-light mb-1.5">Pet Name *</label>
          <input required value={form.pet_name} onChange={set('pet_name')} placeholder="e.g. Bruno" className="w-full px-4 py-3 rounded-xl border-2 border-neutral text-sm focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-light mb-1.5">Animal Type *</label>
          <select required value={form.animal_type} onChange={set('animal_type')} className="w-full px-4 py-3 rounded-xl border-2 border-neutral text-sm focus:outline-none focus:border-primary bg-white">
            {ANIMAL_TYPES.map(t => <option key={t} value={t}>{ANIMAL_EMOJI[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-light mb-1.5">Color *</label>
          <input required value={form.color} onChange={set('color')} placeholder="e.g. Golden, Black" className="w-full px-4 py-3 rounded-xl border-2 border-neutral text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-text-light mb-1.5">Breed (optional)</label>
          <input value={form.breed} onChange={set('breed')} placeholder="e.g. Labrador" className="w-full px-4 py-3 rounded-xl border-2 border-neutral text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-text-light mb-1.5">Last Seen Date & Time *</label>
          <input required type="datetime-local" value={form.last_seen_at} onChange={set('last_seen_at')} className="w-full px-4 py-3 rounded-xl border-2 border-neutral text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-text-light mb-1.5">Description *</label>
          <textarea required value={form.description} onChange={set('description')} rows={3} placeholder="Describe appearance, collar, any identifying marks..." className="w-full px-4 py-3 rounded-xl border-2 border-neutral text-sm focus:outline-none focus:border-primary resize-none" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-text-light mb-1.5">Your Contact Number *</label>
          <input required type="tel" value={form.contact_phone} onChange={set('contact_phone')} placeholder="+91 98765 43210" className="w-full px-4 py-3 rounded-xl border-2 border-neutral text-sm focus:outline-none focus:border-primary" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-text-light mb-1.5">Photo (optional)</label>
        <ImageUpload onImageSelect={setImage} disabled={submitting} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-text-light mb-1.5">Last Seen Area / Neighborhood *</label>
        <input required value={form.area_name || ''} onChange={set('area_name')} placeholder="e.g. Near Suncity, Bandlaguda" className="w-full px-4 py-3 rounded-xl border-2 border-neutral text-sm focus:outline-none focus:border-primary" />
        <p className="text-[10px] text-text-light mt-1">For safety, exact GPS coordinates are not collected.</p>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-neutral text-sm font-semibold text-text hover:bg-neutral/50 transition-colors">Cancel</button>
        <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-60">
          {submitting ? 'Submitting...' : '🐾 Submit Report'}
        </button>
      </div>
    </form>
  );
}

function FoundPetForm({ onClose, onSuccess }) {
  const [form, setForm] = useState({ animal_type: 'dog', breed: '', found_at: '', description: '', finder_contact: '' });
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location) return toast.error('Please select the location where you found the pet');
    if (!image) return toast.error('Please add a photo of the found pet');
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('latitude', location.latitude);
      fd.append('longitude', location.longitude);
      fd.append('image', image);
      await axios.post(`${API}/lost-found/found-pets`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Found pet report submitted! Thank you 💚');
      onSuccess();
    } catch {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-text-light mb-1.5">Animal Type *</label>
          <select required value={form.animal_type} onChange={set('animal_type')} className="w-full px-4 py-3 rounded-xl border-2 border-neutral text-sm focus:outline-none focus:border-primary bg-white">
            {ANIMAL_TYPES.map(t => <option key={t} value={t}>{ANIMAL_EMOJI[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-text-light mb-1.5">Approximate Breed</label>
          <input value={form.breed} onChange={set('breed')} placeholder="Optional" className="w-full px-4 py-3 rounded-xl border-2 border-neutral text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-text-light mb-1.5">Date & Time Found *</label>
          <input required type="datetime-local" value={form.found_at} onChange={set('found_at')} className="w-full px-4 py-3 rounded-xl border-2 border-neutral text-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-text-light mb-1.5">Description *</label>
          <textarea required value={form.description} onChange={set('description')} rows={3} placeholder="Color, size, any collar or markings, behaviour..." className="w-full px-4 py-3 rounded-xl border-2 border-neutral text-sm focus:outline-none focus:border-primary resize-none" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-text-light mb-1.5">Your Contact Number *</label>
          <input required type="tel" value={form.finder_contact} onChange={set('finder_contact')} placeholder="+91 98765 43210" className="w-full px-4 py-3 rounded-xl border-2 border-neutral text-sm focus:outline-none focus:border-primary" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-text-light mb-1.5">Photo of the Pet * <span className="text-text-light font-normal">(required for identification)</span></label>
        <ImageUpload onImageSelect={setImage} disabled={submitting} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-text-light mb-1.5">Where You Found Them *</label>
        <LocationPicker onLocationSelect={setLocation} disabled={submitting} />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-neutral text-sm font-semibold text-text hover:bg-neutral/50 transition-colors">Cancel</button>
        <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-60">
          {submitting ? 'Submitting...' : '💚 I Found a Pet'}
        </button>
      </div>
    </form>
  );
}

function ReunitePetForm({ petId, onClose, onSuccess }) {
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image) return toast.error('Please add a reunion photo!');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('image', image);
      await axios.post(`${API}/lost-found/lost-pets/${petId}/reunite`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Amazing news! Pet marked as reunited. 🎉');
      onSuccess();
    } catch {
      toast.error('Failed to update. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-center">
      <div className="text-6xl mb-2">🎉</div>
      <h3 className="text-xl font-bold text-dark">Did you find them?</h3>
      <p className="text-sm text-text-light mb-4">Upload a photo of the happy reunion to share the good news with the community!</p>
      
      <div className="text-left">
        <ImageUpload onImageSelect={setImage} disabled={submitting} />
      </div>

      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-neutral text-sm font-semibold text-text hover:bg-neutral/50 transition-colors">Cancel</button>
        <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-60">
          {submitting ? 'Updating...' : 'Confirm Reunion! 💚'}
        </button>
      </div>
    </form>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-dark/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
          <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-neutral">
            <h2 className="text-lg font-bold text-dark">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral transition-colors"><X size={20} /></button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function LostFound() {
  const [activeTab, setActiveTab] = useState('lost');
  const [viewMode, setViewMode] = useState('list');
  const [lostPets, setLostPets] = useState([]);
  const [foundPets, setFoundPets] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'lost' | 'found' | null
  const [userLocation, setUserLocation] = useState(null);

  const [reunitePetId, setReunitePetId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lostRes, foundRes, achRes] = await Promise.all([
        axios.get(`${API}/lost-found/lost-pets`),
        axios.get(`${API}/lost-found/found-pets`),
        axios.get(`${API}/lost-found/achievements`)
      ]);
      setLostPets(lostRes.data);
      setFoundPets(foundRes.data);
      setAchievements(achRes.data);
    } catch {
      toast.error('Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handleOpenReunite = (e) => setReunitePetId(e.detail);
    window.addEventListener('openReuniteModal', handleOpenReunite);
    return () => window.removeEventListener('openReuniteModal', handleOpenReunite);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  const activePets = activeTab === 'lost' ? lostPets : (activeTab === 'found' ? foundPets : achievements);
  // Only show pins for Found pets or those that explicitly have lat/lng still (legacy)
  const mapPets = activePets.filter(p => p.latitude && p.longitude && activeTab !== 'achievements');

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <div className="bg-gradient-to-br from-dark via-secondary to-dark pt-24 pb-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 bg-primary/20 text-primary border border-primary/30 px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
            <PawPrint size={14} /> Community — Lost & Found
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
            Lost & Found <span className="text-primary">Pets</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-neutral text-lg mb-8">
            Help reunite pets with their families. Every post could bring a family back together. 🐾
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              id="report-lost-btn"
              onClick={() => setModal('lost')}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 text-sm"
            >
              <Search size={16} /> Report Lost Pet
            </button>
            <button
              id="report-found-btn"
              onClick={() => setModal('found')}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-dark font-bold rounded-2xl hover:bg-neutral transition-all text-sm"
            >
              <Heart size={16} /> I Found a Pet
            </button>
          </motion.div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-neutral">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-center gap-8 text-sm">
          <span className="text-text-light"><span className="font-bold text-dark">{lostPets.filter(p => p.status === 'searching').length}</span> searching</span>
          <span className="text-text-light"><span className="font-bold text-green-600">{lostPets.filter(p => p.status === 'reunited').length}</span> reunited 🎉</span>
          <span className="text-text-light"><span className="font-bold text-secondary">{foundPets.filter(p => p.status === 'active').length}</span> found pets</span>
        </div>
      </div>

      {/* Controls */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex bg-neutral rounded-2xl p-1 gap-1">
            {[
              { key: 'lost', label: '🔍 Lost Pets' }, 
              { key: 'found', label: '💚 Found Pets' },
              { key: 'achievements', label: '🏆 Achievements' }
            ].map(tab => (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-white text-dark shadow-sm' : 'text-text-light hover:text-dark'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-neutral rounded-2xl p-1 gap-1">
            <button id="view-list" onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-white text-dark shadow-sm' : 'text-text-light'}`}>
              <List size={14} /> List
            </button>
            <button id="view-map" onClick={() => setViewMode('map')} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${viewMode === 'map' ? 'bg-white text-dark shadow-sm' : 'text-text-light'}`}>
              <Map size={14} /> Map
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-text-light text-sm">Loading reports...</p>
          </div>
        ) : viewMode === 'map' ? (
          <div className="h-[520px] rounded-3xl overflow-hidden border border-neutral shadow-sm">
            <MapContainer center={userLocation || [17.385, 78.4867]} zoom={userLocation ? 12 : 11} className="h-full w-full">
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {userLocation && (
                <Marker position={userLocation}>
                  <Popup className="custom-popup font-semibold text-sm">You are here</Popup>
                </Marker>
              )}
              {mapPets.map((pet) => {
                const isLost = activeTab === 'lost';
                const colorClass = isLost ? 'bg-orange-500' : 'bg-green-500';
                
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
                  <Marker key={pet._id} position={[pet.latitude, pet.longitude]} icon={customIcon}>
                    <Popup>
                      <div className="text-sm space-y-1 min-w-[160px]">
                        {pet.image_url && <img src={pet.image_url} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />}
                        <p className="font-bold">{pet.pet_name || `Found ${pet.animal_type}`}</p>
                        <p className="text-gray-500 capitalize">{pet.animal_type}{pet.breed ? ` · ${pet.breed}` : ''}</p>
                        <StatusBadge status={pet.status} />
                        <a href={`tel:${pet.contact_phone || pet.finder_contact}`} className="block text-center mt-2 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold">
                          📞 Call
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        ) : activePets.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🐾</div>
            <h3 className="text-xl font-bold text-dark mb-2">No {activeTab === 'lost' ? 'lost' : 'found'} pets reported yet</h3>
            <p className="text-text-light mb-6">Be the first to help the community.</p>
            <button
              onClick={() => setModal(activeTab === 'lost' ? 'lost' : 'found')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-semibold hover:bg-primary-dark transition-colors"
            >
              <Plus size={16} /> Add a Report
            </button>
          </div>
        ) : activeTab === 'achievements' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activePets.map(pet => (
              <div key={pet._id} className="bg-white rounded-2xl border border-neutral shadow-sm overflow-hidden p-4 text-center">
                <div className="flex gap-2 mb-4">
                  <img src={getSafeImageUrl(pet.image_url)} alt="Lost" className="w-1/2 h-32 object-cover rounded-xl" crossOrigin="anonymous" />
                  <img src={getSafeImageUrl(pet.reunited_image_url)} alt="Found" className="w-1/2 h-32 object-cover rounded-xl border-4 border-green-500" crossOrigin="anonymous" />
                </div>
                <h3 className="font-bold text-lg text-dark">Welcome home, {pet.pet_name}! 🎉</h3>
                <p className="text-sm text-text-light mb-2">Reunited safely with their family.</p>
                <div className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold uppercase rounded-full">
                  Successfully Resolved
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activePets.map(pet => (
              <PetCard key={pet._id} pet={pet} type={activeTab} />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === 'lost' && (
        <Modal title="🔍 Report a Lost Pet" onClose={() => setModal(null)}>
          <LostPetForm onClose={() => setModal(null)} onSuccess={() => { setModal(null); fetchData(); }} />
        </Modal>
      )}
      {modal === 'found' && (
        <Modal title="💚 I Found a Pet" onClose={() => setModal(null)}>
          <FoundPetForm onClose={() => setModal(null)} onSuccess={() => { setModal(null); fetchData(); }} />
        </Modal>
      )}
      {reunitePetId && (
        <Modal title="Report Reunion" onClose={() => setReunitePetId(null)}>
          <ReunitePetForm petId={reunitePetId} onClose={() => setReunitePetId(null)} onSuccess={() => { setReunitePetId(null); fetchData(); }} />
        </Modal>
      )}
    </div>
  );
}
