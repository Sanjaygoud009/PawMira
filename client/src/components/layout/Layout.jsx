import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ChatAssistant from '../home/ChatAssistant';

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const compactAssistant = pathname !== '/';
  const floatingAssistant = pathname === '/';

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16 md:pt-20">
        {children}
      </main>
      <Footer />
      <ChatAssistant compact={compactAssistant} floating={floatingAssistant} />
    </div>
  );
}
