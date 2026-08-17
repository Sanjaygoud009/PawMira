import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Phone,
  User,
  FileText,
  Send,
  CheckCircle,
  Loader2,
  Mic,
  MicOff,
  MapPin,
  Camera,
  Heart,
  Sparkles,
  Info,
  X,
  Bot
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ImageUpload from '../components/report/ImageUpload';
import LocationPicker from '../components/report/LocationPicker';
import api from '../utils/api';

const issueTypes = [
  { value: 'severe_injury', label: '🚨 Severe Injury', desc: 'Critical wounds, bleeding, or broken bones' },
  { value: 'injured', label: '🩹 Injured', desc: 'Visible wounds or limping' },
  { value: 'starving', label: '🍽️ Starving', desc: 'Malnourished or dehydrated' },
  { value: 'abandoned', label: '😢 Abandoned', desc: 'Left alone in distress' },
  { value: 'stuck', label: '🚧 Trapped', desc: 'Unable to move freely' },
  { value: 'other', label: '📋 Other', desc: 'Something else' },
];

const emergencyLevels = [
  { value: 'critical', label: 'Critical', desc: 'Life at risk', color: 'bg-red-500', tint: 'bg-red-50', text: 'text-red-700', active: 'bg-red-500 text-white' },
  { value: 'high', label: 'High', desc: 'Quick help', color: 'bg-orange-500', tint: 'bg-orange-50', text: 'text-orange-700', active: 'bg-orange-500 text-white' },
  { value: 'medium', label: 'Medium', desc: 'Distress', color: 'bg-yellow-500', tint: 'bg-yellow-50', text: 'text-yellow-700', active: 'bg-yellow-500 text-white' },
  { value: 'low', label: 'Low', desc: 'Monitor', color: 'bg-blue-500', tint: 'bg-blue-50', text: 'text-blue-700', active: 'bg-blue-500 text-white' },
];

