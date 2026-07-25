import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 1. Added useNavigate
import { supabase } from '../lib/supabase';
import DiscoverTab from '../components/tabs/DiscoverTab';
import ChatTab from '../components/tabs/ChatTab';
import ProfileSetup from './ProfileSetup';
import AlertsTab from '../components/tabs/AlertsTab';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const COUNTRIES_LIST = [
  { code: 'IN', name: '🇮🇳 India' }, { code: 'US', name: '🇺🇸 United States' },
  { code: 'GB', name: '🇬🇧 United Kingdom' }, { code: 'CA', name: '🇨🇦 Canada' },
  { code: 'AU', name: '🇦🇺 Australia' }, { code: 'DE', name: '🇩🇪 Germany' },
  { code: 'FR', name: '🇫🇷 France' }, { code: 'BR', name: '🇧🇷 Brazil' },
  { code: 'MX', name: '🇲🇽 Mexico' }, { code: 'ES', name: '🇪🇸 Spain' },
  { code: 'IT', name: '🇮🇹 Italy' }, { code: 'NL', name: '🇳🇱 Netherlands' },
  { code: 'SE', name: '🇸🇪 Sweden' }, { code: 'AE', name: '🇦🇪 UAE' },
  { code: 'SG', name: '🇸🇬 Singapore' },
];

