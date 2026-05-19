import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, Phone, MapPin, Send, User, MessageSquare, Loader2 } from 'lucide-react';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Message sent! We'll get back to you soon 🐾");
        setForm({ name: '', email: '', message: '' });
      } else {
        toast.error(data.message || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      console.error('Contact form error:', err);
      toast.error('Could not reach the server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    { icon: MapPin, label: 'Address', value: 'Hyderabad, India' },
    { icon: Phone, label: 'Phone', value: '+91 99999 99999' },
    { icon: Mail, label: 'Email', value: 'help@pawmira.org' },
  ];

  return (
    <div className="min-h-screen">
      <section className="gradient-hero py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div {...fadeInUp} className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-black text-white">Contact Us</h1>
            <p className="text-lg text-neutral-dark">Have questions? We'd love to hear from you.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-5 gap-8">
          <motion.div {...fadeInUp} className="md:col-span-2 space-y-6">
            <h2 className="text-2xl font-black text-dark">Let's Talk</h2>
            {contactInfo.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-text-light">{item.label}</p>
                  <p className="text-sm font-semibold text-dark">{item.value}</p>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div {...fadeInUp} className="md:col-span-3">
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-neutral/50 p-8 space-y-5">
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
                <input type="text" value={form.name} onChange={(e) => setForm(f => ({...f, name: e.target.value}))} placeholder="Your name" className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-neutral text-sm focus:outline-none focus:border-primary" disabled={loading} />
              </div>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-light" />
                <input type="email" value={form.email} onChange={(e) => setForm(f => ({...f, email: e.target.value}))} placeholder="you@example.com" className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-neutral text-sm focus:outline-none focus:border-primary" disabled={loading} />
              </div>
              <div className="relative">
                <MessageSquare size={18} className="absolute left-4 top-4 text-text-light" />
                <textarea rows={4} value={form.message} onChange={(e) => setForm(f => ({...f, message: e.target.value}))} placeholder="Your message..." className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-neutral text-sm focus:outline-none focus:border-primary resize-none" disabled={loading} />
              </div>
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all shadow-lg disabled:opacity-60">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
