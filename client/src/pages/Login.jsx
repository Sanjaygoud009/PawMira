import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back! 🐾');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[840px] flex rounded-3xl overflow-hidden shadow-2xl border border-neutral/50"
      >
        {/* Left brand panel — desktop only */}
        <div className="hidden md:flex md:w-2/5 gradient-dark flex-col justify-center items-center p-10 text-center">
          <img src="/logo.webp" alt="" className="h-16 w-16 rounded-xl mb-6 shadow-lg" />
          <h2 className="text-2xl font-black text-white mb-3">Welcome Back</h2>
          <p className="text-sm text-neutral-dark leading-relaxed">Every second counts. Sign in to manage rescues, track your impact, and save more lives.</p>
        </div>

        {/* Right form panel */}
        <div className="w-full md:w-3/5 bg-white p-6 sm:p-10">
          <div className="text-center mb-6 md:text-left">
            <img src="/logo.webp" alt="PawMira" className="h-12 w-12 mx-auto md:mx-0 rounded-xl mb-3" />
            <h1 className="text-2xl font-black text-dark">Sign In</h1>
            <p className="text-text-light text-sm mt-1">Access your rescue dashboard</p>
          </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-dark mb-2">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-neutral text-sm bg-white focus:outline-none focus:border-primary transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-dark">Password</label>
              <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-neutral text-sm bg-white focus:outline-none focus:border-primary transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <LogIn size={18} />
            )}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-text-light">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline min-h-0 inline">
              Register
            </Link>
          </p>
        </form>
        </div>
      </motion.div>
    </div>
  );
}
