import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/feed', label: 'Live Feed' },
    { to: '/services', label: 'Services' },
    { to: '/lost-found', label: 'Lost & Found' },
    { to: '/heroes', label: 'Heroes' },
    { to: '/contact', label: 'Contact' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-dark/95 backdrop-blur-md shadow-lg shadow-dark/20'
          : 'bg-dark/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group min-h-0">
            <img
              src="/logo.png"
              alt="PawMira"
              className="h-10 w-10 rounded-lg transition-transform group-hover:scale-110"
            />
            <span className="text-xl font-bold text-white tracking-tight">
              Paw<span className="text-primary">Mira</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-h-0 ${
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
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="px-4 py-2 text-sm font-medium text-white bg-error/90 rounded-lg hover:bg-error transition-colors min-h-0"
                  >
                    Admin Panel
                  </Link>
                )}
                
                {/* Notification Bell */}
                <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-neutral hover:text-white transition-colors relative"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error rounded-full border border-dark"></span>
                    )}
                  </button>
                  
                  {/* Dropdown */}
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-80 bg-dark-card border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
                      >
                        <div className="flex items-center justify-between p-3 border-b border-white/10 bg-dark">
                          <span className="font-semibold text-white">Notifications</span>
                          {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-primary hover:text-primary-light flex items-center gap-1 transition-colors">
                              <CheckCircle size={12} /> Mark all read
                            </button>
                          )}
                        </div>
                        <div className="max-h-64 overflow-y-auto bg-dark/95">
                          {notifications.length === 0 ? (
                            <div className="p-4 text-center text-sm text-neutral">No notifications</div>
                          ) : (
                            notifications.map(n => (
                              <div key={n._id} className={`p-3 border-b border-white/5 text-sm ${!n.is_read ? 'bg-primary/5' : ''}`}>
                                <div className="font-semibold text-white">{n.title}</div>
                                <div className="text-neutral-light mt-0.5 text-xs">{n.message}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Link
                  to="/dashboard"
                  className="px-4 py-2 text-sm font-medium text-white bg-secondary-light rounded-lg hover:bg-secondary-light/80 transition-colors min-h-0"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm font-medium text-neutral-dark hover:text-white transition-colors min-h-0"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-neutral hover:text-white transition-colors min-h-0"
              >
                Login
              </Link>
            )}
            <Link
              to="/report"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-all duration-200 shadow-lg shadow-primary/25 min-h-0"
            >
              <AlertTriangle size={16} />
              Report Emergency
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-xl text-white hover:text-primary hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-dark/98 backdrop-blur-xl border-t border-white/5"
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

              <div className="pt-3 border-t border-white/10 space-y-2">
                {user ? (
                  <>
                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="block px-4 py-3 text-sm font-medium text-white bg-error/90 rounded-xl text-center"
                      >
                        Admin Panel
                      </Link>
                    )}
                    <Link
                      to="/dashboard"
                      className="block px-4 py-3 text-sm font-medium text-white bg-secondary-light rounded-xl text-center"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={logout}
                      className="block w-full px-4 py-3 text-sm font-medium text-neutral-dark hover:text-white text-center rounded-xl"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="block px-4 py-3 text-sm font-medium text-neutral hover:text-white text-center rounded-xl"
                  >
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
