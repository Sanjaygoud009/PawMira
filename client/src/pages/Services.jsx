import { motion } from 'framer-motion';
import { Stethoscope, Truck, Home, Siren, PawPrint, Pill, HeartHandshake, ShieldCheck } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 120, damping: 14 }
  }
};

const services = [
  {
    icon: Siren,
    title: 'Emergency Rescue',
    description: 'Rapid response teams dispatched to critical cases within minutes. Available 24/7 via web and WhatsApp.',
    color: 'from-error to-rose-600',
    bg: 'bg-error/5',
  },
  {
    icon: Stethoscope,
    title: 'Medical Treatment',
    description: 'Partnered with top veterinary clinics for immediate medical attention — from wound care to life-saving surgery.',
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-500/5',
  },
  {
    icon: Home,
    title: 'Shelter & Rehab',
    description: 'Safe haven with proper nutrition, care, and socialization until the animal is fully recovered and ready for adoption.',
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-500/5',
  },
  {
    icon: ShieldCheck,
    title: 'Vaccination Programs',
    description: 'Comprehensive vaccination and ABC (Animal Birth Control) programs to protect community street animals.',
    color: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-500/5',
  },
  {
    icon: Truck,
    title: 'Animal Ambulance',
    description: 'Dedicated and fully-equipped animal ambulance service for the safe and humane transport of injured animals.',
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-500/5',
  },
  {
    icon: HeartHandshake,
    title: 'Post-Rescue Care',
    description: 'Continuous tracking of recovery progress, follow-up treatments, and ensuring long-term well-being and health.',
    color: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-500/5',
  },
];

export default function Services() {
  return (
    <div className="min-h-screen bg-background">
      {/* Redesigned Shorter Header */}
      <section className="page-header !pt-[100px] !pb-10 sm:!pb-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 flex flex-col items-center"
          >
            <span className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-primary/10 text-primary text-sm font-bold uppercase tracking-wider rounded-full shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              <PawPrint size={14} /> What We Offer
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Our Core <span className="text-primary">Services</span>
            </h1>
            <p className="text-base sm:text-lg text-neutral-dark max-w-2xl font-medium">
              From emergency extraction to long-term rehabilitation, we provide comprehensive care for every animal in need.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Redesigned Grid with Staggered Animations */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          >
            {services.map((service, i) => (
              <motion.div
                key={i}
                variants={cardVariants}
                className={`relative overflow-hidden rounded-[2rem] p-8 border border-neutral shadow-sm hover:shadow-2xl transition-all duration-500 group ${service.bg}`}
              >
                {/* Background Glow Effect */}
                <div className={`absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-gradient-to-br ${service.color} opacity-20 blur-2xl rounded-full group-hover:opacity-40 transition-opacity duration-500`}></div>
                
                <div className="relative z-10">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} mb-6 shadow-lg`}
                  >
                    <service.icon size={28} className="text-white" />
                  </motion.div>
                  <h3 className="text-2xl font-black text-dark mb-3 tracking-tight group-hover:text-primary transition-colors">{service.title}</h3>
                  <p className="text-sm sm:text-base text-text-light font-medium leading-relaxed">{service.description}</p>
                </div>
                
                {/* Decorative bottom line */}
                <div className={`absolute bottom-0 left-0 h-1.5 w-0 bg-gradient-to-r ${service.color} group-hover:w-full transition-all duration-700 ease-out`}></div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
