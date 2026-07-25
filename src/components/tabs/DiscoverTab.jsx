import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; 
import { MessageCircle, MoreVertical, Flag, Ban } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ProfileGallery from '../ProfileGallery';

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

export default function DiscoverTab({ session, openChatWithUser, handleCardClick, onReportUser, onBlockUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [activeMenuUserId, setActiveMenuUserId] = useState(null);

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

      // Filter out admin users
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

  const toggleMenu = (e, userId) => {
    e.stopPropagation();
    setActiveMenuUserId(activeMenuUserId === userId ? null : userId);
  };

  // 🔴 1. Direct Supabase Report Insertion
  const handleReport = async (e, user) => {
    e.stopPropagation();
    setActiveMenuUserId(null);

    if (onReportUser) {
      onReportUser(user);
      return;
    }

    const reason = window.prompt(`Reason for reporting ${user.full_name}:`, "Inappropriate behavior / Fake Profile");
    if (!reason || !reason.trim()) return;

    try {
      const { error } = await supabase.from('reports').insert([
        {
          reporter_id: session.user.id,
          reported_user_id: user.id,
          reason: reason.trim(),
          status: 'pending'
        }
      ]);

      if (error) throw error;

      toast.success(`Reported ${user.full_name} to Admin`);
    } catch (err) {
      console.error('Report error:', err.message);
      toast.error('Report failed: ' + err.message);
    }
  };

  // 🚫 2. Direct Supabase Block Insertion
  const handleBlock = async (e, user) => {
    e.stopPropagation();
    setActiveMenuUserId(null);

    if (onBlockUser) {
      onBlockUser(user);
      return;
    }

    if (!window.confirm(`Are you sure you want to block ${user.full_name}?`)) return;

    try {
      const { error } = await supabase.from('blocked_users').insert([
        {
          blocker_id: session.user.id,
          blocked_id: user.id
        }
      ]);

      if (error) throw error;

      toast.success(`Blocked ${user.full_name}`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (err) {
      console.error('Block error:', err.message);
      toast.error('Block failed: ' + err.message);
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
          className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-white focus:outline-none cursor-pointer"
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
              className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-900 rounded-3xl overflow-hidden shadow-sm flex flex-col transition transform hover:scale-[1.01] relative"
            >
              
              {/* Image / Gallery Area */}
              <div 
                className="p-3 pb-0 relative cursor-pointer" 
                onClick={() => handleCardClick && handleCardClick(user)}
              >
                {/* 3 Dots Menu Button (Top-Right) */}
                <div className="absolute top-5 right-5 z-20">
                  <button
                    onClick={(e) => toggleMenu(e, user.id)}
                    className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition backdrop-blur-md"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {/* Dropdown Menu */}
                  {activeMenuUserId === user.id && (
                    <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl py-1 z-30 text-xs overflow-hidden">
                      <button
                        onClick={(e) => handleReport(e, user)}
                        className="w-full text-left px-4 py-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2"
                      >
                        <Flag size={14} /> Report
                      </button>
                      <button
                        onClick={(e) => handleBlock(e, user)}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold flex items-center gap-2 border-t border-gray-100 dark:border-gray-700"
                      >
                        <Ban size={14} /> Block
                      </button>
                    </div>
                  )}
                </div>

                {/* Profile Gallery */}
                <ProfileGallery 
                  userId={user.id} 
                  fallbackAvatar={user.avatar_url || getAvatarUrl(user.full_name)} 
                  existingGallery={user.gallery || user.photos} 
                />
              </div>

              {/* Info Area */}
              <div className="p-4 pt-3 flex-1 flex flex-col justify-between">
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
                
                {/* Action Button */}
                <div className="pt-4">
                  <button 
                    onClick={() => openChatWithUser(user)} 
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:opacity-90 transition font-black py-2.5 rounded-xl text-center flex items-center justify-center gap-2 text-xs shadow-sm"
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