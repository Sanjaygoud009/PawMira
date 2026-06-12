import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, CheckCircle } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import api from '../utils/api';
import RescueCard from '../components/report/RescueCard';
import { useAuth } from '../hooks/useAuth';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export default function Gallery() {
  const [safeReports, setSafeReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchSafeReports = async () => {
      try {
        const { data } = await api.get('/reports?status=safe');
        setSafeReports(data);
      } catch (err) {
        console.error('Failed to fetch safe reports', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSafeReports();
  }, []);

  return (
    <div className="min-h-screen">
      <section className="page-header">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div {...fadeInUp} className="space-y-4">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full">
              <Camera size={14} /> Moments that Matter
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">Gallery</h1>
            <p className="text-base sm:text-lg text-neutral-dark">Stories of hope, resilience, and love.</p>
          </motion.div>
        </div>
      </section>

      <section className="page-content">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="flex justify-center p-8 text-text-light">Loading rescued animals...</div>
          ) : safeReports.length === 0 ? (
            <EmptyState preset="gallery" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {safeReports.map((report) => (
                <div key={report._id}>
                  <RescueCard report={report} onUpdate={() => {}} user={user} />
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-sm text-text-light">
              Want to share your rescue story?{' '}
              <a href="/contact" className="inline-btn text-primary font-semibold hover:underline">Contact us</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
