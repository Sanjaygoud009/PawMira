import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, Send, Loader2, ArrowLeft } from 'lucide-react';
import api from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setIsSent(true);
      toast.success('Password reset link sent! Check your inbox.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset link. Please try again.');
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
            <Mail className="text-primary" size={32} />
          </div>
          <h1 className="text-2xl font-black text-dark">Reset Password</h1>
          <p className="text-text-light text-sm mt-2 px-4">
            {isSent 
              ? "We've sent a password reset link to your email."
              : "Enter the email associated with your account and we'll send you a link to reset your password."}
          </p>
        </div>

        {!isSent ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-neutral/50 p-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-dark mb-2">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-neutral text-sm bg-white focus:outline-none focus:border-primary transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>

            <div className="text-center mt-6">
              <Link to="/login" className="text-sm font-semibold text-text-light hover:text-dark inline-flex items-center gap-1 transition-colors">
                <ArrowLeft size={16} /> Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-neutral/50 p-8 text-center">
            <p className="text-sm text-dark font-medium mb-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <button
              onClick={() => setIsSent(false)}
              className="w-full py-3.5 bg-neutral text-dark font-bold rounded-2xl hover:bg-neutral-dark transition-colors mb-4"
            >
              Try another email
            </button>
            <Link to="/login" className="text-sm font-semibold text-primary hover:underline">
              Return to Login
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
