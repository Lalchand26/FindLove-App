import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import DiscoverTab from '../components/tabs/DiscoverTab';
import ChatTab from '../components/tabs/ChatTab';
import ProfileSetup from './ProfileSetup';
import AlertsTab from '../components/tabs/AlertsTab';
import LiveTab from '../components/tabs/LiveTab';
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

// Prices kept above $10 to avoid NOWPayments "less than minimal" 400 error
// Prices increased to safely stay above NOWPayments minimum limit and avoid 400 errors
// Prices increased to safely stay above NOWPayments minimum limit and avoid 400 errors
const coinPackages = [
  { id: 1, coins: 1000, price: 20.00, oldPrice: 40.00 }, // Safe from 11.71 USDT limit
  { id: 2, coins: 2500, price: 40.00, oldPrice: 80.00 },
  { id: 3, coins: 5000, price: 75.00, oldPrice: 150.00 },
  { id: 4, coins: 10000, price: 140.00, oldPrice: 280.00 },
];
export default function Dashboard({ session, setCurrentChatUser, messages, sendMessage }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('discover');
  const [likesReceived, setLikesReceived] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [selectedDetailUser, setSelectedDetailUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  
  // Coin Purchase Modal State
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Fetch Current Logged-In User Profile
  const fetchUserProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!error && data) {
        setUserProfile(data);
      }
    } catch (err) {
      console.error("Profile Fetch Error:", err);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

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

  // Viewer Join Stream Trigger Callback
  const handleJoinLive = (stream) => {
    setActiveTab('live');
    if (stream?.room_name || stream?.id) {
      const room = stream.room_name || stream.id;
      navigate(`/viewer-live/${room}`);
    }
  };

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

      const { error } = await supabase.functions.invoke('livekit-token', {
        body: {
          roomName: targetUser.id,
          participantName: visitorName,
          visitorId: user.id,
          targetUserId: targetUser.id
        }
      });

      if (error) {
        let detailedError = error.message;
        try {
          const bodyError = await error.context?.json();
          if (bodyError?.error) detailedError = bodyError.error;
        } catch (_) {}

        console.error("Visit Error:", detailedError);
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

  // Handle NOWPayments Checkout
 // Handle NOWPayments Checkout
  const handlePayment = async () => {
    try {
      setPaymentLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first!");
        setPaymentLoading(false);
        return;
      }

      // Supabase Edge Function call without strict pay_currency restriction
      const { data, error } = await supabase.functions.invoke('nowpayments-ipn/create-payment', {
        body: {
          price: selectedPackage.price,
          userId: user.id,
          description: `${selectedPackage.coins} Coins Package`
          // Removed 'pay_currency' to let NOWPayments handle minimum thresholds safely
        }
      });

      if (error) throw error;

      if (data && data.invoice_url) {
        window.location.href = data.invoice_url;
      } else {
        toast.error("Failed to create payment link.");
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast.error("Something went wrong!");
    } finally {
      setPaymentLoading(false);
    }
  };

  const getAvatarUrl = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random&color=fff`;
  const getCountryName = (code) => COUNTRIES_LIST.find(c => c.code === code)?.name || code;

  return (
    <div className="max-w-6xl mx-auto p-4 min-h-screen pb-28">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 justify-center bg-gray-100/80 dark:bg-gray-800 p-1.5 rounded-2xl max-w-3xl mx-auto mb-8 shadow-sm">
        <button onClick={() => handleTabClick('discover')} className={`px-3.5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'discover' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>🔍 Discover</button>
        <button onClick={() => handleTabClick('live')} className={`px-3.5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'live' ? 'bg-red-500 text-white shadow-sm' : 'text-red-500 hover:bg-red-50'}`}>🔴 Live</button>
        <button onClick={() => handleTabClick('likes')} className={`px-3.5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'likes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>❤️ Likes</button>
        <button onClick={() => handleTabClick('chat')} className={`px-3.5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'chat' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>💬 Chat</button>
        <button onClick={() => handleTabClick('alerts')} className={`px-3.5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'alerts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>🔔 Alerts</button>
        <button onClick={() => handleTabClick('profile')} className={`px-3.5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'profile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>⚙️ Profile</button>
        
        {/* 🪙 Buy Coins Tab Button */}
        <button onClick={() => handleTabClick('coins')} className={`px-3.5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'coins' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'}`}>🪙 Buy Coins</button>
      </div>

      {/* Discover Tab */}
      {activeTab === 'discover' && (
        <DiscoverTab session={session} openChatWithUser={openChatWithUser} handleCardClick={handleCardClick} />
      )}

      {/* Live Tab */}
      {activeTab === 'live' && (
        <LiveTab session={session} onJoinLive={handleJoinLive} />
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

      {/* 🪙 Buy Coins Tab (Price List View) */}
      {activeTab === 'coins' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <h2 className="text-center text-2xl font-black mb-6">Choose a Coin Package 🪙</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {coinPackages.map((pkg) => (
              <div 
                key={pkg.id} 
                className="bg-white dark:bg-[#1a1a1a] border dark:border-gray-800 p-6 rounded-3xl shadow-sm text-center flex flex-col justify-between"
              >
                <div>
                  <div className="text-3xl font-black text-amber-500 mb-2">{pkg.coins} 🪙</div>
                  <div className="text-gray-400 text-sm mb-4">Get instant coins to chat & unlock perks</div>
                </div>
                <div>
                  <div className="mb-4">
                    <span className="line-through text-gray-400 text-sm mr-2">${pkg.oldPrice.toFixed(2)}</span>
                    <span className="text-2xl font-black text-emerald-500">${pkg.price.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedPackage(pkg)}
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-black py-3 rounded-2xl shadow-md hover:opacity-90 transition"
                  >
                    Select Package
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coin Purchase Option Modal */}
      {selectedPackage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPackage(null)}>
          <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-sm rounded-3xl p-6 relative shadow-2xl border dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedPackage(null)} 
              className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 p-2 rounded-full hover:bg-gray-200 transition"
            >
              <X size={18} />
            </button>
            
            <h3 className="text-xl font-black text-center mb-6">Select Purchase Option</h3>
            
            <div className="flex justify-between items-center my-4 py-2 border-b dark:border-gray-800 text-sm">
              <span className="text-gray-500">You will get</span>
              <span className="font-black text-amber-500 text-lg">{selectedPackage.coins} 🪙</span>
            </div>

            <div className="flex justify-between items-center my-4 py-2 border-b dark:border-gray-800 text-sm">
              <span className="text-gray-500">Package price</span>
              <div>
                <span className="line-through text-gray-400 mr-2">${selectedPackage.oldPrice.toFixed(2)}</span>
                <span className="font-black text-emerald-500 text-lg">${selectedPackage.price.toFixed(2)}</span>
              </div>
            </div>

            <button 
              onClick={handlePayment}
              disabled={paymentLoading}
              className="w-full mt-6 bg-black dark:bg-white text-white dark:text-black font-black py-3.5 rounded-2xl shadow-lg hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              {paymentLoading ? "Processing..." : "Pay with USDT (TRC20)"}
            </button>
          </div>
        </div>
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