export default function ReportEmergency() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [aiError, setAiError] = useState(null);

  const [form, setForm] = useState({
    reporter_name: '',
    reporter_phone: '',
    issue_type: '',
    other_issue_type: '',
    priority: '',
    description: '',
    image: null,
    location: null,
  });

  const [errors, setErrors] = useState({});
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const originalDescRef = useRef('');

  // Voice typing implementation
  const toggleListening = useCallback(() => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    
    setForm(currentForm => {
      originalDescRef.current = currentForm.description;
      return currentForm;
    });

    recognition.onstart = () => {
      setIsListening(true);
      toast.success('Listening... Speak now.');
    };
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      
      if (finalTranscript) {
        originalDescRef.current = (originalDescRef.current + ' ' + finalTranscript).trim();
      }
      
      setForm(f => ({ 
        ...f, 
        description: (originalDescRef.current + ' ' + interimTranscript).trim() 
      }));
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') toast.error('Voice input error: ' + event.error);
    };

    recognition.onend = () => setIsListening(false);

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  }, [isListening]);

  const validateForm = () => {
    const errs = {};
    if (!form.issue_type) errs.issue_type = 'Please select the situation type.';
    if (form.issue_type === 'other' && !form.other_issue_type?.trim()) errs.other_issue_type = 'Please specify the situation.';
    if (!form.priority) errs.priority = 'Please select an emergency level.';
    if (!form.location) errs.location = 'Please pin the animal\'s location on the map.';
    if (!form.image) errs.image = 'An image of the animal is required to help rescue teams.';
    if (!form.reporter_phone.trim()) {
      errs.reporter_phone = 'Phone number is required so we can contact you.';
    } else if (!/^[+]?\d{10,15}$/.test(form.reporter_phone.replace(/\s/g, ''))) {
      errs.reporter_phone = 'Please enter a valid phone number (10-15 digits).';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error(Object.values(errs)[0]);
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('reporter_name', form.reporter_name);
      formData.append('reporter_phone', form.reporter_phone);
      formData.append('issue_type', form.issue_type);
      formData.append('priority', form.priority);
      
      let finalDesc = form.description;
      if (form.issue_type === 'other' && form.other_issue_type?.trim()) {
        finalDesc = `Specific Issue: ${form.other_issue_type}\n\n${finalDesc}`.trim();
      }
      formData.append('description', finalDesc);
      formData.append('latitude', form.location.latitude);
      formData.append('longitude', form.location.longitude);
      if (form.image) formData.append('image', form.image);

      await api.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSubmitted(true);
      toast.success('Report submitted successfully!');
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      const errorData = err.response?.data || {};
      const message = String(errorData?.message || '');
      const reason = String(errorData?.reason || '');

      if (errorData?.code === 'AI_ANIMAL_NOT_DETECTED') {
        setAiError('not_detected');
      } else if (errorData?.code === 'AI_VALIDATION_UNAVAILABLE') {
        setAiError('unavailable');
      } else {
        let errorMessage = message || 'Something went wrong. Try again.';
        if (errorData?.reason) {
          errorMessage += `\nReason: ${errorData.reason}`;
        }
        toast.error(errorMessage, { duration: 8000 });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 relative">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="text-center space-y-6 max-w-md bg-white p-10 rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-slate-100 z-10"
        >
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 mx-auto rounded-full bg-success/10 flex items-center justify-center relative"
          >
            <div className="absolute inset-0 bg-success/20 rounded-full animate-ping opacity-50" />
            <CheckCircle size={40} className="text-success relative z-10" />
          </motion.div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Report Received!</h2>
          <p className="text-slate-500 text-lg font-medium leading-relaxed font-sans">
            Thank you for being a hero. Our network has been alerted and help is on the way. 🐾
          </p>
          <div className="pt-4 flex justify-center">
            <Loader2 size={16} className="text-slate-400 animate-spin" />
          </div>
        </motion.div>
      </div>
    );
  }

  const selectedIssue = issueTypes.find(t => t.value === form.issue_type);
  const selectedSeverity = emergencyLevels.find(l => l.value === form.priority);

  return (
    <>
      <AnimatePresence>
        {aiError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setAiError(false)}
                className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 text-red-500 border border-red-100">
                <Bot size={32} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
                {aiError === 'unavailable' ? 'AI Verification Unavailable' : 'AI Detection Failed'}
              </h3>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                {aiError === 'unavailable'
                  ? 'We could not verify the image right now. Your report was not submitted. Please try again shortly.'
                  : 'Our AI could not detect an animal in the image you uploaded. Please try a clearer photo so responders know what to look for!'}
              </p>
              
              <button
                onClick={() => setAiError(false)}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors active:scale-95 shadow-lg shadow-slate-900/20"
              >
                Try Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-slate-50 pb-24 sm:pb-32 pt-[64px] sm:pt-[72px] font-sans">
      <div className="bg-white border-b border-slate-100/60 py-4 sm:py-10 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.01)] z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 text-primary border border-orange-100 mb-2 sm:mb-4">
              <Heart size={14} className="fill-primary text-primary" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Emergency Alert Desk</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
              Report an Emergency
            </h1>
            <p className="text-slate-500 font-medium mt-1 sm:mt-3 text-sm sm:text-base max-w-xl">
              Report an animal in distress. Your contribution alerts local shelters and rescue teams immediately.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-3 sm:mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* MAIN FORM */}
          <div className="lg:col-span-8 space-y-4 sm:space-y-8">
            
            {/* SITUATION & SEVERITY */}
            <div className="bg-white border border-slate-100/50 rounded-2xl sm:rounded-[2rem] shadow-sm sm:shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-4 sm:p-8 space-y-5 sm:space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="text-primary" size={24} /> What is the animal's condition?
                </h2>
                <p className="text-sm text-slate-500 mt-1">Select the issue type and emergency level.</p>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Situation Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {issueTypes.map((type) => {
                    const isSelected = form.issue_type === type.value;
                    return (
                      <motion.button
                        key={type.value}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setForm(f => ({ ...f, issue_type: type.value }));
                          setErrors(e => ({ ...e, issue_type: undefined }));
                        }}
                        className={`relative flex items-center p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 border text-left ${
                          isSelected 
                            ? 'border-primary bg-orange-50/30 shadow-sm ring-1 ring-primary/20' 
                            : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <span className="text-2xl sm:text-3xl mr-3 sm:mr-4 shrink-0 block">{type.label.split(' ')[0]}</span>
                        <div className="flex-1 pr-6">
                          <p className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-slate-900'}`}>
                            {type.label.split(' ').slice(1).join(' ')}
                          </p>
                          <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                            {type.desc}
                          </p>
                        </div>
                        
                        <div className={`absolute right-4 w-4 h-4 rounded-full border flex items-center justify-center bg-white transition-all ${
                          isSelected ? 'border-primary' : 'border-slate-200'
                        }`}>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 rounded-full bg-primary"
                            />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
                {errors.issue_type && (
                  <p className="text-xs font-semibold text-red-500 mt-1">{errors.issue_type}</p>
                )}
                
                <AnimatePresence>
                  {form.issue_type === 'other' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="relative group">
                        <input
                          type="text"
                          placeholder="Please specify the situation..."
                          value={form.other_issue_type}
                          onChange={(e) => {
                            setForm(f => ({ ...f, other_issue_type: e.target.value }));
                            setErrors(er => ({ ...er, other_issue_type: undefined }));
                          }}
                          disabled={submitting}
                          className={`w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:border-primary focus:bg-white ${
                            errors.other_issue_type ? '!border-red-200 !bg-red-50/50' : ''
                          }`}
                        />
                      </div>
                      {errors.other_issue_type && (
                        <p className="text-xs font-semibold text-red-500 mt-1">{errors.other_issue_type}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mt-4">
                  Severity Level <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {emergencyLevels.map((level) => {
                    const isSelected = form.priority === level.value;
                    return (
                      <motion.button
                        key={level.value}
                        type="button"
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setForm(f => ({ ...f, priority: level.value }));
                          setErrors(e => ({ ...e, priority: undefined }));
                        }}
                        className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
                          isSelected 
                            ? `border-transparent shadow-md scale-[1.02] ${level.active} ring-2 sm:ring-4 ring-orange-50`
                            : 'border-slate-100 bg-white hover:border-slate-300 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {!isSelected && <span className={`mb-2 h-1.5 w-6 rounded-full ${level.color} opacity-40`} />}
                        <span className={`text-sm font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {level.label}
                        </span>
                        <span className={`mt-0.5 text-[10px] font-bold uppercase tracking-wider text-center ${
                          isSelected ? 'text-white/85' : 'text-slate-400'
                        }`}>
                          {level.desc}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                {errors.priority && (
                  <p className="text-xs font-semibold text-red-500 mt-1">{errors.priority}</p>
                )}
              </div>
            </div>

            {/* LOCATION */}
            <div className="bg-white border border-slate-100/50 rounded-2xl sm:rounded-[2rem] shadow-sm sm:shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-4 sm:p-8 space-y-5 sm:space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="text-primary" size={24} /> Where is the animal?
                </h2>
                <p className="text-sm text-slate-500 mt-1">Pin the location on the map. Drag the marker to adjust coordinates.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100/50">
                <LocationPicker
                  onLocationSelect={(loc) => {
                    setForm(f => ({ ...f, location: loc }));
                    setErrors(e => ({ ...e, location: undefined }));
                  }}
                  disabled={submitting}
                />
              </div>
              {errors.location && (
                <p className="text-xs font-semibold text-red-500 mt-1">{errors.location}</p>
              )}
            </div>

            {/* PHOTO */}
            <div className="bg-white border border-slate-100/50 rounded-2xl sm:rounded-[2rem] shadow-sm sm:shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-4 sm:p-8 space-y-5 sm:space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="text-primary" size={24} /> Add a photo
                </h2>
                <p className="text-sm text-slate-500 mt-1">Upload a photo showing the animal's status. It will help responders prepare.</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100/50">
                <ImageUpload
                  value={form.image}
                  onImageSelect={(img) => {
                    setForm(f => ({ ...f, image: img }));
                    setErrors(e => ({ ...e, image: undefined }));
                  }}
                  disabled={submitting}
                />
              </div>
              {errors.image && (
                <p className="text-xs font-semibold text-red-500 mt-1">{errors.image}</p>
              )}
            </div>

            {/* CONTACT & DETAILS */}
            <div className="bg-white border border-slate-100/50 rounded-2xl sm:rounded-[2rem] shadow-sm sm:shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-4 sm:p-8 space-y-5 sm:space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Phone className="text-primary" size={24} /> Contact & Description
                </h2>
                <p className="text-sm text-slate-500 mt-1">Provide details so our rescue team can follow up if needed.</p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="tel"
                        placeholder="+91 99999 99999"
                        value={form.reporter_phone}
                        onChange={(e) => {
                          setForm(f => ({ ...f, reporter_phone: e.target.value }));
                          setErrors(er => ({ ...er, reporter_phone: undefined }));
                        }}
                        disabled={submitting}
                        className={`w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent text-sm font-bold text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:border-primary focus:bg-white ${
                          errors.reporter_phone ? '!border-red-200 !bg-red-50/50' : ''
                        }`}
                      />
                    </div>
                    {errors.reporter_phone && (
                      <p className="text-xs font-semibold text-red-500 mt-1">{errors.reporter_phone}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Your Name <span className="text-slate-400 font-medium">(optional)</span>
                    </label>
                    <div className="relative group">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        placeholder="Anonymous Hero"
                        value={form.reporter_name}
                        onChange={(e) => setForm(f => ({ ...f, reporter_name: e.target.value }))}
                        disabled={submitting}
                        className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent text-sm font-bold text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:border-primary focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Situation Details <span className="text-slate-400 font-medium">(optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                        isListening 
                          ? 'bg-red-50 text-red-600 animate-pulse border border-red-100' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                      }`}
                    >
                      {isListening ? (
                        <><MicOff size={12} /> Stop</>
                      ) : (
                        <><Mic size={12} /> Voice Input</>
                      )}
                    </button>
                  </div>
                  <div className="relative group">
                    <FileText size={16} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <textarea
                      placeholder="Any extra context (e.g. landmark, behavior, species details)..."
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                      disabled={submitting}
                      className={`w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all focus:outline-none focus:border-primary focus:bg-white resize-none ${
                        isListening ? '!border-red-200 !bg-red-50/50' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2 sm:pt-4 pb-8 flex justify-end">
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-primary text-white rounded-xl sm:rounded-2xl font-black text-base sm:text-lg shadow-md shadow-orange-100 hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-75"
              >
                {submitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Submit Emergency Report
                  </>
                )}
              </motion.button>
            </div>
            
          </div>

          {/* RIGHT PANEL: Live Summary Preview (Hidden on Mobile) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-[96px] bg-white border border-slate-100 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                Live Report Preview
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active</span>
              </div>
            </div>

            <div className="space-y-5">
              <div className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-100/50 aspect-video flex flex-col items-center justify-center text-slate-400">
                {form.image ? (
                  <img 
                    src={typeof form.image === 'string' ? form.image : URL.createObjectURL(form.image)} 
                    alt="Animal preview" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Camera size={24} className="mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <span className="text-[11px] font-bold text-slate-400 block">Waiting for photo upload</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Animal Situation
                  </span>
                  {form.issue_type ? (
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-50 text-primary border border-orange-100/50 font-bold text-xs">
                      {selectedIssue?.label}
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-300 italic">Unselected</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Emergency Level
                  </span>
                  {form.priority ? (
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                      form.priority === 'critical' 
                        ? 'bg-red-50 text-red-700 border-red-100' 
                        : form.priority === 'high'
                          ? 'bg-orange-50 text-orange-700 border-orange-100'
                          : form.priority === 'medium'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-100'
                            : 'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                      {selectedSeverity?.label} Level
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-300 italic">Unselected</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Location Status
                  </span>
                  {form.location ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/5 text-success border border-success/10 text-xs font-semibold">
                      <MapPin size={12} className="stroke-[2.5]" />
                      Pinned ({form.location.latitude.toFixed(4)}, {form.location.longitude.toFixed(4)})
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-300 italic">Not pinned on map</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Contact Details
                  </span>
                  {form.reporter_phone ? (
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Phone size={12} className="text-slate-400" />
                      {form.reporter_phone} {form.reporter_name && `(${form.reporter_name})`}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-300 italic">No details entered</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Additional Context
                  </span>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed max-h-24 overflow-y-auto pr-1">
                    {form.description ? form.description : "No description provided."}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex items-start gap-3 mt-4">
                <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 font-medium leading-normal">
                  Your report is directly transmitted to active local animal rescue units. Please verify coordinates for accuracy.
                </p>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
