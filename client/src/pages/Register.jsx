import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, Lock, User, UserPlus, Loader2, KeyRound, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const { register, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'volunteer' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      toast.success('OTP sent to your email! Please check your inbox.');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast.error('Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(form.email, otp);
      toast.success('Account verified! Welcome to PawMira 🐾');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl flex rounded-3xl overflow-hidden shadow-xl border border-neutral/50"
      >
        {/* Left brand panel — desktop only */}
        <div className="hidden md:flex md:w-2/5 gradient-dark flex-col justify-center items-center p-10 text-center">
          <img src="/logo.webp" alt="" className="h-16 w-16 rounded-xl mb-6 shadow-lg" />
          <h2 className="text-2xl font-black text-white mb-3">
            {step === 1 ? 'Join the Mission' : 'Almost There!'}
          </h2>
          <p className="text-sm text-neutral-dark leading-relaxed">
            {step === 1 ? 'Create an account and become part of a community that saves animal lives every day.' : 'Verify your email to unlock your rescue dashboard.'}
          </p>
        </div>

        {/* Right form panel */}
        <div className="w-full md:w-3/5 bg-white p-6 sm:p-10">
          <div className="text-center mb-6 md:text-left">
            <img src="/logo.webp" alt="PawMira" className="h-12 w-12 mx-auto md:mx-0 rounded-xl mb-3" />
            <h1 className="text-2xl font-black text-dark">
              {step === 1 ? 'Create Account' : 'Verify Email'}
            </h1>
            <p className="text-text-light text-sm mt-1">
              {step === 1 ? 'Start helping animals today' : `We sent a 6-digit code to ${form.email}`}
            </p>
          </div>

        {step === 1 ? (
          <form onSubmit={handleRegisterSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">Full Name</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="John Doe"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-neutral text-sm bg-white focus:outline-none focus:border-primary transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark mb-2">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-neutral text-sm bg-white focus:outline-none focus:border-primary transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 characters"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-neutral text-sm bg-white focus:outline-none focus:border-primary transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark mb-2">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'volunteer', label: '🙋 Volunteer' },
                  { value: 'ngo', label: '🏥 NGO' },
                ].map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: role.value }))}
                    className={`px-4 py-3 rounded-2xl border-2 text-sm font-semibold transition-all ${
                      form.role === role.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-neutral text-text-light hover:border-primary/30'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <UserPlus size={18} />
              )}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>

            <p className="text-center text-sm text-text-light">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline min-h-0 inline">
                Sign In
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">One-Time Password (OTP)</label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-neutral text-sm bg-white focus:outline-none focus:border-primary transition-colors text-center text-lg tracking-widest font-bold"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-text-light mt-2 text-center">Please check your spam folder if you don't see it.</p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <CheckCircle size={18} />
              )}
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={loading}
              className="w-full py-2 text-sm font-semibold text-text-light hover:text-dark transition-colors disabled:opacity-50"
            >
              Back to Registration
            </button>
          </form>
        )}
        </div>
      </motion.div>
    </div>
  );
}
