import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';
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
  Zap
} from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: 0.7, type: 'spring', stiffness: 100, damping: 20 },
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
  viewport: { once: true, margin: '-50px' },
};

function Hero() {
  return (
    <section className="relative min-h-[95vh] flex items-center overflow-hidden bg-[#0A0F1C]">
      {/* Background Image with dimming and blur effects */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/background_image.webp')",
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
      
      {/* Floating Status Cards — visible on all screens */}
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[20%] right-4 md:right-[15%] px-4 py-2.5 bg-[#121829] border border-white/10 rounded-2xl z-10 flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)] scale-90 sm:scale-100"
      >
        <div className="w-9 h-9 rounded-full bg-success/20 flex items-center justify-center border border-success/30">
          <Heart size={16} className="text-success" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white tracking-wide">Rescued!</p>
          <p className="text-[10px] font-medium text-white/50 uppercase tracking-widest mt-0.5">2 mins ago</p>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="hidden sm:flex absolute bottom-[15%] right-[10%] md:right-[40%] px-4 py-2.5 bg-[#121829] border border-white/10 rounded-2xl z-10 items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
      >
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
          <AlertTriangle size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white tracking-wide">New Emergency</p>
          <p className="text-[10px] font-medium text-white/50 uppercase tracking-widest mt-0.5">Nearby: 0.5 km</p>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-32 pb-16 flex flex-col justify-center">
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
          <h1 className="text-[2.5rem] sm:text-5xl lg:text-[4.5rem] font-black text-white leading-[1.08] tracking-tight drop-shadow-lg">
            Every Paw
            <br />
            Deserves a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-amber-300">
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
  const [statsData, setStatsData] = useState({
    dogsRescued: '3+',
    volunteers: '2+',
    activeCases: 'Open',
    reportTime: '<30s'
  });

  useEffect(() => {
    api.get('/reports/stats')
      .then(({ data }) => {
        setStatsData({
          dogsRescued: `${data.dogsRescued}+`,
          volunteers: `${data.volunteers}+`,
          activeCases: `${data.activeCases}`,
          reportTime: '<30s'
        });
      })
      .catch(err => console.error('Failed to load stats', err));
  }, []);

  const stats = [
    { icon: Heart, value: statsData.dogsRescued, label: 'Dogs Rescued', color: 'text-success', bg: 'bg-success/10' },
    { icon: Users, value: statsData.volunteers, label: 'Volunteers', color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Building2, value: statsData.activeCases, label: 'Active Cases', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Zap, value: statsData.reportTime, label: 'Report Time', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <section className="relative pb-16 pt-8 bg-background z-20 -mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative overflow-hidden rounded-[2rem] border border-neutral/50 bg-white p-8 text-center shadow-lg hover:shadow-2xl transition-all duration-300 group"
            >
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-transparent to-neutral-dark/5 rounded-full transition-transform group-hover:scale-150 duration-500" />
              <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon size={28} className={stat.color} />
              </div>
              <p className="text-4xl sm:text-5xl font-black text-dark mb-1 tracking-tight">{stat.value}</p>
              <p className="text-sm font-bold text-text-light uppercase tracking-wider">{stat.label}</p>
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
      title: 'Report Quickly',
      description: 'Snap a photo, share your live location, and describe the situation. No account required.',
      color: 'from-orange-500 to-primary',
    },
    {
      icon: Shield,
      title: 'Smart Dispatch',
      description: 'Our AI routes the emergency to the closest available volunteers and NGOs instantly.',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      icon: Heart,
      title: 'Track Rescue',
      description: 'Watch the rescue unfold in real-time. Follow the journey until the animal is marked safe.',
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <section className="py-24 sm:py-32 bg-white relative overflow-hidden">
      {/* Decorative background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          className="text-center mb-20"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-sm font-bold uppercase tracking-wider rounded-full mb-6">
            <Sparkles size={16} />
            Seamless Process
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-black text-dark tracking-tight">
            How PawMira Works
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-6 text-lg text-text-light max-w-2xl mx-auto font-medium">
            We've eliminated the friction in animal rescue. Our platform connects a person who cares with a person who can help, instantly.
          </motion.p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          className="grid md:grid-cols-3 gap-8 relative"
        >
          {/* Connecting Line for Desktop */}
          <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-1 bg-gradient-to-r from-primary/20 via-indigo-500/20 to-emerald-500/20 -translate-y-1/2 z-0" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              variants={fadeInUp}
              className="relative group z-10"
            >
              <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_10px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-500 border border-neutral/60 hover:-translate-y-2 text-center h-full">
                
                <div className={`mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br ${step.color} p-0.5 mb-8 shadow-xl group-hover:scale-110 transition-transform duration-500`}>
                  <div className="w-full h-full bg-white rounded-[1.4rem] flex items-center justify-center">
                    <step.icon size={32} className="text-dark" />
                  </div>
                </div>

                <div className="absolute top-6 left-6 text-7xl font-black text-neutral-dark/10 group-hover:text-neutral-dark/20 transition-colors pointer-events-none select-none">
                  0{i + 1}
                </div>

                <h3 className="text-2xl font-black text-dark mb-4 tracking-tight">{step.title}</h3>
                <p className="text-text-light text-base font-medium leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CTABanner() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden bg-dark">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute -top-[50%] -left-[10%] w-[70%] h-[150%] bg-primary/40 rounded-full blur-[120px] animate-[pulse_8s_infinite_alternate]" />
        <div className="absolute top-[20%] -right-[20%] w-[60%] h-[120%] bg-orange-600/30 rounded-full blur-[100px] animate-[pulse_10s_infinite_alternate_reverse]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          className="space-y-10"
        >
          <motion.h2 variants={fadeInUp} className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Every Second{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-300">
              Counts
            </span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-xl sm:text-2xl text-white/80 max-w-3xl mx-auto font-medium">
            An animal is waiting for help right now. Your report could be the difference between life and death.
          </motion.p>
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-center gap-6 pt-4">
            <Link
              to="/report"
              className="flex items-center justify-center gap-3 px-10 py-5 bg-white text-primary font-black rounded-2xl text-lg hover:bg-neutral-light transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-105"
            >
              <AlertTriangle size={22} />
              Report Emergency Now
            </Link>
            <Link
              to="/volunteer"
              className="flex items-center justify-center gap-3 px-10 py-5 bg-white/10 backdrop-blur-md text-white font-bold rounded-2xl text-lg hover:bg-white/20 transition-all border border-white/20 hover:scale-105"
            >
              <Heart size={22} />
              Join as a Volunteer
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="bg-background">
      <Hero />
      <Stats />
      <HowItWorks />
      <CTABanner />
    </div>
  );
}
