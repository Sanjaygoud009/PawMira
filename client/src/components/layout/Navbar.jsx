import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, AlertTriangle, Bell, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
    { to: '/feed', label: 'Live Feed', highlight: true },
    { to: '/gallery', label: 'Rescued' },
    { to: '/services', label: 'Services' },
    { to: '/lost-found', label: 'Lost & Found' },
    { to: '/heroes', label: 'Heroes' },
    { to: '/contact', label: 'Contact' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleNotificationClick = (n) => {
    let targetId = n.reference_id;
    let targetModel = n.reference_model;

    // Fallback: If old notification is missing reference_id, try to extract it from the message
    if (!targetId && (n.title.includes('ESCALATION') || n.message.includes('Report'))) {
      const match = n.message.match(/Report ([a-fA-F0-9]{24})/);
      if (match) {
        targetId = match[1];
        targetModel = 'Report';
      }
    }

    if (!targetId) {
      toast.error('Could not find report ID in notification.');
      setShowNotifications(false);
      return;
    }

    // Only redirect if it's related to a report (escalation, emergency, etc.)
    if (targetModel === 'Report' && targetId) {
      if (n.title.toLowerCase().includes('safe')) {
        navigate(`/gallery?highlight=${targetId}&t=${Date.now()}`);
      } else {
        navigate(`/feed?highlight=${targetId}&t=${Date.now()}`);
      }
    }
    
    setShowNotifications(false);
  };

  const NotificationDropdown = () => (
    <AnimatePresence>
      {showNotifications && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className="absolute right-[-1rem] sm:right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white border border-neutral/50 rounded-2xl shadow-2xl overflow-hidden z-50 origin-top-right"
        >
          <div className="flex items-center justify-between p-4 border-b border-neutral/50 bg-neutral/10">
            <span className="font-bold text-dark text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="inline-btn text-xs text-primary hover:text-primary-hover flex items-center gap-1 font-semibold transition-colors">
                <CheckCircle size={14} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto no-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-text-light flex flex-col items-center gap-2">
                <Bell size={24} className="text-neutral-dark opacity-50" />
                <span>No notifications yet</span>
              </div>
            ) : (
              notifications.map(n => (
                <button 
                  key={n._id} 
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left p-4 border-b border-neutral/50 transition-colors flex items-start gap-3 hover:bg-neutral/30 ${!n.is_read ? 'bg-primary/5' : ''}`}
                >
                  <div className={`shrink-0 w-2 h-2 mt-1.5 rounded-full ${!n.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                  <div>
                    <div className="font-bold text-dark text-sm flex items-center gap-1.5">
                      {n.title.includes('ESCALATION') ? '🔥' : n.title.includes('Safe') ? '💚' : ''} {n.title.replace('🔥', '').trim()}
                    </div>
                    <div className="text-text-light mt-1 text-xs leading-relaxed">{n.message}</div>
                  </div>
                </button>
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
          <Link to="/" className="flex items-center gap-3 group" aria-label="PawMira Home">
            <img
              src="/new_logo.png"
              alt=""
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl transition-transform group-hover:scale-105 shadow-md"
            />
            <span className="text-2xl font-black text-white tracking-tight">
              Paw<span className="text-primary">Mira</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1.5 xl:gap-2.5">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  link.highlight
                    ? isActive(link.to)
                      ? 'text-white bg-primary shadow-lg shadow-primary/20'
                      : 'text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:text-primary-hover'
                    : isActive(link.to)
                      ? 'text-primary bg-primary/10'
                      : 'text-neutral hover:text-white hover:bg-white/5'
                }`}
              >
                {link.highlight && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                  </span>
                )}
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
            className="lg:hidden bg-dark/98 backdrop-blur-xl border-t border-white/5 overflow-y-auto max-h-[calc(100vh-4rem)] overscroll-contain"
          >
            <div className="px-4 py-4 pb-8 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors relative ${
                    link.highlight
                      ? isActive(link.to)
                        ? 'text-white bg-primary shadow-lg shadow-primary/20'
                        : 'text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20'
                      : isActive(link.to)
                        ? 'text-primary bg-primary/10'
                        : 'text-neutral hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{link.label}</span>
                    {link.highlight && (
                      <span className="relative flex h-2.5 w-2.5 mr-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                      </span>
                    )}
                  </div>
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
