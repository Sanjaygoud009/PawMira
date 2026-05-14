import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Phone,
  User,
  FileText,
  Send,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import ImageUpload from '../components/report/ImageUpload';
import LocationPicker from '../components/report/LocationPicker';
import api from '../utils/api';

const issueTypes = [
  { value: 'injured', label: '🩹 Injured', desc: 'Visible wounds or limping' },
  { value: 'starving', label: '🍽️ Starving', desc: 'Malnourished or dehydrated' },
  { value: 'abandoned', label: '😢 Abandoned', desc: 'Left alone in distress' },
  { value: 'stuck', label: '🚧 Stuck / Trapped', desc: 'Unable to move freely' },
  { value: 'other', label: '📋 Other', desc: 'Something else' },
];

export default function ReportEmergency() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    reporter_name: '',
    reporter_phone: '',
    issue_type: '',
    description: '',
    image: null,
    location: null,
  });

  const [errors, setErrors] = useState({});

  const validate = useCallback(() => {
    const errs = {};
    if (!form.reporter_phone.trim()) errs.reporter_phone = 'Phone number is required';
    else if (!/^[+]?\d{10,15}$/.test(form.reporter_phone.replace(/\s/g, '')))
      errs.reporter_phone = 'Enter a valid phone number';
    if (!form.issue_type) errs.issue_type = 'Select an issue type';
    if (!form.location) errs.location = 'Location is required';
    return errs;
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please fix the errors above');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('reporter_name', form.reporter_name);
      formData.append('reporter_phone', form.reporter_phone);
      formData.append('issue_type', form.issue_type);
      formData.append('description', form.description);
      formData.append('latitude', form.location.latitude);
      formData.append('longitude', form.location.longitude);
      if (form.image) formData.append('image', form.image);

      await api.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSubmitted(true);
      toast.success('Report submitted! Help is on the way 🐾');

      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle size={40} className="text-success" />
          </div>
          <h2 className="text-3xl font-black text-dark">Report Submitted!</h2>
          <p className="text-text-light">
            Thank you for reporting. Our volunteers and partner NGOs have been alerted.
            Help is on the way! 🐾
          </p>
          <p className="text-sm text-text-light">Redirecting to home...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-warning/10 to-primary/10 border-b border-warning/20">
        <div className="max-w-xl mx-auto px-4 py-6 sm:py-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="p-2.5 rounded-xl bg-warning/10">
              <AlertTriangle size={24} className="text-warning" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-dark">Report Emergency</h1>
              <p className="text-sm text-text-light mt-0.5">Submit in under 30 seconds • No login needed</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-xl mx-auto px-4 py-6 pb-32 sm:pb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Issue Type */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="block text-sm font-semibold text-dark mb-3">
              What's the situation? <span className="text-warning">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {issueTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setForm((f) => ({ ...f, issue_type: type.value }));
                    setErrors((e) => ({ ...e, issue_type: undefined }));
                  }}
                  className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                    form.issue_type === type.value
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-neutral hover:border-primary/30'
                  }`}
                >
                  <span className="text-xl">{type.label.split(' ')[0]}</span>
                  <div>
                    <p className="text-sm font-semibold text-dark">
                      {type.label.split(' ').slice(1).join(' ')}
                    </p>
                    <p className="text-xs text-text-light mt-0.5">{type.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            {errors.issue_type && (
              <p className="text-xs text-warning mt-2">{errors.issue_type}</p>
            )}
          </motion.div>

          {/* Photo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-sm font-semibold text-dark mb-3">
              Photo of the dog <span className="text-text-light font-normal">(recommended)</span>
            </label>
            <ImageUpload
              onImageSelect={(img) => setForm((f) => ({ ...f, image: img }))}
              disabled={submitting}
            />
          </motion.div>

          {/* Location */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-sm font-semibold text-dark mb-3">
              Location <span className="text-warning">*</span>
            </label>
            <LocationPicker
              onLocationSelect={(loc) => {
                setForm((f) => ({ ...f, location: loc }));
                setErrors((e) => ({ ...e, location: undefined }));
              }}
              disabled={submitting}
            />
            {errors.location && (
              <p className="text-xs text-warning mt-2">{errors.location}</p>
            )}
          </motion.div>

          {/* Phone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-sm font-semibold text-dark mb-2">
              Your Phone <span className="text-warning">*</span>
            </label>
            <div className="relative">
              <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
              <input
                type="tel"
                placeholder="+91 99999 99999"
                value={form.reporter_phone}
                onChange={(e) => {
                  setForm((f) => ({ ...f, reporter_phone: e.target.value }));
                  setErrors((er) => ({ ...er, reporter_phone: undefined }));
                }}
                disabled={submitting}
                className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 text-sm font-medium bg-white transition-colors focus:outline-none focus:border-primary ${
                  errors.reporter_phone ? 'border-warning' : 'border-neutral'
                }`}
              />
            </div>
            {errors.reporter_phone && (
              <p className="text-xs text-warning mt-1.5">{errors.reporter_phone}</p>
            )}
          </motion.div>

          {/* Name (optional) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <label className="block text-sm font-semibold text-dark mb-2">
              Your Name <span className="text-text-light font-normal">(optional)</span>
            </label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
              <input
                type="text"
                placeholder="Your name"
                value={form.reporter_name}
                onChange={(e) => setForm((f) => ({ ...f, reporter_name: e.target.value }))}
                disabled={submitting}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-neutral text-sm font-medium bg-white transition-colors focus:outline-none focus:border-primary"
              />
            </div>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <label className="block text-sm font-semibold text-dark mb-2">
              Description <span className="text-text-light font-normal">(optional)</span>
            </label>
            <div className="relative">
              <FileText size={18} className="absolute left-4 top-4 text-text-light" />
              <textarea
                placeholder="Describe the dog's condition briefly..."
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={submitting}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-neutral text-sm font-medium bg-white transition-colors focus:outline-none focus:border-primary resize-none"
              />
            </div>
          </motion.div>

          {/* Desktop Submit */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="hidden sm:block"
          >
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl text-lg hover:bg-primary-dark transition-all duration-200 shadow-xl shadow-primary/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Submit Report
                </>
              )}
            </button>
          </motion.div>
        </form>
      </div>

      {/* Mobile Sticky Submit */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-neutral shadow-lg z-40">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl text-lg shadow-xl shadow-primary/30 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send size={20} />
              Submit Report
            </>
          )}
        </button>
      </div>
    </div>
  );
}
