import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import DiscoverTab from '../components/tabs/DiscoverTab';
import ChatTab from '../components/tabs/ChatTab';
import ProfileSetup from './ProfileSetup'; 
import AlertsTab from '../components/tabs/AlertsTab'; 
import { MessageCircle, MapPin, Heart, Star, User, X } from 'lucide-react'; 
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

export default function Dashboard({ 
  session, 
  setCurrentChatUser, 
  messages, 
  sendMessage 
}) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('discover');
  const [likesReceived, setLikesReceived] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [myProfile, setMyProfile] = useState({});
  const [selectedDetailUser, setSelectedDetailUser] = useState(null);

  useEffect(() => {
    document.title = `${activeTab.toUpperCase()} | FindLove`;
  }, [activeTab]);

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
  };

  const handleCardClick = async (targetUser) => {
    setSelectedDetailUser(targetUser);
    
    if (!session?.user?.id || !targetUser.id) return;

    try {
      // 1. Profile visit track karo
      await supabase.from('profile_visits').insert({
        visitor_id: session.user.id,
        visited_id: targetUser.id
      });

      const myName = myProfile?.full_name || 'Someone'; 
      
      // 2. Target user ke liye real-time activity alert push karo
      await supabase.from('alerts').insert({
        user_id: targetUser.id, 
        title: 'New Profile Visit! 👀',
        message: `${myName} just viewed your profile profile room.` 
      });

      console.log(`Dynamic alert sent to ${targetUser.full_name}`);
    } catch (err) {
      console.error("Error handling profile view alert:", err.message);
    }
  };

  const openChatWithUser = (targetUser) => {
    setSelectedChatUser(targetUser);
    if (setCurrentChatUser) setCurrentChatUser(targetUser); 
    setActiveTab('chat');
  };

  const fetchMyProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (data) setMyProfile(data);
  }, [session?.user?.id]);

  const fetchWhoLikedMe = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('liker_id')
        .eq('liked_id', session.user.id)
        .eq('action_type', 'like');

      if (likesError) throw likesError;

      if (!likesData || likesData.length === 0) {
        setLikesReceived([]);
        return;
      }

      const likerIds = likesData.map(item => item.liker_id).filter(Boolean);

      if (likerIds.length === 0) {
        setLikesReceived([]);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', likerIds);

      if (profilesError) throw profilesError;

      const cleanProfiles = (profilesData || []).filter(u => {
        const userEmail = (u.email || '').toLowerCase();
        return !userEmail.includes('admin@gmail.com') && u.role !== 'admin';
      });

      setLikesReceived(cleanProfiles);
    } catch (error) {
      console.error("Error fetching likes cleanly:", error);
      toast.error("Could not populate likes list");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => { fetchMyProfile(); }, [fetchMyProfile]);

  useEffect(() => {
    if (activeTab === 'likes') fetchWhoLikedMe();
  }, [activeTab, fetchWhoLikedMe]);

  const getAvatarUrl = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff`;
  const getCountryName = (code) => COUNTRIES_LIST.find(c => c.code === code)?.name || code;

  return (
    <div className="max-w-6xl mx-auto p-4 min-h-screen relative">

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 justify-center bg-gray-100/80 dark:bg-gray-800 p-1.5 rounded-2xl max-w-2xl mx-auto mb-8">
        <button onClick={() => handleTabClick('discover')} className={`px-5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'discover' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>🔍 Discover</button>
        <button onClick={() => handleTabClick('likes')} className={`px-5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'likes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>❤️ Who Liked Me</button>
        <button onClick={() => handleTabClick('chat')} className={`px-5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'chat' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>💬 Chat</button>
        <button onClick={() => handleTabClick('alerts')} className={`px-5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'alerts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>🔔 Alerts</button>
        <button onClick={() => handleTabClick('profile')} className={`px-5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'profile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>⚙️ Profile</button>
      </div>

      {/* --- DISCOVER TAB --- */}
      {activeTab === 'discover' && (
        <DiscoverTab 
          session={session} 
          openChatWithUser={openChatWithUser}
          handleCardClick={handleCardClick}
        />
      )}

      {/* --- WHO LIKED ME TAB --- */}
      {activeTab === 'likes' && (
        <div className="space-y-6">
          <h2 className="text-center text-lg font-black text-gray-800 dark:text-white">People Who Liked Your Profile ({likesReceived.length})</h2>
          
          {loading ? (
            <p className="text-center text-gray-400 font-bold animate-pulse py-10">🔄 Fetching your admirers...</p>
          ) : likesReceived.length === 0 ? (
            <p className="text-center text-gray-400 font-bold py-10">No one has liked you yet. Keep exploring! 😉</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {likesReceived.map((user) => (
                <div key={user.id} className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-900 rounded-3xl overflow-hidden shadow-sm flex flex-col transition transform hover:scale-[1.01]">
                  
                  <div className="p-4 pb-0 relative cursor-pointer" onClick={() => handleCardClick(user)}>
                    <img 
                      src={user.avatar_url || getAvatarUrl(user.full_name)} 
                      alt={user.full_name} 
                      className="w-full h-72 object-cover rounded-2xl"
                    />
                    <div className="absolute bottom-2 right-6 bg-black/50 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                      ℹ️ Click to view info
                    </div>
                  </div>

                  <div className="p-4 pt-3 flex-1 flex flex-col justify-between">
                    <div className="cursor-pointer" onClick={() => handleCardClick(user)}>
                      <h3 className="font-black text-lg text-gray-900 dark:text-white">{user.full_name}, {user.age || '?'}</h3>
                      <p className="text-sm text-gray-500">@{user.username || 'user'}</p>
                      {user.country && <p className="text-xs bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 mt-1 rounded inline-block font-bold text-gray-600 dark:text-gray-400">📍 {getCountryName(user.country)}</p>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 pt-4">
                      <button onClick={() => openChatWithUser(user)} className="bg-gradient-to-r from-rose-500 to-pink-500 text-white transition font-black py-2.5 rounded-xl text-center flex items-center justify-center gap-2 text-xs">
                        <MessageCircle size={14} /> Chat Back
                      </button>
                      <button onClick={async () => {
                        await supabase.from('likes').insert({ liker_id: session.user.id, liked_id: user.id, action_type: 'like' });
                        toast.success("💥 It's a Match!");
                        openChatWithUser(user);
                      }} className="bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/30 dark:text-rose-400 text-rose-600 transition font-black py-2.5 rounded-xl text-center text-xs">
                        ❤️ Like Back
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- CHAT TAB --- */}
      {activeTab === 'chat' && (
        <ChatTab 
          session={session} 
          activeChatWith={selectedChatUser} 
          messages={messages} 
          sendMessage={sendMessage} 
          handleCardClick={handleCardClick}
        />
      )}

      {/* --- ALERTS TAB RENDERING --- */}
      {activeTab === 'alerts' && (
        <AlertsTab session={session} />
      )}
      
      {/* --- MY PROFILE TAB --- */}
      {activeTab === 'profile' && (
        <ProfileSetup session={session} onProfileUpdate={fetchMyProfile} />
      )}

      {/* 🌟 USER DETAILS MODAL POPUP */}
      {selectedDetailUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#121212] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-900 max-h-[90vh] overflow-y-auto relative">
            
            <button 
              onClick={() => setSelectedDetailUser(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full z-10 transition"
            >
              <X size={18} />
            </button>

            <div className="h-80 w-full relative bg-gray-200 dark:bg-gray-800">
              <img 
                src={selectedDetailUser.avatar_url || getAvatarUrl(selectedDetailUser.full_name)} 
                className="w-full h-full object-cover" 
                alt="Profile" 
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-12">
                <h3 className="text-2xl font-black text-white">{selectedDetailUser.full_name}, {selectedDetailUser.age || 'Age Not Set'}</h3>
                <p className="text-pink-300 font-bold text-sm">@{selectedDetailUser.username || 'username'}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                <MapPin className="text-pink-500 shrink-0" size={18} />
                <div>
                  <p className="text-[10px] uppercase font-black text-gray-400">Location Country</p>
                  <p className="text-sm font-bold">{getCountryName(selectedDetailUser.country)}</p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-1">
                <p className="text-xs font-black text-gray-400 uppercase flex items-center gap-1">
                  <Star size={12} className="text-pink-500"/> About Me
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium italic">
                  "{selectedDetailUser.bio || 'No bio written yet.'}"
                </p>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => {
                    openChatWithUser(selectedDetailUser);
                    setSelectedDetailUser(null);
                  }}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black py-3 rounded-xl hover:opacity-95 transition shadow-md flex items-center justify-center gap-2 text-sm"
                >
                  <MessageCircle size={16} /> Open Conversation Room
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}