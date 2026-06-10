import { Link } from 'react-router-dom';
import { Heart, Phone, Mail, MapPin, Globe, MessageCircle, Share2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-dark text-neutral">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2" aria-label="PawMira Home">
              <img src="/logo.png" alt="" className="h-9 w-9 rounded-lg" />
              <span className="text-xl font-bold text-white">
                Paw<span className="text-primary">Mira</span>
              </span>
            </Link>
            <p className="text-sm text-neutral-dark leading-relaxed max-w-xs">
              Every second counts. Report injured dogs quickly and help us coordinate rescue efforts in your city.
            </p>
            <div className="flex gap-2">
              <a href="#" className="inline-btn p-2 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors" aria-label="Website">
                <Globe size={16} />
              </a>
              <a href="#" className="inline-btn p-2 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors" aria-label="Chat">
                <MessageCircle size={16} />
              </a>
              <a href="#" className="inline-btn p-2 rounded-lg bg-white/5 hover:bg-primary/20 hover:text-primary transition-colors" aria-label="Share">
                <Share2 size={16} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-xs uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { to: '/about', label: 'About Us' },
                { to: '/services', label: 'Services' },
                { to: '/heroes', label: 'Heroes' },
                { to: '/lost-found', label: 'Lost & Found' },
                { to: '/volunteer', label: 'Volunteer' },
                { to: '/gallery', label: 'Gallery' },
              ].map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="inline-btn text-sm text-neutral-dark hover:text-primary transition-colors py-0.5 inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-xs uppercase tracking-wider">Emergency</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/report" className="inline-btn text-sm text-primary font-medium hover:text-primary-light transition-colors py-0.5 inline-block">
                  Report Now →
                </Link>
              </li>
              <li>
                <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer" className="inline-btn flex items-center gap-1.5 text-sm text-neutral-dark hover:text-[#25D366] transition-colors py-0.5">
                  <MessageCircle size={13} />
                  WhatsApp Report
                </a>
              </li>
              <li>
                <Link to="/dashboard" className="inline-btn text-sm text-neutral-dark hover:text-primary transition-colors py-0.5 inline-block">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-xs uppercase tracking-wider">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-neutral-dark">
                <MapPin size={15} className="mt-0.5 shrink-0 text-primary" />
                <span>Hyderabad, India</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-neutral-dark">
                <Phone size={15} className="shrink-0 text-primary" />
                <span>+91 99999 xxxxx</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-neutral-dark">
                <Mail size={15} className="shrink-0 text-primary" />
                <span>pawmiraofficial@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-dark">
            © {new Date().getFullYear()} PawMira. All rights reserved.
          </p>
          <p className="text-xs text-neutral-dark flex items-center gap-1">
            Made with <Heart size={11} className="text-error fill-error" /> for every pawsome soul
          </p>
        </div>
      </div>
    </footer>
  );
}