export default function Dashboard({ session, setCurrentChatUser, messages, sendMessage }) {
  const navigate = useNavigate(); // 👈 2. Router hook
  const [activeTab, setActiveTab] = useState('discover');
  const [likesReceived, setLikesReceived] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [selectedDetailUser, setSelectedDetailUser] = useState(null);

  // 🚀 3. Master Admin Auto-Redirect to /admin
  useEffect(() => {
    const userEmail = session?.user?.email?.trim().toLowerCase();
    if (userEmail === 'lalchandpahan88@gmail.com') {
      navigate('/admin', { replace: true });
    }
  }, [session, navigate]);

  useEffect(() => { 
    document.title = `${activeTab.toUpperCase()} | CityCrossed`; 
  }, [activeTab]);

  const handleTabClick = (tabName) => setActiveTab(tabName);

  const openUserModal = (targetUser) => setSelectedDetailUser(targetUser);

  const handleCardClick = async (targetUser) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return toast.error("Please login first");
      
      if (user.id === targetUser.id) {
        setSelectedDetailUser(targetUser);
        return;
      }

      const rawEmail = user.email || '';
      const emailUsername = rawEmail ? rawEmail.split('@')[0] : '';

      const visitorName = (
        user.user_metadata?.full_name || 
        user.user_metadata?.name || 
        user.user_metadata?.username || 
        emailUsername || 
        'Someone'
      ).trim();

      const { data, error } = await supabase.functions.invoke('send-visit-email', {
        body: {
          visitorId: user.id,
          targetUserId: targetUser.id,
          visitorName: visitorName
        }
      });

      if (error) {
        let detailedError = error.message;
        try {
          const bodyError = await error.context?.json();
          if (bodyError?.error) detailedError = bodyError.error;
        } catch (_) {}

        console.error("Visit Error:", detailedError);
      } else {
        console.log("Visit logged successfully ✅", data);
      }
    } catch (err) {
      console.error("Unexpected error logging visit:", err);
    } finally {
      setSelectedDetailUser(targetUser);
    }
  };

  const openChatWithUser = (targetUser) => {
    setSelectedChatUser(targetUser);
    if (setCurrentChatUser) setCurrentChatUser(targetUser);
    setActiveTab('chat');
  };

  const fetchWhoLikedMe = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data: likesData } = await supabase
        .from('likes')
        .select('liker_id')
        .eq('liked_id', session.user.id)
        .eq('action_type', 'like');

      if (!likesData?.length) return setLikesReceived([]);
      
      const likerIds = likesData.map(item => item.liker_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', likerIds);

      setLikesReceived(profilesData?.filter(u => !(u.email || '').includes('admin@gmail.com')) || []);
    } catch (error) { 
      toast.error("Could not load likes"); 
    } finally { 
      setLoading(false); 
    }
  }, [session?.user?.id]);

  useEffect(() => { 
    if (activeTab === 'likes') fetchWhoLikedMe(); 
  }, [activeTab, fetchWhoLikedMe]);

  const getAvatarUrl = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff`;
  const getCountryName = (code) => COUNTRIES_LIST.find(c => c.code === code)?.name || code;

  return (
    <div className="max-w-6xl mx-auto p-4 min-h-screen">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 justify-center bg-gray-100/80 dark:bg-gray-800 p-1.5 rounded-2xl max-w-2xl mx-auto mb-8">
        <button onClick={() => handleTabClick('discover')} className={`px-5 py-2 text-xs font-black rounded-xl ${activeTab === 'discover' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>🔍 Discover</button>
        <button onClick={() => handleTabClick('likes')} className={`px-5 py-2 text-xs font-black rounded-xl ${activeTab === 'likes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>❤️ Who Liked Me</button>
        <button onClick={() => handleTabClick('chat')} className={`px-5 py-2 text-xs font-black rounded-xl ${activeTab === 'chat' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>💬 Chat</button>
        <button onClick={() => handleTabClick('alerts')} className={`px-5 py-2 text-xs font-black rounded-xl ${activeTab === 'alerts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>🔔 Alerts</button>
        <button onClick={() => handleTabClick('profile')} className={`px-5 py-2 text-xs font-black rounded-xl ${activeTab === 'profile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>⚙️ Profile</button>
      </div>

      {/* Discover Tab */}
      {activeTab === 'discover' && (
        <DiscoverTab session={session} openChatWithUser={openChatWithUser} handleCardClick={handleCardClick} />
      )}
      
      {/* Likes Tab */}
      {activeTab === 'likes' && (
        <div className="space-y-6">
          <h2 className="text-center text-lg font-black">People Who Liked You ({likesReceived.length})</h2>
          {loading ? (
            <p className="text-center animate-pulse">🔄 Loading...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {likesReceived.map((user) => (
                <div key={user.id} className="bg-white dark:bg-[#1a1a1a] border rounded-3xl shadow-sm overflow-hidden">
                  <div className="p-4 cursor-pointer" onClick={() => handleCardClick(user)}>
                    <img src={user.avatar_url || getAvatarUrl(user.full_name)} className="w-full h-72 object-cover rounded-2xl" alt={user.full_name} />
                  </div>
                  <div className="p-4">
                    <h3 className="font-black text-lg">{user.full_name}, {user.age}</h3>
                    <button onClick={() => openChatWithUser(user)} className="w-full mt-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black py-2.5 rounded-xl text-xs">💬 Chat Back</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <ChatTab session={session} activeChatWith={selectedChatUser} messages={messages} sendMessage={sendMessage} handleCardClick={handleCardClick} />
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <AlertsTab 
          session={session} 
          setSelectedUser={setSelectedDetailUser}
          handleCardClick={setSelectedDetailUser}
          setActiveTab={setActiveTab} 
        />
      )}
      
      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <ProfileSetup session={session} setActiveTab={setActiveTab} />
      )}

      {/* User Detail Modal */}
      {selectedDetailUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDetailUser(null)}>
          <div className="bg-white dark:bg-[#121212] w-full max-w-md rounded-3xl overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedDetailUser(null)} className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full z-10"><X size={18} /></button>
            <img src={selectedDetailUser.avatar_url || getAvatarUrl(selectedDetailUser.full_name)} className="w-full h-80 object-cover" alt={selectedDetailUser.full_name} />
            <div className="p-6">
              <h3 className="text-2xl font-black">{selectedDetailUser.full_name}, {selectedDetailUser.age}</h3>
              <p className="text-sm text-gray-500">@{selectedDetailUser.username}</p>
              <p className="mt-2 text-sm">📍 {getCountryName(selectedDetailUser.country)}</p>
              <button onClick={() => { openChatWithUser(selectedDetailUser); setSelectedDetailUser(null); }} className="w-full mt-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black py-3 rounded-xl">💬 Open Conversation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}