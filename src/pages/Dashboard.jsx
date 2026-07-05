import { Helmet } from 'react-helmet-async';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import ChatTab from '../components/tabs/ChatTab';
import AdminDashboard from './AdminDashboard';
import { MoreVertical, Flag, Ban, Shield, Video } from 'lucide-react'; // 👈 Video icon add
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

export default function Dashboard({ session, setCurrentChatUser, initiateCall }) { // 👈 1. 2 props add kiye
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
    id: '', full_name: '', username: '', age: '', gender: '', country: '', bio: '', interests: '', avatar_url: '', role: 'user'
  });

  const [viewingProfile, setViewingProfile] = useState(null);
  const [isEditingOwnProfile, setIsEditingOwnProfile] = useState(true);
  const ADMIN_EMAIL = 'lalchandpahan88@gmail.com';

  useEffect(() => {
    const checkAdmin = async () => {
      if (!session?.user?.id) { setCheckingRole(false); return; }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (data?.role === 'admin' || session.user.email === ADMIN_EMAIL) setIsAdmin(true);
      setCheckingRole(false);
    };
    checkAdmin();
  }, [session?.user?.id, session?.user?.email]);

  const fetchMyProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (data) {
      setMyProfile(data);
      setIsProfileComplete(!!(data.full_name && data.avatar_url));
    }
  }, [session?.user?.id]);

  const fetchDiscoverUsers = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data: myActions } = await supabase.from('likes').select('liked_id').eq('liker_id', session.user.id).eq('action_type', 'like');
    const { data: myBlocks } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', session.user.id);
    const { data: blockedMe } = await supabase.from('blocked_users').select('blocker_id').eq('blocked_id', session.user.id);
    const excludedIds = new Set([...(myActions?.map(a => a.liked_id) || []), ...(myBlocks?.map(b => b.blocked_id) || []), ...(blockedMe?.map(b => b.blocker_id) || []), session.user.id]);
    let query = supabase.from('profiles').select('*').not('full_name', 'is', null).not('avatar_url', 'is', null);
    if (excludedIds.size > 0) query = query.not('id', 'in', `(${Array.from(excludedIds).join(',')})`);
    if (selectedCountry) query = query.eq('country', selectedCountry);
    const { data } = await query;
    setUsersList(data || []);
    setLoading(false);
  }, [session?.user?.id, selectedCountry]);

  const fetchWhoLikedMe = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data: likesData } = await supabase.from('likes').select('id, liker_id, created_at, is_match').eq('liked_id', session.user.id).eq('action_type', 'like').eq('is_match', false).order('created_at', { ascending: false });
    if (!likesData || likesData.length === 0) { setLikesReceived([]); setLoading(false); return; }
    const likerIds = likesData.map(like => like.liker_id);
    const { data: profilesData } = await supabase.from('profiles').select('*').in('id', likerIds).not('full_name', 'is', null);
    const mergedData = likesData.map(like => ({ ...like, profiles: profilesData.find(p => p.id === like.liker_id) })).filter(item => item.profiles);
    setLikesReceived(mergedData);
    setLoading(false);
  }, [session?.user?.id]);

  const fetchMyReactionCounts = useCallback(async () => {
    if (!session?.user?.id) return;
    const { count: likes } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('liked_id', session.user.id).eq('action_type', 'like');
    setLikeCount(likes || 0);
  }, [session?.user?.id]);

  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => { if (!isAdmin) { fetchMyProfile(); fetchMyReactionCounts(); } }, [fetchMyProfile, fetchMyReactionCounts, isAdmin]);
  useEffect(() => { if (!isAdmin) { if (activeTab === 'discover') fetchDiscoverUsers(); else if (activeTab === 'likes') fetchWhoLikedMe(); } }, [activeTab, fetchDiscoverUsers, fetchWhoLikedMe, isAdmin]);

  const viewUserProfile = (user) => { setViewingProfile(user); setIsEditingOwnProfile(false); setActiveTab('profile'); };
  const backToMyProfile = () => { setViewingProfile(null); setIsEditingOwnProfile(true); };

  const handlePhotoUpload = async (e) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const filePath = `profile-pics/${session.user.id}-${Date.now()}`;
      await supabase.storage.from('photos').upload(filePath, file);
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filePath);
      setMyProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("📸 Photo uploaded!");
    } catch (err) { toast.error("Upload failed: " + err.message); } 
    finally { setUploading(false); }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').upsert({ id: session.user.id, ...myProfile });
    if (!error) { toast.success("Profile Saved!"); setIsProfileComplete(true); setActiveTab('discover'); } 
    else { toast.error("Error: " + error.message); }
  };

  const deleteAccount = async () => {
    if (window.confirm("Delete account permanently?")) {
      await supabase.from('profiles').delete().eq('id', session.user.id);
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  const handleNearbyClick = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    setLoading(true);
    navigator.geolocation.getCurrentPosition(() => { toast.success("Location accessed!"); fetchDiscoverUsers(); }, () => setLoading(false));
  };

  const handleLike = async (targetId) => {
    setUsersList(prev => prev.filter(u => u.id !== targetId));
    if (activeTab === 'likes') setLikesReceived(prev => prev.filter(item => item.liker_id !== targetId));
    const { data } = await supabase.from('likes').upsert({ liker_id: session.user.id, liked_id: targetId, action_type: 'like' }).select().single();
    if (data?.is_match) { toast.success("🎉 It's a Match!"); openChatWithUser({ id: targetId }); } 
    else { toast("Liked!", { icon: '❤️' }); }
    fetchMyReactionCounts();
    if (activeTab === 'likes') fetchWhoLikedMe();
  };

  const openReportModal = (userId) => { setReportingUserId(userId); setReportReason(''); setShowReportModal(true); setOpenMenuId(null); };
  const handleReportSubmit = async () => {
    if (!reportReason.trim()) return toast.error('Reason likho');
    await supabase.from('reports').insert({ reporter_id: session.user.id, reported_user_id: reportingUserId, reason: reportReason, status: 'pending' });
    toast.success('Reported');
    setShowReportModal(false);
    setUsersList(prev => prev.filter(u => u.id !== reportingUserId));
  };

  const handleBlockUser = async (userId, userName) => {
    if (!window.confirm(`${userName} ko block karna hai?`)) return;
    await supabase.from('blocked_users').insert({ blocker_id: session.user.id, blocked_id: userId });
    toast.success(`${userName} blocked`);
    setOpenMenuId(null);
    setUsersList(prev => prev.filter(u => u.id !== userId));
  };

  // 👇 2. Yaha setCurrentChatUser bhi call karo
  const openChatWithUser = (user) => {
    setSelectedChatUser(user);
    setCurrentChatUser?.(user); // 👈 App.jsx ko batana padega
    setActiveTab('chat');
  };

  const getAvatarUrl = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`;
  const displayProfile = viewingProfile || myProfile;

  if (checkingRole) return <div className="flex h-screen items-center justify-center"><Shield className="w-12 h-12 animate-pulse text-pink-500" /></div>;
  if (isAdmin) return <AdminDashboard session={session} />;

  return (
    <>
      <Helmet><title>Dashboard | FindLove</title></Helmet>
      <div className="max-w-6xl mx-auto p-4 min-h-screen bg-gray-50/30 rounded-3xl mt-4 shadow-sm border-gray-100">
        {!isProfileComplete && <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-2xl text-xs font-semibold text-yellow-700">⚠️ <strong>Profile Incomplete:</strong> Add name and photo</div>}
        <div className="flex justify-center mb-6"><div className="bg-green-50 text-green-700 font-black px-5 py-3 rounded-2xl">❤️ Likes: <span className="text-lg ml-2">{likeCount}</span></div></div>
        
        <div className="flex flex-wrap gap-1.5 justify-center bg-gray-100/80 p-1.5 rounded-2xl max-w-2xl mx-auto mb-8">
          <button onClick={() => { setActiveTab('discover'); setSelectedChatUser(null); backToMyProfile(); }} className={`px-5 py-2 text-xs font-black rounded-xl ${activeTab === 'discover' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>🔍 Discover</button>
          <button onClick={() => { setActiveTab('likes'); setSelectedChatUser(null); backToMyProfile(); }} className={`px-5 py-2 text-xs font-black rounded-xl ${activeTab === 'likes' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>❤️ Who Liked Me</button>
          <button onClick={() => setActiveTab('chat')} className={`px-5 py-2 text-xs font-black rounded-xl ${activeTab === 'chat' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>💬 Chat Box</button>
          <button onClick={() => { setActiveTab('profile'); setSelectedChatUser(null); backToMyProfile(); }} className={`px-5 py-2 text-xs font-black rounded-xl ${activeTab === 'profile' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>⚙️ Profile</button>
        </div>

        {activeTab === 'discover' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 border rounded-2xl gap-4">
              <button onClick={handleNearbyClick} className="w-full sm:w-auto bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black text-xs px-5 py-3 rounded-xl">📍 Sync Nearby</button>
              <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="w-full sm:w-auto bg-gray-50 border rounded-xl px-4 py-2.5 text-xs font-bold">
                <option value="">🌍 All Countries</option>
                {COUNTRIES_LIST.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            {loading ? <div className="text-center py-20">🔍 Scanning...</div> : usersList.length === 0 ? <div className="text-center py-20">🎉 All caught up!</div> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {usersList.map(u => (
                  <div key={u.id} className="bg-white border rounded-3xl p-4 space-y-4 relative hover:shadow-md">
                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === u.id ? null : u.id); }} className="absolute top-6 right-6 bg-white/90 p-2 rounded-full"><MoreVertical className="w-4 h-4" /></button>
                    {openMenuId === u.id && (
                      <div className="absolute top-16 right-6 bg-white rounded-xl shadow-lg border z-20" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openReportModal(u.id)} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm"><Flag className="w-4 h-4 text-yellow-600" />Report</button>
                        <button onClick={() => handleBlockUser(u.id, u.full_name)} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 border-t"><Ban className="w-4 h-4" />Block</button>
                      </div>
                    )}
                    <div onClick={() => viewUserProfile(u)} className="cursor-pointer">
                      <img src={u.avatar_url || getAvatarUrl(u.full_name)} className="w-full h-48 object-cover rounded-2xl" />
                      <h3 className="font-black text-sm mt-3">👤 {u.full_name}</h3>
                      <p className="text-xs bg-gray-100 px-2.5 py-1 rounded-md inline-block mt-1">📍 {u.country}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}> {/* 👈 3 button kar diye */}
                      <button onClick={() => handleLike(u.id)} className="bg-rose-50 text-rose-600 font-black text-xs py-2.5 rounded-xl">❤️ Like</button>
                      <button onClick={() => openChatWithUser(u)} className="bg-gray-200 text-gray-700 font-black text-xs py-2.5 rounded-xl">💬 Chat</button>
                      <button onClick={() => initiateCall?.('video', u.id)} className="bg-blue-500 text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1"> <Video size={14}/> Call</button> {/* 👈 2. Call button add */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'likes' && (
          <div className="space-y-6">
            <h2 className="text-md font-black">❤️ Who Liked You ({likesReceived.length})</h2>
            {loading ? <div>📖 Loading...</div> : likesReceived.length === 0 ? <div>No likes yet</div> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {likesReceived.map((item) => {
                  const profile = item.profiles;
                  return (
                    <div key={item.id} className="bg-white border rounded-3xl p-4 text-center space-y-3">
                      <img src={profile.avatar_url || getAvatarUrl(profile.full_name)} className="w-24 h-24 rounded-full mx-auto" />
                      <h4 className="font-black text-sm">👤 {profile.full_name}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleLike(profile.id)} className="bg-rose-500 text-white font-black text-xs py-2.5 rounded-xl">❤️ Like Back</button>
                        <button onClick={() => openChatWithUser(profile)} className="bg-blue-500 text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1"><Video size={14}/>Call</button> {/* 👈 Call button here too */}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && <ChatTab session={session} activeChatWith={selectedChatUser} />} {/* 👈 ChatTab ko user milega */}

        {activeTab === 'profile' && (
          <div className="max-w-md mx-auto bg-white border rounded-3xl p-6">
            <h2 className="text-base font-black text-center mb-4">{isEditingOwnProfile ? '⚙️ My Profile' : `👤 ${displayProfile.full_name}'s Profile`}</h2>
            <img src={displayProfile.avatar_url || getAvatarUrl(displayProfile.full_name)} className="w-24 h-24 rounded-full mx-auto border-4 border-pink-100" />
            {isEditingOwnProfile && <input type="file" accept="image/*" onChange={handlePhotoUpload} />}
            {isEditingOwnProfile ? (
              <form onSubmit={saveProfile} className="space-y-4 mt-4">
                <input type="text" value={myProfile.full_name || ''} onChange={(e) => setMyProfile({...myProfile, full_name: e.target.value})} placeholder="Full Name" className="w-full bg-gray-50 border p-3 rounded-xl" required />
                <button type="submit" className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-black py-3 rounded-xl">💾 Save</button>
              </form>
            ) : (
              <div className="space-y-4 mt-4 text-left">
                <div className="bg-gray-50 p-3 rounded-xl"><p className="text-xs font-black">Name</p><p>{displayProfile.full_name}</p></div>
              </div>
            )}
          </div>
        )}

        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReportModal(false)}>
            <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Report User</h3>
              <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Reason..." className="w-full border rounded-lg p-3 text-sm" rows="4" />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowReportModal(false)} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                <button onClick={handleReportSubmit} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg">Submit</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
