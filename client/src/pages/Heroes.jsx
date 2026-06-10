import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Heart, Medal, MapPin } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { SkeletonGrid, SkeletonLeaderboardRow } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const getRankDisplay = (index) => {
  if (index === 0) return <span className="text-2xl">🥇</span>;
  if (index === 1) return <span className="text-2xl">🥈</span>;
  if (index === 2) return <span className="text-2xl">🥉</span>;
  return <span className="text-sm font-bold text-text-light w-6 text-center">{index + 1}</span>;
};

export default function Heroes() {
  const { user } = useAuth();
  const [globalLeaders, setGlobalLeaders] = useState([]);
  const [areaLeaders, setAreaLeaders] = useState([]);
  const [activeTab, setActiveTab] = useState('global');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();
  }, [user]);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      const [globalRes, areaRes] = await Promise.all([
        api.get('/leaderboards/global'),
        user?.service_area ? api.get(`/leaderboards/area?service_area=${user.service_area}`) : Promise.resolve({ data: [] })
      ]);
      
      setGlobalLeaders(globalRes.data);
      setAreaLeaders(areaRes.data);
      
      if (user?.service_area && areaRes.data.length > 0) {
        setActiveTab('area');
      }
    } catch (error) {
      console.error('Failed to fetch leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderLeaderboard = (data) => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <SkeletonLeaderboardRow key={i} />)}
        </div>
      );
    }

    if (data.length === 0) {
      return <EmptyState preset="heroes" />;
    }

    return (
      <div className="space-y-3">
        {data.map((hero, index) => (
          <motion.div 
            key={hero._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`card-static p-4 sm:p-5 flex items-center gap-3 sm:gap-4 ${index === 0 ? '!border-yellow-200 !bg-yellow-50/50 ring-1 ring-yellow-100' : ''}`}
          >
            <div className="w-10 flex justify-center shrink-0">
              {getRankDisplay(index)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-text-dark truncate flex items-center gap-2">
                {hero.name}
                {index === 0 && <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] uppercase tracking-wider font-bold">Top Hero</span>}
              </h3>
              <p className="text-xs sm:text-sm text-text-light truncate">
                {hero.hero_level} • {hero.service_area || hero.city || 'Global'}
              </p>
            </div>

            {/* Stats — stacked on mobile, inline on desktop */}
            <div className="flex items-center gap-3 sm:gap-5 shrink-0">
              <div className="hidden sm:flex flex-col items-center">
                <span className="text-[10px] text-text-light uppercase font-bold tracking-wider">Rescues</span>
                <span className="font-bold text-text-dark">{hero.rescue_count}</span>
              </div>
              <div className="hidden sm:flex flex-col items-center">
                <span className="text-[10px] text-text-light uppercase font-bold tracking-wider">Reunited</span>
                <span className="font-bold text-text-dark">{hero.reunited_pets_count}</span>
              </div>
              <div className="flex flex-col items-center bg-primary/8 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-primary/15">
                <span className="text-[10px] text-primary uppercase font-bold tracking-wider flex items-center gap-0.5"><Heart size={10}/> Hearts</span>
                <span className="font-black text-primary text-lg sm:text-xl">{hero.hearts}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Consistent page header */}
      <section className="page-header">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-16 h-16 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-5 border-2 border-primary/20"
          >
            <Trophy className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
            Community <span className="text-primary">Heroes</span>
          </h1>
          <p className="text-base sm:text-lg text-neutral-dark max-w-2xl mx-auto leading-relaxed">
            Honoring the dedicated individuals who go above and beyond to protect, rescue, and care for animals.
          </p>
        </div>
      </section>

      <section className="page-content">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Tabs */}
          <div className="flex justify-center mb-8">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-neutral inline-flex">
              <button
                onClick={() => setActiveTab('global')}
                className={`inline-btn px-4 sm:px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'global' ? 'bg-primary text-white shadow-md' : 'text-text-light hover:text-text-dark'
                }`}
              >
                🌍 Global
              </button>
              {user?.service_area && areaLeaders.length > 0 && (
                <button
                  onClick={() => setActiveTab('area')}
                  className={`inline-btn px-4 sm:px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'area' ? 'bg-primary text-white shadow-md' : 'text-text-light hover:text-text-dark'
                  }`}
                >
                  <MapPin size={14} /> {user.service_area}
                </button>
              )}
            </div>
          </div>

          {activeTab === 'global' ? renderLeaderboard(globalLeaders) : renderLeaderboard(areaLeaders)}
        </div>
      </section>
    </div>
  );
}
