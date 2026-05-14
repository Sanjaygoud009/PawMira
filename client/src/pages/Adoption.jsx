import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, PawPrint, Calendar, CheckCircle } from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const adoptionSteps = [
  { icon: PawPrint, title: 'Browse Available Dogs', desc: 'View our rescued dogs ready for their forever homes.' },
  { icon: Calendar, title: 'Schedule a Visit', desc: 'Meet the dog in person at our partner shelter.' },
  { icon: CheckCircle, title: 'Complete Adoption', desc: 'Fill out the adoption form and take your new friend home!' },
];

export default function Adoption() {
  return (
    <div className="min-h-screen">
      <section className="gradient-hero py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeInUp} className="max-w-3xl mx-auto space-y-6">
            <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full">
              Give Them a Home
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white">
              Adopt a <span className="text-primary">Furry Friend</span>
            </h1>
            <p className="text-lg text-neutral-dark">
              Every rescued dog deserves a loving home. Consider adopting instead of shopping.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div {...fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl font-black text-dark">Adoption Process</h2>
            <p className="text-text-light mt-3">Simple, transparent, and filled with love.</p>
          </motion.div>

          <div className="space-y-6">
            {adoptionSteps.map((step, i) => (
              <motion.div
                key={i}
                {...fadeInUp}
                className="flex items-start gap-5 p-6 bg-background rounded-2xl border border-neutral/50"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <step.icon size={22} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-dark">
                    Step {i + 1}: {step.title}
                  </h3>
                  <p className="text-sm text-text-light mt-1">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeInUp} className="text-center mt-12">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
            >
              <Heart size={20} />
              Contact Us to Adopt
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
