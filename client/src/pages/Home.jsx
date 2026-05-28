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
  Sparkles,
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
    <section className="relative min-h-[95vh] flex items-center overflow-hidden bg-[#0A0F1C]">
      {/* Background Image with dimming and blur effects */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/background_image.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center right 20%'
        }}
      />

      {/* Cinematic Overlays */}
      {/* Strong dark blue on the left for text readability */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#0A0F1C] via-[#0A0F1C]/90 to-transparent" />
      {/* Top overlay to prevent navbar brightness */}
      <div className="absolute top-0 left-0 right-0 h-40 z-0 bg-gradient-to-b from-[#0A0F1C] to-transparent" />
      {/* Bottom overlay for seamless transition */}
      <div className="absolute bottom-0 left-0 right-0 h-32 z-0 bg-gradient-to-t from-white to-transparent opacity-10" />
      
      {/* Floating Status Cards */}
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="hidden md:flex absolute top-[25%] right-[15%] px-5 py-3 bg-[#121829] border border-white/10 rounded-2xl z-10 items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
      >
        <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center border border-success/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
          <Heart size={18} className="text-success" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white tracking-wide">Rescued!</p>
          <p className="text-[11px] font-medium text-white/50 uppercase tracking-widest mt-0.5">2 mins ago</p>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="hidden md:flex absolute bottom-[15%] right-[40%] px-5 py-3 bg-[#121829] border border-white/10 rounded-2xl z-10 items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
      >
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(255,107,53,0.2)]">
          <AlertTriangle size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white tracking-wide">New Emergency</p>
          <p className="text-[11px] font-medium text-white/50 uppercase tracking-widest mt-0.5">Nearby: 0.5 km</p>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20 pb-10 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-6 max-w-xl"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#121829] border border-white/10 shadow-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <span className="text-white/90 text-xs font-semibold tracking-wide uppercase">Live Emergency Network</span>
          </div>

          {/* Heading */}
          <h1 className="text-[3.5rem] sm:text-6xl lg:text-[4.5rem] font-black text-white leading-[1.05] tracking-tight drop-shadow-lg">
            Every Paw
            <br />
            Deserves a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-amber-300 drop-shadow-sm">
              Miracle
            </span>
          </h1>

          {/* Description */}
          <p className="text-[17px] text-white/60 max-w-[500px] leading-relaxed font-medium pb-2">
            A real-time animal emergency response platform. Report an injured dog in under 30 seconds and connect instantly with nearby rescue volunteers.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md pt-1">
            {[
              ['Live', 'case tracking'],
              ['3-step', 'reporting'],
              ['Nearby', 'responders'],
            ].map(([value, label]) => (
              <div key={value} className="border-l border-white/15 pl-3">
                <p className="text-lg font-black text-white">{value}</p>
                <p className="text-[11px] uppercase tracking-wider text-white/45">{label}</p>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Link
              to="/report"
              className="group flex items-center justify-center gap-2.5 px-6 py-3.5 bg-primary text-white font-semibold rounded-xl text-base hover:bg-primary-hover transition-all duration-300 shadow-[0_0_20px_rgba(255,107,53,0.3)] hover:shadow-[0_0_30px_rgba(255,107,53,0.5)] hover:-translate-y-0.5"
            >
              <AlertTriangle size={18} className="transition-transform group-hover:scale-110" />
              Report Emergency
            </Link>
            <a
              href="https://wa.me/919999999999?text=I%20want%20to%20report%20an%20injured%20dog"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white/5 backdrop-blur-md text-white border border-white/10 font-semibold rounded-xl text-base hover:bg-white/10 transition-all duration-300 hover:-translate-y-0.5"
            >
              <MessageCircle size={18} className="text-[#25D366] transition-transform group-hover:scale-110" />
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
    { icon: Building2, value: 'Open', label: 'NGO Ready', color: 'text-blue-400' },
    { icon: Clock, value: '<30s', label: 'Report Time', color: 'text-amber-400' },
  ];

  return (
    <section className="py-16 bg-white border-y border-neutral">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div {...staggerContainer} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              {...fadeInUp}
              className="rounded-2xl border border-neutral/70 bg-background/60 px-4 py-6 text-center space-y-2 shadow-sm"
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
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold rounded-full mb-4">
            <Sparkles size={14} />
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
