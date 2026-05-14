import { Link } from 'react-router-dom';
import { Heart, Phone, Mail, MapPin, Globe, MessageCircle, Share2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-dark text-neutral">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 min-h-0">
              <img src="/logo.png" alt="PawMira" className="h-10 w-10 rounded-lg" />
              <span className="text-xl font-bold text-white">
                Paw<span className="text-primary">Mira</span>
              </span>
            </Link>
            <p className="text-sm text-neutral-dark leading-relaxed">
              Every second counts. Report injured dogs quickly and help us coordinate rescue efforts in your city.
            </p>
            <div className="flex gap-3">
              <a href="#" className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors min-h-0" aria-label="Globe">
                <Globe size={18} />
              </a>
              <a href="#" className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors min-h-0" aria-label="Message">
                <MessageCircle size={18} />
              </a>
              <a href="#" className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors min-h-0" aria-label="Share">
                <Share2 size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2.5">
              {[
                { to: '/about', label: 'About Us' },
                { to: '/services', label: 'Services' },
                { to: '/adoption', label: 'Adoption' },
                { to: '/volunteer', label: 'Volunteer' },
                { to: '/gallery', label: 'Gallery' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-neutral-dark hover:text-primary transition-colors min-h-0 inline-block py-0.5"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Emergency</h3>
            <ul className="space-y-2.5">
              <li>
                <Link to="/report" className="text-sm text-primary font-medium hover:text-primary-light transition-colors min-h-0 inline-block py-0.5">
                  Report Now →
                </Link>
              </li>
              <li>
                <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-neutral-dark hover:text-[#25D366] transition-colors min-h-0 py-0.5">
                  <MessageCircle size={14} />
                  WhatsApp Report
                </a>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-neutral-dark hover:text-primary transition-colors min-h-0 inline-block py-0.5">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-neutral-dark">
                <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
                <span>Hyderabad, India</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-neutral-dark">
                <Phone size={16} className="shrink-0 text-primary" />
                <span>+91 99999 99999</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-neutral-dark">
                <Mail size={16} className="shrink-0 text-primary" />
                <span>help@pawmira.org</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-neutral-dark">
            © {new Date().getFullYear()} PawMira. All rights reserved.
          </p>
          <p className="text-xs text-neutral-dark flex items-center gap-1">
            Made with <Heart size={12} className="text-warning fill-warning" /> for every pawsome soul
          </p>
        </div>
      </div>
    </footer>
  );
}
