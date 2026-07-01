import { Helmet } from 'react-helmet-async';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import ChatTab from '../components/tabs/ChatTab';
import AdminDashboard from './AdminDashboard';
import { MoreVertical, Flag, Ban, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';

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

export default function Dashboard({ session }) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  
  const [activeTab, setActiveTab] = useState('discover');
  const [usersList, setUsersList] = useState([]);
  const [likesReceived, setLikesReceived] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportingUserId, setReportingUserId] = useState(null);

  const [myProfile, setMyProfile] = useState({
    id: '',
    full_name: '',
    username: '',
    age: '',
    gender: '',
    country: '',
    bio: '',
    interests: '',
    avatar_url: '',
    role: 'user'
  });

  const [viewingProfile, setViewingProfile] = useState(null);
  const [isEditingOwnProfile, setIsEditingOwnProfile] = useState(true);

  const ADMIN_EMAIL = 'lalchandpahan88@gmail.com';

  // 👇 ADMIN CHECK - Sabse pehle
  useEffect(() => {
    const checkAdmin = async () => {
      if (!session?.user?.id) {
        setCheckingRole(false);
        return;
      }

      const { data } = await supabase
       .from('profiles')
       .select('role')
       .eq('id', session.user.id)
       .single();

      if (data?.role === 'admin' || session.user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      }
      setCheckingRole(false);
    };

    checkAdmin();
  }, [session?.user?.id, session?.user?.email]);

  // 1. Fetch My Profile
  const fetchMyProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (data) {
      setMyProfile(data);
      if (!data.full_name || !data.avatar_url) {
        setIsProfileComplete(false);
      } else {
        setIsProfileComplete(true);
      }
    } else if (error) {
      console.error("Fetch profile error:", error.message);
    }
  }, [session?.user?.id]);

  // 2. Fetch Discover Users - Blocked users filter
  const fetchDiscoverUsers = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      
      const { data: myActions } = await supabase
        .from('likes')
        .select('liked_id')
        .eq('liker_id', session.user.id)
        .eq('action_type', 'like');

      const { data: myBlocks } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', session.user.id);

      const { data: blockedMe } = await supabase
        .from('blocked_users')
        .select('blocker_id')
        .eq('blocked_id', session.user.id);

      const excludedIds = new Set([
        ...(myActions?.map(a => a.liked_id) || []),
        ...(myBlocks?.map(b => b.blocked_id) || []),
        ...(blockedMe?.map(b => b.blocker_id) || []),
        session.user.id
      ]);

      let query = supabase
        .from('profiles')
        .select('*')
        .not('full_name', 'is', null)
        .not('avatar_url', 'is', null);

      if (excludedIds.size > 0) {
        query = query.not('id', 'in', `(${Array.from(excludedIds).join(',')})`);
      }
      if (selectedCountry) {
        query = query.eq('country', selectedCountry);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      console.error("Fetch Users Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, selectedCountry]);

  // 3. Fetch Who Liked Me
  const fetchWhoLikedMe = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('id, liker_id, created_at, is_match')
        .eq('liked_id', session.user.id)
        .eq('action_type', 'like')
        .eq('is_match', false)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;

      if (!likesData || likesData.length === 0) {
        setLikesReceived([]);
        return;
      }

      const likerIds = likesData.map(like => like.liker_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', likerIds)
        .not('full_name', 'is', null);

      if (profilesError) throw profilesError;

      const mergedData = likesData
        .map(like => ({
          ...like,
          profiles: profilesData.find(p => p.id === like.liker_id) || null
        }))
        .filter(item => item.profiles !== null);

      setLikesReceived(mergedData);
    } catch (err) {
      console.error("Error fetching likes:", err.message);
      setLikesReceived([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  // 4. Fetch Like Count
  const fetchMyReactionCounts = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const { count: likes } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('liked_id', session.user.id)
        .eq('action_type', 'like');

      setLikeCount(likes || 0);
    } catch (err) {
      console.error("Error fetching counters:", err.message);
    }
  }, [session?.user?.id]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      fetchMyProfile();
      fetchMyReactionCounts();
    }
  }, [fetchMyProfile, fetchMyReactionCounts, isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      if (activeTab === 'discover') {
        fetchDiscoverUsers();
      } else if (activeTab === 'likes') {
        fetchWhoLikedMe();
      }
    }
  }, [activeTab, fetchDiscoverUsers, fetchWhoLikedMe, isAdmin]);

  const viewUserProfile = (user) => {
    setViewingProfile(user);
    setIsEditingOwnProfile(false);
    setActiveTab('profile');
  };

  const backToMyProfile = () => {
    setViewingProfile(null);
    setIsEditingOwnProfile(true);
  };

  const handlePhotoUpload = async (e) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const filePath = `profile-pics/${session.user.id}-${Date.now()}`;

      const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filePath);
      setMyProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("📸 Photo uploaded successfully!");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      full_name: myProfile.full_name,
      username: myProfile.username,
      age: myProfile.age ? parseInt(myProfile.age) : null,
      gender: myProfile.gender,
      country: myProfile.country,
      bio: myProfile.bio,
      interests: myProfile.interests,
      avatar_url: myProfile.avatar_url,
    });
    if (!error) {
      toast.success("Profile Saved Successfully!");
      setIsProfileComplete(true);
      setActiveTab('discover');
    } else {
      toast.error("Error saving profile: " + error.message);
    }
  };

  const deleteAccount = async () => {
    if (window.confirm("Delete account permanently? This cannot be undone.")) {
      await supabase.from('profiles').delete().eq('id', session.user.id);
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  const handleNearbyClick = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    setLoading(true);
    navigator.geolocation.getCurrentPosition(() => {
      toast.success("Location accessed! Showing nearby matches");
      fetchDiscoverUsers();
    }, () => setLoading(false));
  };

  // 👇 Like only - Skip/Dislike hata diya
  const handleLike = async (targetId) => {
    setUsersList(prev => prev.filter(u => u.id !== targetId));
    if (activeTab === 'likes') {
      setLikesReceived(prev => prev.filter(item => item.liker_id !== targetId));
    }

    const { data, error } = await supabase.from('likes').upsert({
      liker_id: session.user.id,
      liked_id: targetId,
      action_type: 'like'
    }).select().single();

    if (error) {
      toast.error("Error: " + error.message);
      fetchDiscoverUsers();
      return;
    }

    if (data?.is_match) {
      toast.success("🎉 It's a Match!");
      openChatWithUser({ id: targetId });
    } else {
      toast("Liked!", { icon: '❤️' });
    }

    fetchMyReactionCounts();
    if (activeTab === 'likes') fetchWhoLikedMe();
  };

  const openReportModal = (userId) => {
    setReportingUserId(userId);
    setReportReason('');
    setShowReportModal(true);
    setOpenMenuId(null);
  };

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) {
      toast.error('Report reason likho');
      return;
    }

    try {
      await supabase.from('reports').insert({
        reporter_id: session.user.id,
        reported_user_id: reportingUserId,
        reason: reportReason,
        status: 'pending'
      });

      toast.success('User reported successfully');
      setShowReportModal(false);
      setReportReason('');
      setReportingUserId(null);
      setUsersList(prev => prev.filter(u => u.id !== reportingUserId));
    } catch (error) {
      console.error('Report failed:', error);
      toast.error('Report fail ho gaya');
    }
  };

  const handleBlockUser = async (userId, userName) => {
    if (!window.confirm(`${userName} ko block karna hai?`)) return;

    try {
      await supabase.from('blocked_users').insert({
        blocker_id: session.user.id,
        blocked_id: userId
      });

      toast.success(`${userName} blocked successfully`);
      setOpenMenuId(null);
      setUsersList(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Block failed:', error);
      toast.error('Block fail ho gaya');
    }
  };

  const openChatWithUser = (user) => {
    setSelectedChatUser(user);
    setActiveTab('chat');
  };

  const getAvatarUrl = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`;

  const displayProfile = viewingProfile || myProfile;

  // 👇 LOADING STATE
  if (checkingRole) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto animate-pulse text-pink-500" />
          <p className="mt-2 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // 👇 ADMIN HAI TO AdminDashboard DIKHAO
  if (isAdmin) {
    return <AdminDashboard session={session} />;
  }

  // 👇 NORMAL USER DASHBOARD
  return (
    <>
      <Helmet>
        <title>{activeTab === 'discover' ? 'Discover New Matches' :
                activeTab === 'likes' ? 'People Who Liked You' :
                activeTab === 'chat' ? 'Chat with Matches' :
                activeTab === 'profile' ? 'My Profile Settings' :
                'FindLove'} | FindLove</title>
      </Helmet>

      <div className="max-w-6xl mx-auto p-4 min-h-screen bg-gray-50/30 rounded-3xl mt-4 shadow-sm border-gray-100">
        {!isProfileComplete && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-2xl text-xs font-semibold text-yellow-700 shadow-sm flex items-center gap-2">
            ⚠️ <strong>Profile Incomplete:</strong> Add your name and upload a photo in the "Profile" tab to appear on other screens
          </div>
        )}

        {/* Like Counter */}
        <div className="flex justify-center mb-6">
          <div className="bg-green-50 text-green-700 font-black px-5 py-3 rounded-2xl shadow-sm border border-green-100 flex items-center text-xs uppercase tracking-wider">
            ❤️ Likes Received: <span className="text-lg ml-2 font-black text-green-800">{likeCount}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 justify-center bg-gray-100/80 p-1.5 rounded-2xl max-w-2xl mx-auto mb-8 border border-gray-200/50">
          <button onClick={() => { setActiveTab('discover'); setSelectedChatUser(null); backToMyProfile(); }} className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'discover' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>🔍 Discover</button>
          <button onClick={() => { setActiveTab('likes'); setSelectedChatUser(null); backToMyProfile(); }} className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'likes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>❤️ Who Liked Me</button>
          <button onClick={() => setActiveTab('chat')} className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'chat' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>💬 Chat Box</button>
          <button onClick={() => { setActiveTab('profile'); setSelectedChatUser(null); backToMyProfile(); }} className={`px-5 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'profile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>⚙️ Profile</button>
        </div>

        {activeTab === 'discover' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 border border-gray-100 rounded-2xl gap-4">
              <button onClick={handleNearbyClick} className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs px-5 py-3 rounded-xl shadow-sm active:scale-95 transition">📍 Sync Nearby Coordinates</button>
              <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="w-full sm:w-auto bg-gray-50 border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none cursor-pointer">
                <option value="">🌍 Filter by Country (All)</option>
                {COUNTRIES_LIST.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="text-center py-20 text-xs font-bold text-gray-400 animate-pulse">🔍 Scanning database pool...</div>
            ) : usersList.length === 0 ? (
              <div className="text-center py-20 bg-white border border-dashed rounded-3xl text-xs font-bold text-gray-400">
                🎉 You're all caught up!<br/>
                <span className="text-xs">No new profiles. Check back later or expand your filters</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {usersList.map(u => (
                  <div key={u.id} className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between p-4 space-y-4 relative hover:shadow-md hover:border-pink-200 transition-all duration-300">
                    
                    {/* 3-Dot Menu */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === u.id ? null : u.id);
                      }}
                      className="absolute top-6 right-6 z-10 bg-white/90 hover:bg-white p-2 rounded-full shadow-md transition"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-700" />
                    </button>

                    {/* Dropdown Menu */}
                    {openMenuId === u.id && (
                      <div 
                        className="absolute top-16 right-6 z-20 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openReportModal(u.id)}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <Flag className="w-4 h-4 text-yellow-600" />
                          Report User
                        </button>
                        <button
                          onClick={() => handleBlockUser(u.id, u.full_name)}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition border-t border-gray-100"
                        >
                          <Ban className="w-4 h-4" />
                          Block User
                        </button>
                      </div>
                    )}

                    <div onClick={() => viewUserProfile(u)} className="cursor-pointer">
                      <img src={u.avatar_url || getAvatarUrl(u.full_name)} alt={u.full_name} className="w-full h-48 object-cover rounded-2xl" />
                      <div className="mt-3">
                        <h3 className="font-black text-gray-900 text-sm">👤 {u.full_name || 'Anonymous Object'}</h3>
                        <p className="text-xs text-gray-500">@{u.username || 'no-username'}</p>
                        <p className="text-xs bg-gray-100 px-2.5 py-1 rounded-md inline-block font-extrabold text-gray-500 mt-1">📍 {u.country || 'Global Node'}</p>
                      </div>
                    </div>
                    {/* Sirf Like + Chat - Skip/Dislike hata diya */}
                    <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleLike(u.id)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs py-2.5 rounded-xl transition">❤️ Like</button>
                      <button onClick={() => openChatWithUser(u)} className="bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs py-2.5 rounded-xl shadow-sm transition">💬 Chat</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'likes' && (
          <div className="space-y-6">
            <h2 className="text-md font-black text-gray-900 px-2 uppercase tracking-wide">
              ❤️ Profiles Who Liked You <span className="text-pink-500">({likesReceived.length})</span>
            </h2>
            {loading ? (
              <div className="text-center py-20 text-xs text-gray-400 font-bold">📖 Reading records...</div>
            ) : likesReceived.length === 0 ? (
              <div className="text-center py-20 bg-white border border-dashed rounded-3xl text-xs font-bold text-gray-400">
                😓 No one has liked you yet<br/>
                <span className="text-xs">Keep updating your profile to attract matches!</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {likesReceived.map((item) => {
                  const profile = item.profiles;
                  if (!profile) return null;
                  return (
                    <div key={item.id} className="bg-white border border-gray-100 rounded-3xl p-4 flex flex-col justify-between items-center text-center space-y-3 hover:shadow-md hover:border-pink-200 transition">
                      <div onClick={() => viewUserProfile(profile)} className="cursor-pointer w-full">
                        <img src={profile.avatar_url || getAvatarUrl(profile.full_name || profile.username)} alt={profile.full_name} className="w-24 h-24 rounded-full object-cover border-2 border-pink-400 mx-auto" />
                        <div>
                          <h4 className="font-black text-gray-900 text-sm">👤 {profile.full_name || profile.username || 'Anonymous User'}</h4>
                          <p className="text-xs bg-gray-100 px-2.5 py-1 rounded-md inline-block font-extrabold text-gray-500 mt-1">📍 {profile.country || 'Global'}</p>
                          <p className="text-xs text-gray-400 mt-2">⏰ Liked {new Date(item.created_at).toLocaleDateString('en-IN')}</p>
                        </div>
                      </div>
                      {/* Sirf Like Back - Pass hata diya */}
                      <div className="w-full">
                        <button onClick={() => handleLike(profile.id)} className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs py-2.5 rounded-xl shadow-sm transition">❤️ Like Back</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && <ChatTab session={session} activeChatWith={selectedChatUser} />}

        {activeTab === 'profile' && (
          <div className="max-w-md mx-auto bg-white border border-gray-100 rounded-3xl p-6 space-y-5 shadow-sm">
            {!isEditingOwnProfile && (
              <button onClick={backToMyProfile} className="text-xs font-black text-gray-500 hover:text-gray-800 flex items-center gap-1">← Back to My Profile</button>
            )}
            <h2 className="text-base font-black text-gray-900 uppercase tracking-tight text-center">{isEditingOwnProfile ? '⚙️ Configure Core Profile Meta' : `👤 ${displayProfile.full_name}'s Profile`}</h2>
            <div className="flex flex-col items-center space-y-3">
              <img src={displayProfile.avatar_url || getAvatarUrl(displayProfile.full_name)} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-pink-100 shadow-inner" />
              {isEditingOwnProfile && (
                <label className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-black text-xs px-4 py-2 rounded-xl cursor-pointer transition">
                  {uploading ? "📤 Uploading bits..." : "📸 Change Display Photo"}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                </label>
              )}
            </div>

            {isEditingOwnProfile ? (
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">👤 Full Name</label>
                  <input type="text" value={myProfile.full_name || ''} onChange={(e) => setMyProfile({...myProfile, full_name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 text-xs font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400" required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">🆔 Username</label>
                  <input type="text" value={myProfile.username || ''} onChange={(e) => setMyProfile({...myProfile, username: e.target.value})} className="w-full bg-gray-50 border border-gray-200 text-xs font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400" placeholder="@username" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">🎂 Age</label>
                    <input type="number" value={myProfile.age || ''} onChange={(e) => setMyProfile({...myProfile, age: e.target.value})} className="w-full bg-gray-50 border border-gray-200 text-xs font-semibold p-3 rounded-xl focus:outline-none" placeholder="25" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">⚧️ Gender</label>
                    <select value={myProfile.gender || ''} onChange={(e) => setMyProfile({...myProfile, gender: e.target.value})} className="w-full bg-gray-50 border border-gray-200 text-xs font-semibold p-3 rounded-xl focus:outline-none">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">🌍 Select Regional Country</label>
                  <select value={myProfile.country || ''} onChange={(e) => setMyProfile({...myProfile, country: e.target.value})} className="w-full bg-gray-50 border border-gray-200 text-xs font-semibold p-3 rounded-xl focus:outline-none" required>
                    <option value="">-- 🌐 Choose Country Node --</option>
                    {COUNTRIES_LIST.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">📝 Bio / About Me</label>
                  <textarea value={myProfile.bio || ''} onChange={(e) => setMyProfile({...myProfile, bio: e.target.value})} className="w-full bg-gray-50 border border-gray-200 text-xs font-semibold p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400" rows="3" placeholder="Tell us about yourself..." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">💖 Interests</label>
                  <input type="text" value={myProfile.interests || ''} onChange={(e) => setMyProfile({...myProfile, interests: e.target.value})} className="w-full bg-gray-50 border border-gray-200 text-xs font-semibold p-3 rounded-xl focus:outline-none" placeholder="Music, Travel, Coding..." />
                </div>
                <div className="pt-4 space-y-2">
                  <button type="submit" className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs py-3 rounded-xl shadow-sm transition active:scale-95">💾 Commit & Save Profile Node</button>
                  <button type="button" onClick={deleteAccount} className="w-full bg-rose-50 text-rose-600 hover:bg-rose-100 font-black text-xs py-3 rounded-xl transition">🗑️ Destruct & Delete Account Permanently</button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-left">
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-xs font-black text-gray-400 uppercase">👤 Full Name</p>
                  <p className="text-sm font-semibold text-gray-800">{displayProfile.full_name || 'Not set'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-xs font-black text-gray-400 uppercase">🆔 Username</p>
                  <p className="text-sm font-semibold text-gray-800">@{displayProfile.username || 'no-username'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-xs font-black text-gray-400 uppercase">🎂 Age</p>
                    <p className="text-sm font-semibold text-gray-800">{displayProfile.age || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-xs font-black text-gray-400 uppercase">⚧️ Gender</p>
                    <p className="text-sm font-semibold text-gray-800">{displayProfile.gender || 'N/A'}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-xs font-black text-gray-400 uppercase">🌍 Country</p>
                  <p className="text-sm font-semibold text-gray-800">{displayProfile.country || 'Global'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-xs font-black text-gray-400 uppercase">📝 Bio</p>
                  <p className="text-sm font-semibold text-gray-800">{displayProfile.bio || 'No bio yet'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-xs font-black text-gray-400 uppercase">💖 Interests</p>
                  <p className="text-sm font-semibold text-gray-800">{displayProfile.interests || 'No interests added'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReportModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-500" />
                Report User
              </h3>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Report ka reason likho... e.g. Spam, Fake profile, Inappropriate content"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                rows="4"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportSubmit}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}