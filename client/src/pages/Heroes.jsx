import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Heart, Medal, MapPin, Search } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const getLevelIcon = (index) => {
  if (index === 0) return <Trophy className="text-yellow-500 w-6 h-6" />;
  if (index === 1) return <Medal className="text-gray-400 w-6 h-6" />;
  if (index === 2) return <Medal className="text-amber-600 w-6 h-6" />;
  return <span className="text-gray-500 font-bold w-6 h-6 flex items-center justify-center">{index + 1}</span>;
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
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-neutral">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No Heroes Found Yet</h3>
          <p className="text-gray-500">Be the first to make a difference and claim the top spot!</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {data.map((hero, index) => (
          <motion.div 
            key={hero._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-white rounded-2xl shadow-sm border p-4 flex items-center gap-4 transition-all hover:-translate-y-1 hover:shadow-md ${index === 0 ? 'border-yellow-200 bg-yellow-50/50' : 'border-neutral'}`}
          >
            <div className="w-12 flex justify-center shrink-0">
              {getLevelIcon(index)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-text-dark truncate flex items-center gap-2">
                {hero.name}
                {index === 0 && <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs uppercase tracking-wider">Top Hero</span>}
              </h3>
              <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                {hero.hero_level} • {hero.service_area || hero.city || 'Global User'}
              </p>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <div className="hidden sm:flex flex-col items-center">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Rescues</span>
                <span className="font-bold text-gray-700">{hero.rescue_count}</span>
              </div>
              <div className="hidden sm:flex flex-col items-center">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Reunited</span>
                <span className="font-bold text-gray-700">{hero.reunited_pets_count}</span>
              </div>
              <div className="flex flex-col items-center bg-primary/10 px-4 py-2 rounded-xl border border-primary/20">
                <span className="text-xs text-primary uppercase font-bold tracking-wider flex items-center gap-1"><Heart size={12}/> Hearts</span>
                <span className="font-black text-primary text-xl">{hero.hearts}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg"
          >
            <Trophy className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-text-dark mb-4 tracking-tight">
            Community <span className="text-primary">Heroes</span>
          </h1>
          <p className="text-lg text-text-light max-w-2xl mx-auto leading-relaxed">
            Honoring the dedicated individuals who go above and beyond to protect, rescue, and care for animals in our community. Every heart earned is a life touched.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-neutral inline-flex">
            <button
              onClick={() => setActiveTab('global')}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'global' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-text-dark'
              }`}
            >
              🌍 Global Leaders
            </button>
            {user?.service_area && areaLeaders.length > 0 && (
              <button
                onClick={() => setActiveTab('area')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'area' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-text-dark'
                }`}
              >
                <MapPin size={16} /> My Area ({user.service_area})
              </button>
            )}
          </div>
        </div>

        {/* Leaderboard Content */}
        {activeTab === 'global' ? renderLeaderboard(globalLeaders) : renderLeaderboard(areaLeaders)}
      </div>
    </div>
  );
}
