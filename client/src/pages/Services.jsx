import { motion } from 'framer-motion';
import { Stethoscope, Truck, Home, Siren, PawPrint, Pill } from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const services = [
  {
    icon: Siren,
    title: 'Emergency Rescue',
    description: 'Rapid response teams dispatched to critical cases within minutes. Available 24/7 via web and WhatsApp.',
    color: 'from-red-500 to-rose-500',
  },
  {
    icon: Stethoscope,
    title: 'Medical Treatment',
    description: 'Partnered with veterinary clinics for immediate medical attention — from wound care to surgery.',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    icon: Home,
    title: 'Shelter & Rehabilitation',
    description: 'Safe shelter with proper nutrition, care, and socialization until the animal is ready for adoption.',
    color: 'from-emerald-500 to-green-500',
  },
  {
    icon: Pill,
    title: 'Vaccination & Sterilization',
    description: 'Comprehensive vaccination and ABC (Animal Birth Control) programs for community animals.',
    color: 'from-purple-500 to-violet-500',
  },
  {
    icon: Truck,
    title: 'Transport & Logistics',
    description: 'Dedicated animal ambulance service for safe and humane transport of injured animals.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: PawPrint,
    title: 'Post-Rescue Follow-up',
    description: 'Tracking recovery progress, follow-up treatments, and ensuring long-term well-being.',
    color: 'from-pink-500 to-rose-500',
  },
];

export default function Services() {
  return (
    <div className="min-h-screen">
      <section className="gradient-hero py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeInUp} className="max-w-3xl mx-auto space-y-6">
            <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full">
              What We Offer
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white">Our Services</h1>
            <p className="text-lg text-neutral-dark">
              Comprehensive animal welfare services from rescue to rehabilitation.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, i) => (
              <motion.div
                key={i}
                {...fadeInUp}
                className="bg-white rounded-3xl p-8 border border-neutral/50 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} mb-6 group-hover:scale-110 transition-transform`}>
                  <service.icon size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-dark mb-3">{service.title}</h3>
                <p className="text-sm text-text-light leading-relaxed">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
