import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; 
import { MessageCircle, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';

const COUNTRIES_LIST = [
  { code: 'IN', name: '🇮🇳 India' },
  { code: 'US', name: '🇺🇸 United States' },
  { code: 'GB', name: '🇬🇧 United Kingdom' },
  { code: 'CA', name: '🇨🇦 Canada' },
  { code: 'AU', name: '🇦🇺 Australia' },
  { code: 'DE', name: '🇩🇪 Germany' },
  { code: 'FR', name: '🇫🇷 France' },
  { code: 'BR', name: '🇧🇷 Brazil' },
  { code: 'MX', name: '🇲🇽 Mexico' },
  { code: 'ES', name: '🇪🇸 Spain' },
  { code: 'IT', name: '🇮🇹 Italy' },
  { code: 'NL', name: '🇳🇱 Netherlands' },
  { code: 'SE', name: '🇸🇪 Sweden' },
  { code: 'AE', name: '🇦🇪 UAE' },
  { code: 'SG', name: '🇸🇬 Singapore' },
];

// 1. Props me handleCardClick ko accept kiya
export default function DiscoverTab({ session, openChatWithUser, handleCardClick }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('All');

  useEffect(() => {
    fetchDiscoverUsers();
  }, [session?.user?.id, selectedCountry]);

  const fetchDiscoverUsers = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .neq('id', session.user.id);

      if (selectedCountry !== 'All') {
        query = query.eq('country', selectedCountry);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Admin profiles ko list se hatane ke liye filter
      const filtered = (data || []).filter(u => {
        const email = (u.email || '').toLowerCase();
        return !email.includes('admin@gmail.com') && u.role !== 'admin';
      });

      setUsers(filtered);
    } catch (error) {
      console.error('Error fetching discover users:', error.message);
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff`;
  const getCountryName = (code) => COUNTRIES_LIST.find(c => c.code === code)?.name || code;

  return (
    <div className="space-y-6">
      
      {/* Country Filter UI */}
      <div className="flex justify-start items-center bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm max-w-2xl mx-auto gap-3">
        <span className="text-sm font-bold text-gray-500">🌍 Filter:</span>
        <select 
          value={selectedCountry} 
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-white focus:outline-none"
        >
          <option value="All">All Countries</option>
          {COUNTRIES_LIST.map(c => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Profiles Cards Grid */}
      {loading ? (
        <p className="text-center text-gray-400 font-bold animate-pulse py-10">🔄 Loading fresh profiles...</p>
      ) : users.length === 0 ? (
        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl max-w-2xl mx-auto border border-dashed border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-400 font-bold">🕵️‍♂️ You're all caught up!</p>
          <p className="text-xs text-gray-400 mt-1">Total found: 0. Try removing country filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <div 
              key={user.id} 
              className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-900 rounded-3xl overflow-hidden shadow-sm flex flex-col transition transform hover:scale-[1.01]"
            >
              
              {/* 2. Image area pr click krne se handleCardClick call hoga */}
              <div 
                className="p-4 pb-0 relative cursor-pointer" 
                onClick={() => handleCardClick && handleCardClick(user)}
              >
                <img 
                  src={user.avatar_url || getAvatarUrl(user.full_name)} 
                  alt={user.full_name} 
                  className="w-full h-72 object-cover rounded-2xl"
                />
                <div className="absolute bottom-2 right-6 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                  ℹ️ Click to view info
                </div>
              </div>

              {/* Info Area */}
              <div className="p-4 pt-3 flex-1 flex flex-col justify-between">
                
                {/* 3. Name aur handle area pr click krne se bhi handleCardClick chalega */}
                <div 
                  className="cursor-pointer" 
                  onClick={() => handleCardClick && handleCardClick(user)}
                >
                  <h3 className="font-black text-lg text-gray-900 dark:text-white">{user.full_name}, {user.age || '?'}</h3>
                  <p className="text-sm text-gray-500">@{user.username || 'user'}</p>
                  {user.country && (
                    <p className="text-xs bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 mt-1 rounded inline-block font-bold text-gray-600 dark:text-gray-400">
                      📍 {getCountryName(user.country)}
                    </p>
                  )}
                </div>
                
                {/* Chat Action Button */}
                <div className="pt-4">
                  <button 
                    onClick={() => openChatWithUser(user)} 
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white transition font-black py-2.5 rounded-xl text-center flex items-center justify-center gap-2 text-xs shadow-sm"
                  >
                    <MessageCircle size={14} /> Say Hello
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}