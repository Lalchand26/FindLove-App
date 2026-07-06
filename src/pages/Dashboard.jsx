import { Helmet } from 'react-helmet-async';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import ChatTab from '../components/tabs/ChatTab';
import { MoreVertical, Flag, Ban, Trash2, Star, MapPin, Heart, X, MessageCircle } from 'lucide-react';
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

  const [activeTab, setActiveTab] = useState('discover');
  const [usersList, setUsersList] = useState([]);
  const [likesReceived, setLikesReceived] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [selectedChatUser, setSelectedChatUser] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportingUserId, setReportingUserId] = useState(null);

  const [myProfile, setMyProfile] = useState({
    id: '', full_name: '', username: '', age: '', gender: '',
    country: '', bio: '', interests: '', avatar_url: ''
  });

  const [viewingProfile, setViewingProfile] = useState(null);
  const [isEditingOwnProfile, setIsEditingOwnProfile] = useState(true);

  const fetchMyProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    if (data) {
      setMyProfile(data);
      setIsProfileComplete(!!(data.full_name && data.avatar_url));
    } else if (error) console.error("Fetch profile error:", error.message);
  }, [session?.user?.id]);

  const fetchGalleryPhotos = useCallback(async (userId = session?.user?.id) => {
    if (!userId) return;
    const { data } = await supabase.from('profile_photos').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    setPhotos(data || []);
  }, [session?.user?.id]);

  const fetchDiscoverUsers = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      const { data: myActions } = await supabase.from('likes').select('liked_id').eq('liker_id', session.user.id);
      const { data: myBlocks } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', session.user.id);
      const { data: blockedMe } = await supabase.from('blocked_users').select('blocker_id').eq('blocked_id', session.user.id);
      
      const excludedIds = new Set([
        ...(myActions?.map(a => a.liked_id) || []),
        ...(myBlocks?.map(b => b.blocked_id) || []),
        ...(blockedMe?.map(b => b.blocker_id) || []), 
        session.user.id
      ]);

      let query = supabase.from('profiles').select('*').not('full_name', 'is', null).not('avatar_url', 'is', null);
      if (excludedIds.size > 0) query = query.not('id', 'in', `(${Array.from(excludedIds).join(',')})`);
      if (selectedCountry) query = query.eq('country', selectedCountry);
      
      const { data, error } = await query;
      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      console.error("Fetch Users Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, selectedCountry]);

  const fetchWhoLikedMe = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      const { data: likesData } = await supabase.from('likes').select('id, liker_id, created_at, is_match').eq('liked_id', session.user.id).eq('action_type', 'like').eq('is_match', false).order('created_at', { ascending: false });
      if (!likesData || likesData.length === 0) { setLikesReceived([]); return; }
      
      const likerIds = likesData.map(like => like.liker_id);
      const { data: profilesData } = await supabase.from('profiles').select('*').in('id', likerIds).not('full_name', 'is', null);
      
      const mergedData = likesData.map(like => ({
        ...like, 
        profiles: profilesData.find(p => p.id === like.liker_id) || null
      })).filter(item => item.profiles !== null);
      
      setLikesReceived(mergedData);
    } catch (err) {
      console.error("Error fetching likes:", err.message);
      setLikesReceived([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  const fetchMyReactionCounts = useCallback(async () => {
    if (!session?.user?.id) return;
    const { count: likes } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('liked_id', session.user.id).eq('action_type', 'like');
    setLikeCount(likes || 0);
  }, [session?.user?.id]);

  const handleLike = async (targetId) => {
    if (!session?.user?.id) return;
    try {
      // Check for mutual match
      const { data: mutual } = await supabase.from('likes').select('*').eq('liker_id', targetId).eq('liked_id', session.user.id).eq('action_type', 'like').maybeSingle();
      
      if (mutual) {
        await supabase.from('likes').update({ is_match: true }).eq('id', mutual.id);
        await supabase.from('likes').insert({ liker_id: session.user.id, liked_id: targetId, action_type: 'like', is_match: true });
        toast.success("🎉 It's a Mutual Match! Chat unlocked.");
      } else {
        await supabase.from('likes').insert({ liker_id: session.user.id, liked_id: targetId, action_type: 'like' });
        toast.success("❤️ Liked securely!");
      }
      setUsersList(prev => prev.filter(u => u.id !== targetId));
      fetchMyReactionCounts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleReject = (targetId) => {
    setUsersList(prev => prev.filter(u => u.id !== targetId));
    toast.secondary("👎 Skipped profile");
  };

  const uploadGalleryPhoto = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;
      const fileName = `${session.user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage.from('profile-photos').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('profile-photos').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      const isFirst = photos.length === 0;
      const { data: newPhoto } = await supabase.from('profile_photos').insert({ user_id: session.user.id, url: publicUrl, is_main: isFirst }).select().single();

      if(isFirst){
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
        setMyProfile(prev => ({...prev, avatar_url: publicUrl }));
      }
      setPhotos([newPhoto,...photos]);
      toast.success("📸✨ Photo added to Gallery!");
    } catch (err) {
      toast.error("❌ Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const setMainPhoto = async (id, url) => {
    await supabase.from('profile_photos').update({ is_main: false }).eq('user_id', session.user.id);
    await supabase.from('profile_photos').update({ is_main: true }).eq('id', id);
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', session.user.id);
    setMyProfile(prev => ({...prev, avatar_url: url }));
    setPhotos(photos.map(p => ({...p, is_main: p.id === id})));
    toast.success("✅ Main photo updated!");
  };

  const deletePhoto = async (id, url) => {
    const path = url.split('/profile-photos/')[1];
    await supabase.storage.from('profile-photos').remove([path]);
    await supabase.from('profile_photos').delete().eq('id', id);
    setPhotos(photos.filter(p => p.id !== id));
    toast.success("🗑️ Photo deleted");
  };

  useEffect(() => { const handleOutsideClick = () => setOpenMenuId(null); window.addEventListener('click', handleOutsideClick); return () => window.removeEventListener('click', handleOutsideClick); }, []);
  useEffect(() => { fetchMyProfile(); fetchMyReactionCounts(); fetchGalleryPhotos(); }, [fetchMyProfile, fetchMyReactionCounts, fetchGalleryPhotos]);
  useEffect(() => { if (activeTab === 'discover') fetchDiscoverUsers(); else if (activeTab === 'likes') fetchWhoLikedMe(); }, [activeTab, fetchDiscoverUsers, fetchWhoLikedMe]);

  const viewUserProfile = async (user) => {
    setViewingProfile(user); setIsEditingOwnProfile(false); setActiveTab('profile');
    await fetchGalleryPhotos(user.id);
  };
  const backToMyProfile = () => { setViewingProfile(null); setIsEditingOwnProfile(true); fetchGalleryPhotos(session?.user?.id); };

  const handlePhotoUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;
      const filePath = `profile-pics/${session.user.id}-${Date.now()}`;
      const { error: uploadError } = await supabase.storage.from('photos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('photos').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setMyProfile(prev => ({...prev, avatar_url: publicUrl }));
      toast.success("📸✨ Main Photo uploaded! Save profile now 🎉");
    } catch (err) {
      toast.error("❌ Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').upsert({ id: session.user.id,...myProfile, age: myProfile.age? parseInt(myProfile.age) : null });
    if (!error) { toast.success("✅🎉 Profile Saved! 🚀✨"); setIsProfileComplete(true); setActiveTab('discover'); }
    else { toast.error("❌ Error: " + error.message); }
  };

  const getAvatarUrl = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`;
  const displayProfile = viewingProfile || myProfile;

  return (
    <>
      <Helmet><title>{activeTab === 'discover'? 'Discover' : activeTab === 'likes'? 'Likes' : activeTab === 'chat'? 'Chat' : 'Profile'} | FindLove</title></Helmet>
      <div className="max-w-6xl mx-auto p-4 min-h-screen bg-gray-50/30 rounded-3xl mt-4 shadow-sm border-gray-100">
        {!isProfileComplete && (<div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-2xl text-xs font-semibold text-yellow-700">⚠️ Add name and photo to appear on other screens</div>)}
        
        <div className="flex justify-center mb-6">
          <div className="bg-green-50 text-green-700 font-black px-5 py-3 rounded-2xl shadow-sm">
            ❤️ Likes Received: <span className="text-lg ml-2">{likeCount}</span>
          </div>
        </div>
        
        {/* TAB SWITCHER NAVBAR */}
        <div className="flex flex-wrap gap-1.5 justify-center bg-gray-100/80 p-1.5 rounded-2xl max-w-2xl mx-auto mb-8">
          <button onClick={() => { setActiveTab('discover'); setSelectedChatUser(null); backToMyProfile(); }} className={`px-5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'discover'? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>🔍 Discover</button>
          <button onClick={() => { setActiveTab('likes'); setSelectedChatUser(null); backToMyProfile(); }} className={`px-5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'likes'? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>❤️ Who Liked Me</button>
          <button onClick={() => setActiveTab('chat')} className={`px-5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'chat'? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>💬 Chat</button>
          <button onClick={() => { setActiveTab('profile'); setSelectedChatUser(null); backToMyProfile(); }} className={`px-5 py-2 text-xs font-black rounded-xl transition ${activeTab === 'profile'? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>⚙️ Profile</button>
        </div>

        {/* DISCOVER SCREEN LAYER */}
        {activeTab === 'discover' && (
          <div>
            <div className="flex justify-between items-center max-w-sm mx-auto mb-6">
              <select 
                value={selectedCountry} 
                onChange={(e) => setSelectedCountry(e.target.value)} 
                className="w-full bg-white border border-gray-200 text-sm rounded-xl p-2.5 outline-none font-bold text-gray-700"
              >
                <option value="">🌍 All Countries</option>
                {COUNTRIES_LIST.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="text-center py-12 text-sm text-gray-500 font-bold">Loading active profiles near you...</div>
            ) : usersList.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 font-bold">🎉 Wow! You've reviewed all available profiles right now.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {usersList.map((user) => (
                  <div key={user.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col justify-between group transform transition hover:-translate-y-1">
                    <div className="relative cursor-pointer" onClick={() => viewUserProfile(user)}>
                      <img 
                        src={user.avatar_url || getAvatarUrl(user.full_name)} 
                        alt={user.full_name} 
                        className="w-full h-72 object-cover" 
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pt-12">
                        <h3 className="text-white font-black text-lg">{user.full_name}, {user.age || '🔥'}</h3>
                        <p className="text-gray-300 text-xs flex items-center gap-1 mt-0.5">
                          <MapPin size={12} /> {COUNTRIES_LIST.find(c => c.code === user.country)?.name || 'International'}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-white space-y-3">
                      <p className="text-xs text-gray-500 line-clamp-2 min-h-[2rem] font-medium">{user.bio || "No description provided."}</p>
                      <div className="flex justify-between items-center gap-2 pt-2 border-t border-gray-50">
                        <button onClick={() => handleReject(user.id)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 p-2.5 rounded-xl font-bold text-xs flex justify-center items-center gap-1 transition">
                          <X size={14} /> Skip
                        </button>
                        <button onClick={() => handleLike(user.id)} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white p-2.5 rounded-xl font-bold text-xs flex justify-center items-center gap-1 shadow-sm shadow-rose-200 transition">
                          <Heart size={14} /> Like
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* WHO LIKED ME SCREEN LAYER */}
        {activeTab === 'likes' && (
          <div>
            {loading ? (
              <div className="text-center py-12 text-sm text-gray-500 font-bold">Checking incoming connections...</div>
            ) : likesReceived.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 font-bold">No hidden likes yet. Keep enhancing your profile cards!</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {likesReceived.map((item) => {
                  const suitor = item.profiles;
                  if (!suitor) return null;
                  return (
                    <div key={item.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col justify-between group">
                      <div className="relative">
                        <img 
                          src={suitor.avatar_url || getAvatarUrl(suitor.full_name)} 
                          alt={suitor.full_name} 
                          className="w-full h-64 object-cover filter blur-md hover:blur-none transition duration-300 cursor-pointer" 
                          onClick={() => viewUserProfile(suitor)}
                        />
                        <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-4">
                          <h3 className="text-white font-black text-base">{suitor.full_name} liked you!</h3>
                          <p className="text-gray-200 text-[11px]">Match instantly to start chatting</p>
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50/50 flex gap-2">
                        <button onClick={() => handleLike(suitor.id)} className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl font-bold text-xs flex justify-center items-center gap-1 transition">
                          <Heart size={12} /> Match back
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'chat' && <ChatTab session={session} activeChatWith={selectedChatUser} />}

        {/* PROFILE TAB MANAGEMENT */}
        {activeTab === 'profile' && (
          <div className="max-w-md mx-auto bg-white border border-gray-100 rounded-3xl p-6 space-y-5 shadow-sm">
            {!isEditingOwnProfile && (<button onClick={backToMyProfile} className="text-xs font-black text-gray-500 hover:text-gray-800 transition">← Back to My Profile</button>)}
            <h2 className="text-base font-black text-gray-900 text-center">{isEditingOwnProfile? '⚙️ Configure Profile' : `👤 ${displayProfile.full_name}'s Profile`}</h2>
            <div className="flex flex-col items-center space-y-3">
              <img src={displayProfile.avatar_url || getAvatarUrl(displayProfile.full_name)} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-pink-100" />
              {isEditingOwnProfile && (<label className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-black text-xs px-4 py-2 rounded-xl cursor-pointer">{uploading? "📤 Uploading..." : "📸 Change Main Photo"}<input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} /></label>)}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-xs font-black text-gray-400 uppercase mb-3">📸 Profile Gallery {isEditingOwnProfile && `(${photos.length}/9)`}</h3>
              {isEditingOwnProfile && (
                <label className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer flex justify-center items-center">
                  {uploading? "📤 Uploading..." : "+ Add More Photos"}
                  <input type="file" accept="image/*" onChange={uploadGalleryPhoto} className="hidden" disabled={uploading || photos.length >= 9} />
                </label>
              )}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {photos.map(photo => (
                  <div key={photo.id} className="relative group overflow-hidden rounded-xl">
                    <img src={photo.url} alt="Gallery item" className={`w-full h-24 object-cover border-2 ${photo.is_main? 'border-rose-500' : 'border-gray-200'}`} />
                    {isEditingOwnProfile && (
                      <div className="absolute inset-0 bg-black/60 hidden group-hover:flex flex-col justify-center items-center gap-1.5 transition duration-200">
                        {!photo.is_main && <button type="button" onClick={() => setMainPhoto(photo.id, photo.url)} className="bg-green-500 text-[10px] px-2 py-1 rounded text-white font-bold flex items-center gap-1"><Star size={10}/> Set Main</button>}
                        <button type="button" onClick={() => deletePhoto(photo.id, photo.url)} className="bg-red-500 text-[10px] px-2 py-1 rounded text-white font-bold flex items-center gap-1"><Trash2 size={10}/> Delete</button>
                      </div>
                    )}
                    {photo.is_main && <span className="absolute top-1 left-1 bg-rose-500 text-white text-[10px] px-2 rounded-full font-bold">Main</span>}
                  </div>
                ))}
              </div>
            </div>

            {isEditingOwnProfile ? (
              <form onSubmit={saveProfile} className="space-y-4 pt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500">Full Name</label>
                  <input type="text" value={myProfile.full_name || ''} onChange={e => setMyProfile({...myProfile, full_name: e.target.value})} className="border border-gray-200 rounded-xl p-2 text-sm outline-none w-full" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500">Bio Description</label>
                  <textarea value={myProfile.bio || ''} onChange={e => setMyProfile({...myProfile, bio: e.target.value})} className="border border-gray-200 rounded-xl p-2 text-sm outline-none w-full h-20 resize-none" placeholder="Tell us something about yourself..." />
                </div>
                <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm py-2.5 rounded-xl transition shadow-sm shadow-rose-200">
                  Save Changes
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-left pt-2">
                <p className="text-sm text-gray-600"><span className="font-bold text-gray-800">Age:</span> {displayProfile.age || 'Not specified'}</p>
                <p className="text-sm text-gray-600"><span className="font-bold text-gray-800">Bio:</span> {displayProfile.bio || 'No bio shared yet.'}</p>
                <button onClick={() => openChatWithUser(displayProfile)} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm py-2.5 rounded-xl transition flex justify-center items-center gap-2">
                  <MessageCircle size={16} /> Send Direct Message
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}