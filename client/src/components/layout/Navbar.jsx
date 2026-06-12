import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, AlertTriangle, Bell, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const notifRef = useRef(null);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.data);
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
    setShowNotifications(false);
  }, [location]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/feed', label: 'Live Feed' },
    { to: '/gallery', label: 'Rescued' },
    { to: '/services', label: 'Services' },
    { to: '/lost-found', label: 'Lost & Found' },
    { to: '/heroes', label: 'Heroes' },
    { to: '/contact', label: 'Contact' },
  ];

  const isActive = (path) => location.pathname === path;

  const NotificationDropdown = () => (
    <AnimatePresence>
      {showNotifications && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute right-0 mt-2 w-80 bg-white border border-neutral rounded-2xl shadow-xl overflow-hidden z-50"
        >
          <div className="flex items-center justify-between p-3 border-b border-neutral bg-neutral-light">
            <span className="font-bold text-text-dark text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="inline-btn text-xs text-primary hover:text-primary-hover flex items-center gap-1 transition-colors font-semibold">
                <CheckCircle size={12} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-text-light">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div key={n._id} className={`p-3 border-b border-neutral/50 text-sm hover:bg-neutral-light transition-colors ${!n.is_read ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                  <div className="font-semibold text-text-dark">{n.title}</div>
                  <div className="text-text-light mt-0.5 text-xs leading-relaxed">{n.message}</div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-dark/95 backdrop-blur-md shadow-lg shadow-dark/10'
          : 'bg-dark/80 backdrop-blur-sm'
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" aria-label="PawMira Home">
            <img
              src="/logo.png"
              alt=""
              className="h-9 w-9 rounded-lg transition-transform group-hover:scale-105"
            />
            <span className="text-xl font-bold text-white tracking-tight">
              Paw<span className="text-primary">Mira</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(link.to)
                    ? 'text-primary bg-primary/10'
                    : 'text-neutral hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-2.5">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-error/90 rounded-lg hover:bg-error transition-colors"
                  >
                    Admin
                  </Link>
                )}
                
                {/* Notification Bell */}
                <div className="relative" ref={notifRef}>
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="inline-btn p-2 text-neutral hover:text-white transition-colors relative rounded-lg hover:bg-white/5"
                    aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                  >
                    <Bell size={19} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full border border-dark animate-pulse" />
                    )}
                  </button>
                  <NotificationDropdown />
                </div>

                <Link
                  to="/dashboard"
                  className="px-3.5 py-1.5 text-sm font-medium text-white bg-secondary-light rounded-lg hover:bg-white/15 transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="inline-btn px-3 py-1.5 text-sm font-medium text-neutral-dark hover:text-white transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-sm font-medium text-neutral hover:text-white transition-colors"
              >
                Login
              </Link>
            )}
            <Link
              to="/report"
              className="btn btn-primary !py-2 !px-4 !text-sm !rounded-xl"
            >
              <AlertTriangle size={15} />
              Report Emergency
            </Link>
          </div>

          {/* Mobile: Notification + Hamburger */}
          <div className="lg:hidden flex items-center gap-1">
            {user && (
              <div className="relative" ref={!isOpen ? notifRef : undefined}>
                <button
                  onClick={() => { setShowNotifications(!showNotifications); setIsOpen(false); }}
                  className="inline-btn p-2 rounded-lg text-white hover:text-primary hover:bg-white/5 transition-colors relative"
                  aria-label="Notifications"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full border border-dark animate-pulse" />
                  )}
                </button>
                <NotificationDropdown />
              </div>
            )}
            <button
              onClick={() => { setIsOpen(!isOpen); setShowNotifications(false); }}
              className="inline-btn p-2 rounded-lg text-white hover:text-primary hover:bg-white/5 transition-colors"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="lg:hidden bg-dark/98 backdrop-blur-xl border-t border-white/5 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? 'text-primary bg-primary/10'
                      : 'text-neutral hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <div className="pt-3 mt-2 border-t border-white/10 space-y-2">
                {user ? (
                  <>
                    {user.role === 'admin' && (
                      <Link to="/admin" className="block px-4 py-3 text-sm font-medium text-white bg-error/90 rounded-xl text-center">
                        Admin Panel
                      </Link>
                    )}
                    <Link to="/dashboard" className="block px-4 py-3 text-sm font-medium text-white bg-secondary-light rounded-xl text-center">
                      Dashboard
                    </Link>
                    <button
                      onClick={logout}
                      className="inline-btn block w-full px-4 py-3 text-sm font-medium text-neutral-dark hover:text-white text-center rounded-xl transition-colors"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="block px-4 py-3 text-sm font-medium text-neutral hover:text-white text-center rounded-xl">
                    Login
                  </Link>
                )}
                <Link
                  to="/report"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white text-sm font-semibold rounded-xl shadow-lg shadow-primary/25"
                >
                  <AlertTriangle size={16} />
                  Report Emergency
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
