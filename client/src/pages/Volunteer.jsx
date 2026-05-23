import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Heart, MapPin, Clock, Shield, Star, Users, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const perks = [
  { icon: Heart, title: 'Save Lives', desc: 'Directly contribute to animal rescue operations.' },
  { icon: Users, title: 'Community', desc: 'Join a network of like-minded animal lovers.' },
  { icon: Shield, title: 'Training', desc: 'Receive basic animal rescue and first-aid training.' },
  { icon: Star, title: 'Recognition', desc: 'Get certified and recognized for your contributions.' },
  { icon: MapPin, title: 'Local Impact', desc: 'Make a difference in your own neighborhood.' },
  { icon: Clock, title: 'Flexible', desc: 'Volunteer on your own schedule — part-time or full-time.' },
];

export default function Volunteer() {
  return (
    <div className="min-h-screen">
      <section className="gradient-hero py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeInUp} className="max-w-3xl mx-auto space-y-6">
            <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full">
              Be a Hero
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white">
              Become a <span className="text-primary">Volunteer</span>
            </h1>
            <p className="text-lg text-neutral-dark">
              Join our growing family of volunteers and make a real difference in the lives of animals.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/30"
            >
              <Heart size={20} />
              Sign Up as Volunteer
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl font-black text-dark">Why Volunteer with Us?</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {perks.map((perk, i) => (
              <motion.div
                key={i}
                {...fadeInUp}
                className="bg-white rounded-2xl p-6 border border-neutral/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <perk.icon size={28} className="text-primary mb-4" />
                <h3 className="text-lg font-bold text-dark mb-2">{perk.title}</h3>
                <p className="text-sm text-text-light leading-relaxed">{perk.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
