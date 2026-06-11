import { motion } from 'framer-motion';
import { Camera, Heart } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const rescueStories = [
  { title: 'Rescued from highway', color: 'from-amber-400 to-orange-500', emoji: '🚗' },
  { title: 'After surgery recovery', color: 'from-emerald-400 to-green-500', emoji: '💚' },
  { title: 'Found a forever home', color: 'from-blue-400 to-indigo-500', emoji: '🏠' },
  { title: 'Feeding drive — 50 dogs', color: 'from-pink-400 to-rose-500', emoji: '🍽️' },
  { title: 'Vaccination camp', color: 'from-purple-400 to-violet-500', emoji: '💉' },
  { title: 'Happy adoption day', color: 'from-amber-400 to-yellow-500', emoji: '🎉' },
  { title: 'Community volunteer meet', color: 'from-teal-400 to-cyan-500', emoji: '🤝' },
  { title: 'Shelter renovation', color: 'from-red-400 to-rose-500', emoji: '🏗️' },
  { title: 'Night rescue mission', color: 'from-slate-500 to-gray-600', emoji: '🌙' },
];

export default function Gallery() {
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
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {rescueStories.map((item, i) => (
              <motion.div
                key={i}
                {...fadeInUp}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-85`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 sm:gap-3 p-4 sm:p-6 text-center">
                  <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform">{item.emoji}</span>
                  <p className="text-white font-bold text-sm sm:text-lg leading-tight">{item.title}</p>
                  <p className="text-white/60 text-[10px] sm:text-xs">Photo coming soon</p>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              </motion.div>
            ))}
          </div>

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
