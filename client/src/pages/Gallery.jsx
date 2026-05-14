import { motion } from 'framer-motion';
import { Camera, Heart } from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const placeholders = [
  { title: 'Rescued from highway', color: 'from-amber-400 to-orange-500' },
  { title: 'After surgery recovery', color: 'from-emerald-400 to-green-500' },
  { title: 'Found a forever home', color: 'from-blue-400 to-indigo-500' },
  { title: 'Feeding drive — 50 dogs', color: 'from-pink-400 to-rose-500' },
  { title: 'Vaccination camp', color: 'from-purple-400 to-violet-500' },
  { title: 'Happy adoption day', color: 'from-amber-400 to-yellow-500' },
  { title: 'Community volunteer meet', color: 'from-teal-400 to-cyan-500' },
  { title: 'Shelter renovation', color: 'from-red-400 to-rose-500' },
  { title: 'Night rescue mission', color: 'from-slate-500 to-gray-600' },
];

export default function Gallery() {
  return (
    <div className="min-h-screen">
      <section className="gradient-hero py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div {...fadeInUp} className="space-y-4">
            <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full">
              <Camera size={14} className="inline mr-1" /> Moments that Matter
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white">Gallery</h1>
            <p className="text-lg text-neutral-dark">Stories of hope, resilience, and love.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {placeholders.map((item, i) => (
              <motion.div
                key={i}
                {...fadeInUp}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-80`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <Heart size={32} className="text-white/80 group-hover:scale-110 transition-transform" />
                  <p className="text-white font-bold text-lg">{item.title}</p>
                  <p className="text-white/60 text-xs">Photo coming soon</p>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
