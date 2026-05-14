import { motion } from 'framer-motion';
import { Heart, Shield, Users, Target, Eye, Zap } from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-hero py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeInUp} className="max-w-3xl mx-auto space-y-6">
            <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full">
              Our Story
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white">
              About <span className="text-primary">PawMira</span>
            </h1>
            <p className="text-lg text-neutral-dark leading-relaxed">
              PawMira was born from a simple truth: every injured animal deserves a quick response.
              We bridge the gap between people who witness animal distress and the heroes who can help.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div {...fadeInUp} className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl p-8 sm:p-10 border border-primary/10">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
                <Target size={24} className="text-primary" />
              </div>
              <h2 className="text-2xl font-black text-dark mb-4">Our Mission</h2>
              <p className="text-text-light leading-relaxed">
                To make reporting injured animals as simple as sending a text message.
                We leverage technology to create an instant bridge between distressed
                animals and rescue teams, ensuring no cry for help goes unanswered.
              </p>
            </motion.div>

            <motion.div {...fadeInUp} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 sm:p-10 border border-blue-100">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                <Eye size={24} className="text-blue-500" />
              </div>
              <h2 className="text-2xl font-black text-dark mb-4">Our Vision</h2>
              <p className="text-text-light leading-relaxed">
                A world where every stray animal has access to timely medical care,
                where communities actively participate in animal welfare, and where
                technology serves as the backbone of compassionate action.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl font-black text-dark">What We Stand For</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'Speed', desc: 'Every second matters. Our platform is designed for sub-30-second reporting.', color: 'text-amber-500' },
              { icon: Heart, title: 'Compassion', desc: 'We believe every life matters, regardless of species or status.', color: 'text-red-500' },
              { icon: Shield, title: 'Reliability', desc: 'Our system is built for production — no lost data, no missed reports.', color: 'text-blue-500' },
              { icon: Users, title: 'Community', desc: 'We connect individuals, volunteers, and NGOs into a unified rescue network.', color: 'text-emerald-500' },
              { icon: Eye, title: 'Transparency', desc: 'Track every report from submission to rescue. Full visibility, full trust.', color: 'text-purple-500' },
              { icon: Target, title: 'Impact', desc: 'We measure success in lives saved, not metrics. Real impact, real change.', color: 'text-primary' },
            ].map((value, i) => (
              <motion.div
                key={i}
                {...fadeInUp}
                className="bg-white rounded-2xl p-6 border border-neutral/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <value.icon size={28} className={`${value.color} mb-4`} />
                <h3 className="text-lg font-bold text-dark mb-2">{value.title}</h3>
                <p className="text-sm text-text-light leading-relaxed">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
