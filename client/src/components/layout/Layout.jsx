import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import usePageMeta from '../../hooks/usePageMeta';

// Pages that manage their own top padding (full-bleed hero sections)
const FULL_BLEED_PAGES = ['/', '/about', '/services', '/contact', '/volunteer', '/adoption', '/gallery'];

export default function Layout({ children }) {
  const { pathname } = useLocation();

  // SEO meta tags
  usePageMeta();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  const isFullBleed = FULL_BLEED_PAGES.includes(pathname);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className={`flex-1 ${isFullBleed ? '' : 'pt-20'}`}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
