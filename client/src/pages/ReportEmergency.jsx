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
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ImageUpload from '../components/report/ImageUpload';
import LocationPicker from '../components/report/LocationPicker';
import api from '../utils/api';

const issueTypes = [
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

  // Stepper state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0); // 1 = forward, -1 = backward

  const [form, setForm] = useState({
    reporter_name: '',
    reporter_phone: '',
    issue_type: '',
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

  // Validation function per step
  const validateStep = (stepNumber) => {
    const errs = {};
    if (stepNumber === 1) {
      if (!form.issue_type) errs.issue_type = 'Please select the situation type.';
      if (!form.priority) errs.priority = 'Please select an emergency level.';
    } else if (stepNumber === 2) {
      if (!form.location) errs.location = 'Please pin the animal\'s location on the map.';
    } else if (stepNumber === 3) {
      if (!form.image) errs.image = 'An image of the animal is required to help rescue teams.';
    } else if (stepNumber === 4) {
      if (!form.reporter_phone.trim()) {
        errs.reporter_phone = 'Phone number is required so we can contact you.';
      } else if (!/^[+]?\d{10,15}$/.test(form.reporter_phone.replace(/\s/g, ''))) {
        errs.reporter_phone = 'Please enter a valid phone number (10-15 digits).';
      }
    }
    return errs;
  };

  const handleNext = () => {
    const errs = validateStep(step);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Toast the first error
      const message = Object.values(errs)[0];
      toast.error(message);
      return;
    }
    setErrors({});
    setDirection(1);
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setErrors({});
    setDirection(-1);
    setStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const errs = validateStep(4);
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
      formData.append('description', form.description);
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
      toast.error(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Framer Motion Slider variants
  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 120 : -120,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring', stiffness: 350, damping: 32 },
        opacity: { duration: 0.2 },
      },
    },
    exit: (dir) => ({
      x: dir < 0 ? 120 : -120,
      opacity: 0,
      transition: {
        x: { type: 'spring', stiffness: 350, damping: 32 },
        opacity: { duration: 0.2 },
      },
    }),
  };

  // Step information
  const stepsConfig = [
    { label: 'Situation', icon: AlertTriangle },
    { label: 'Location', icon: MapPin },
    { label: 'Photo', icon: Camera },
    { label: 'Contact', icon: Phone },
  ];

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

  // Get selected details labels
  const selectedIssue = issueTypes.find(t => t.value === form.issue_type);
  const selectedSeverity = emergencyLevels.find(l => l.value === form.priority);

  return (
    <div className="min-h-screen bg-white pb-32 pt-[72px] font-sans">
      {/* Sleek Minimal Header */}
      <div className="bg-white border-b border-slate-100 py-10 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 text-primary border border-orange-100 mb-4">
              <Heart size={14} className="fill-primary text-primary" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider">Emergency Alert Desk</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
              Report an Emergency
            </h1>
            <p className="text-slate-500 font-medium mt-3 text-base max-w-xl">
              Report an animal in distress. Your contribution alerts local shelters and rescue teams immediately.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Wizard Steps Card */}
          <div className="lg:col-span-8 bg-white border border-slate-100 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] p-6 sm:p-8">
            
            {/* Stepper Progress Indicator */}
            <div className="mb-10">
              {/* Desktop Steps Indicator */}
              <div className="hidden sm:flex items-center justify-between relative px-2">
                {stepsConfig.map((s, idx) => {
                  const stepNum = idx + 1;
                  const isCompleted = step > stepNum;
                  const isActive = step === stepNum;
                  const StepIcon = s.icon;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center relative z-10 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          // Allow clicking back to already visited steps
                          if (stepNum < step) {
                            setDirection(-1);
                            setStep(stepNum);
                          }
                        }}
                        disabled={stepNum >= step}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative border ${
                          isCompleted
                            ? 'bg-primary border-primary text-white shadow-sm'
                            : isActive
                              ? 'bg-white border-primary text-primary shadow-md shadow-orange-100 ring-4 ring-orange-50'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle size={20} className="stroke-[3]" />
                        ) : (
                          <StepIcon size={18} />
                        )}
                      </button>
                      
                      <span className={`text-xs font-bold mt-2.5 transition-colors duration-300 ${
                        isActive ? 'text-slate-900 font-extrabold' : 'text-slate-400'
                      }`}>
                        {s.label}
                      </span>

                      {/* Connective Line (Desktop) */}
                      {idx < stepsConfig.length - 1 && (
                        <div className="absolute left-[calc(50%+24px)] right-[calc(-50%+24px)] top-6 h-[2px] bg-slate-100 -z-10">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: step > stepNum ? '100%' : '0%' }}
                            transition={{ duration: 0.3 }}
                            className="h-full bg-primary"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mobile Steps Indicator */}
              <div className="sm:hidden space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                  <span className="text-primary font-black uppercase tracking-wider">
                    Step {step} of 4
                  </span>
                  <span className="text-slate-700">
                    {stepsConfig[step - 1].label}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    animate={{ width: `${(step / 4) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>

            {/* Step Content Area with Animating Slide */}
            <div className="overflow-hidden relative min-h-[350px] flex flex-col justify-between">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="w-full flex-1 flex flex-col"
                >
                  
                  {/* STEP 1: SITUATION & SEVERITY */}
                  {step === 1 && (
                    <div className="space-y-8 flex-1">
                      {/* Subtitle */}
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">What is the animal's condition?</h2>
                        <p className="text-sm text-slate-500 mt-1">Select the issue type and emergency level.</p>
                      </div>

                      {/* Issue Types Grid */}
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
                                className={`relative flex items-center p-4 rounded-2xl transition-all duration-300 border text-left ${
                                  isSelected 
                                    ? 'border-primary bg-orange-50/30 shadow-sm' 
                                    : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                                }`}
                              >
                                <span className="text-3xl mr-4 shrink-0 block">{type.label.split(' ')[0]}</span>
                                <div className="flex-1 pr-6">
                                  <p className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-slate-900'}`}>
                                    {type.label.split(' ').slice(1).join(' ')}
                                  </p>
                                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                                    {type.desc}
                                  </p>
                                </div>
                                
                                {/* Checked circle dot indicator */}
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
                          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold text-red-500 mt-1">
                            {errors.issue_type}
                          </motion.p>
                        )}
                      </div>

                      {/* Severity Pill Selector */}
                      <div className="space-y-3 pt-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
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
                                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${
                                  isSelected 
                                    ? `border-transparent shadow-md scale-[1.02] ${level.active} ring-4 ring-orange-50`
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
                          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold text-red-500 mt-1">
                            {errors.priority}
                          </motion.p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: LOCATION */}
                  {step === 2 && (
                    <div className="space-y-6 flex-1">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Where is the animal?</h2>
                        <p className="text-sm text-slate-500 mt-1">
                          Pin the location on the map. Drag the marker to adjust coordinates.
                        </p>
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
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold text-red-500 mt-1">
                          {errors.location}
                        </motion.p>
                      )}
                    </div>
                  )}

                  {/* STEP 3: PHOTO */}
                  {step === 3 && (
                    <div className="space-y-6 flex-1">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Add a photo</h2>
                        <p className="text-sm text-slate-500 mt-1">
                          Upload a photo showing the animal's status. It will help responders prepare.
                        </p>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100/50">
                        <ImageUpload
                          onImageSelect={(img) => {
                            setForm(f => ({ ...f, image: img }));
                            setErrors(e => ({ ...e, image: undefined }));
                          }}
                          disabled={submitting}
                        />
                      </div>
                      {errors.image && (
                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-semibold text-red-500 mt-1">
                          {errors.image}
                        </motion.p>
                      )}
                    </div>
                  )}

                  {/* STEP 4: CONTACT & DETAILS */}
                  {step === 4 && (
                    <div className="space-y-6 flex-1">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Contact & Description</h2>
                        <p className="text-sm text-slate-500 mt-1">
                          Provide details so our rescue team can follow up if needed.
                        </p>
                      </div>

                      <div className="space-y-5">
                        {/* Grid for Contact Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Reporter Phone */}
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

                          {/* Reporter Name */}
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

                        {/* Situation Details */}
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
                  )}

                </motion.div>
              </AnimatePresence>

              {/* Step Navigation Controls Footer */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-5 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-sm bg-white hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>
                  )}
                </div>

                <div>
                  {step < 4 ? (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-sm hover:bg-primary-hover hover:shadow-md active:scale-95 transition-all"
                    >
                      Continue
                      <ArrowRight size={16} />
                    </motion.button>
                  ) : (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-md shadow-orange-100 hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-75"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Submit Report
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </div>
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

            {/* Live Report card layout */}
            <div className="space-y-5">
              
              {/* Media Preview inside Card */}
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

              {/* Status & Attributes */}
              <div className="space-y-3">
                
                {/* Situation */}
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

                {/* Severity */}
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

                {/* Location coordinates */}
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

                {/* Contact phone */}
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

                {/* Extra comments */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Additional Context
                  </span>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed max-h-24 overflow-y-auto pr-1">
                    {form.description ? form.description : "No description provided."}
                  </p>
                </div>

              </div>

              {/* Encouraging Footer Note */}
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
  );
}
