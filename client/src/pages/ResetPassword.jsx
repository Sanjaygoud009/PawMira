import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Lock, CheckCircle, Loader2 } from 'lucide-react';
import api from '../utils/api';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.put(`/auth/reset-password/${token}`, { password });
      toast.success(data.message || 'Password reset successfully');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. The link might be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="text-primary" size={32} />
          </div>
          <h1 className="text-2xl font-black text-dark">Create New Password</h1>
          <p className="text-text-light text-sm mt-2">
            Your new password must be different from previous used passwords.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-neutral/50 p-8 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-dark mb-2">New Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-neutral text-sm bg-white focus:outline-none focus:border-primary transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-dark mb-2">Confirm New Password</label>
            <div className="relative">
              <CheckCircle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-neutral text-sm bg-white focus:outline-none focus:border-primary transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-60 mt-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
