import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function DiscoverTab({ session, setActiveTab, setSelectedChatUser }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState('');

  const COUNTRIES_LIST = [
    { code: 'IN', name: '🇮🇳 India' }, { code: 'US', name: '🇺🇸 United States' },
    { code: 'GB', name: '🇬🇧 United Kingdom' }, { code: 'CA', name: '🇨🇦 Canada' },
    { code: 'AU', name: '🇦🇺 Australia' }, { code: 'AE', name: '🇦🇪 UAE' },
    { code: 'SG', name: '🇸🇬 Singapore' }, { code: 'DE', name: '🇩🇪 Germany' },
    { code: 'FR', name: '🇫🇷 France' }, { code: 'JP', name: '🇯🇵 Japan' },
    { code: 'BR', name: '🇧🇷 Brazil' }, { code: 'ZA', name: '🇿🇦 South Africa' },
    { code: 'PK', name: '🇵🇰 Pakistan' }, { code: 'BD', name: '🇧🇩 Bangladesh' },
    { code: 'NP', name: '🇳🇵 Nepal' }
  ];

  useEffect(() => {
    fetchProfiles();
  }, [selectedCountry, session.user.id]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);

      let query = supabase
      .from('profiles')
      .select('*')
      .not('full_name', 'is', null)
      .not('avatar_url', 'is', null)
      .neq('id', session.user.id); // Sirf khud ko hata

      if (selectedCountry) {
        query = query.eq('country', selectedCountry);
      }

      const { data, error } = await query;
      if (error) throw error;

      setProfiles(data || []);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Fetch profiles error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (likedUserId) => {
    try {
      await supabase
      .from('likes')
      .insert({
          liker_id: session.user.id,
          liked_id: likedUserId,
          action_type: 'like'
        });
      setCurrentIndex(prev => prev + 1);
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handlePass = async (passedUserId) => {
    try {
      await supabase
      .from('likes')
      .insert({
          liker_id: session.user.id,
          liked_id: passedUserId,
          action_type: 'dislike'
        });
      setCurrentIndex(prev => prev + 1);
    } catch (err) {
      console.error('Pass error:', err);
    }
  };

  // 👇 DIRECT CHAT - NO LIKE REQUIRED
  const handleChat = (targetUser) => {
    setSelectedChatUser(targetUser);
    setActiveTab('chat');
  };

  const handleNearbyClick = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(() => {
      alert('📍 Location synced!');
      fetchProfiles();
    });
  };

  const getAvatarUrl = (name) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`;

  const currentProfile = profiles[currentIndex];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 border border-gray-100 rounded-2xl gap-4">
        <button
          onClick={handleNearbyClick}
          className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs px-5 py-3 rounded-xl shadow-sm active:scale-95 transition"
        >
          📍 Sync Nearby
        </button>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="w-full sm:w-auto bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none cursor-pointer"
        >
          <option value="">🌍 Filter by Country (All)</option>
          {COUNTRIES_LIST.map(c => (
            <option key={c.code} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Profile Cards */}
      {loading? (
        <div className="text-center py-20 text-xs font-bold text-gray-400 animate-pulse">
          🔍 Scanning profiles...
        </div>
      ) :!currentProfile? (
        <div className="text-center py-20 bg-white border border-dashed rounded-3xl text-xs font-bold text-gray-400">
          🎉 You're all caught up!<br/>
          <span className="text-xs">No new profiles. Check back later!</span>
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm p-4 space-y-4 relative">
            <img
              src={currentProfile.avatar_url || getAvatarUrl(currentProfile.full_name)}
              alt={currentProfile.full_name}
              className="w-full h-96 object-cover rounded-2xl"
            />

            <div className="mt-3">
              <h3 className="font-black text-gray-900 text-lg">
                {currentProfile.full_name || 'Anonymous'}, {currentProfile.age || '?'}
              </h3>
              <p className="text-xs text-gray-500">@{currentProfile.username || 'no-username'}</p>
              <p className="text-xs bg-gray-100 px-2.5 py-1 rounded-md inline-block font-extrabold text-gray-500 mt-1">
                📍 {currentProfile.country || 'Global'}
              </p>
              {currentProfile.bio && (
                <p className="text-xs text-gray-600 mt-2">{currentProfile.bio}</p>
              )}
              {currentProfile.interests && (
                <p className="text-xs text-gray-500 mt-1">💖 {currentProfile.interests}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handlePass(currentProfile.id)}
                className="bg-gray-50 hover:bg-gray-100 text-gray-700 font-black text-xs py-3 rounded-xl transition active:scale-95"
              >
                ❌ Pass
              </button>
              <button
                onClick={() => handleLike(currentProfile.id)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs py-3 rounded-xl transition active:scale-95"
              >
                ❤️ Like
              </button>
              <button
                onClick={() => handleChat(currentProfile)}
                className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs py-3 rounded-xl shadow-sm transition active:scale-95"
              >
                💬 Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}