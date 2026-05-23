import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Camera,
  MapPin,
  Heart,
  MessageCircle,
  Shield,
  Users,
  Building2,
  Clock,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true },
};

function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-dark">
      {/* Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/background_image.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Gradient Overlays for readability and matching screenshot */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-dark/95 via-dark/80 to-transparent" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-dark/60 via-transparent to-dark" />

      {/* Floating cards matching screenshot positioning */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="hidden md:flex absolute top-[30%] right-[10%] px-5 py-4 bg-dark/70 backdrop-blur-md border border-white/10 rounded-2xl z-10 items-center gap-3 shadow-2xl"
      >
        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center border border-success/30">
          <Heart size={16} className="text-success" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Rescued!</p>
          <p className="text-xs text-neutral-400">2 mins ago</p>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 4.5, repeat: Infinity }}
        className="hidden md:flex absolute bottom-[20%] right-[30%] px-5 py-4 bg-dark/70 backdrop-blur-md border border-white/10 rounded-2xl z-10 items-center gap-3 shadow-2xl"
      >
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
          <MapPin size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">New Report</p>
          <p className="text-xs text-neutral-400">Nearby: 0.5 km</p>
        </div>
      </motion.div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 w-full pt-10">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark/50 backdrop-blur-sm border border-primary/30">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-sm font-medium">24/7 Emergency Reporting</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight">
            Every Paw
            <br />
            Deserves a{' '}
            <span className="text-primary">
              Miracle
            </span>
          </h1>

          <p className="text-lg text-neutral-300 max-w-lg leading-relaxed">
            Report an injured dog in under 30 seconds. Your report triggers an instant response
            from nearby volunteers and NGOs. Together, we save lives.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              to="/report"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl text-lg hover:bg-primary-dark transition-all duration-200 shadow-lg shadow-primary/30"
            >
              <AlertTriangle size={20} />
              Report Emergency
            </Link>
            <a
              href="https://wa.me/919999999999?text=I%20want%20to%20report%20an%20injured%20dog"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-[#25D366] text-white font-bold rounded-2xl text-lg hover:bg-[#128C7E] transition-all duration-200 shadow-lg shadow-[#25D366]/20"
            >
              <MessageCircle size={20} />
              WhatsApp Report
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { icon: Heart, value: '3', label: 'Dogs Rescued', color: 'text-success' },
    { icon: Users, value: '2+', label: 'Volunteers', color: 'text-primary' },
    { icon: Building2, value: '0', label: 'Partner NGOs', color: 'text-blue-400' },
    { icon: Clock, value: '<30s', label: 'Report Time', color: 'text-amber-400' },
  ];

  return (
    <section className="py-16 bg-white border-y border-neutral">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          {...staggerContainer}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              {...fadeInUp}
              className="text-center space-y-2"
            >
              <stat.icon size={28} className={`mx-auto ${stat.color}`} />
              <p className="text-3xl sm:text-4xl font-black text-dark">{stat.value}</p>
              <p className="text-sm text-text-light font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: Camera,
      title: 'Report',
      description: 'Snap a photo, share your location, and describe the situation. Takes under 30 seconds.',
      color: 'from-orange-500 to-amber-500',
    },
    {
      icon: Shield,
      title: 'Respond',
      description: 'Nearby volunteers and NGOs get notified instantly. The closest available responder accepts the case.',
      color: 'from-blue-500 to-indigo-500',
    },
    {
      icon: Heart,
      title: 'Rescue',
      description: 'The dog gets the medical attention and care it needs. Track progress in real-time.',
      color: 'from-emerald-500 to-green-500',
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div {...fadeInUp} className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full mb-4">
            Simple 3-Step Process
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-dark">
            How It Works
          </h2>
          <p className="mt-4 text-text-light max-w-2xl mx-auto">
            We've made reporting as simple as possible. No registration needed — just report and save a life.
          </p>
        </motion.div>

        <motion.div
          {...staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {steps.map((step, i) => (
            <motion.div
              key={i}
              {...fadeInUp}
              className="relative group"
            >
              <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-neutral/50 hover:border-primary/20 hover:-translate-y-1">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} mb-6`}>
                  <step.icon size={24} className="text-white" />
                </div>

                <div className="absolute top-6 right-8 text-6xl font-black text-neutral/30">
                  {i + 1}
                </div>

                <h3 className="text-xl font-bold text-dark mb-3">{step.title}</h3>
                <p className="text-text-light text-sm leading-relaxed">{step.description}</p>
              </div>

              {i < 2 && (
                <div className="hidden md:flex absolute top-1/2 -right-4 z-10">
                  <ChevronRight size={24} className="text-neutral-dark" />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CTABanner() {
  return (
    <section className="py-20 gradient-dark relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div {...fadeInUp} className="space-y-8">
          <h2 className="text-3xl sm:text-5xl font-black text-white">
            Every Second{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-light">
              Counts
            </span>
          </h2>
          <p className="text-lg text-neutral-dark max-w-xl mx-auto">
            A dog is waiting for help right now. Your report could be the difference between life and death.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/report"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-2xl text-lg hover:bg-primary-dark transition-all shadow-xl shadow-primary/30"
            >
              <AlertTriangle size={20} />
              Report Now
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/volunteer"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-2xl text-lg hover:bg-white/20 transition-all border border-white/10"
            >
              <Heart size={20} />
              Join as Volunteer
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <HowItWorks />
      <CTABanner />
    </>
  );
}
