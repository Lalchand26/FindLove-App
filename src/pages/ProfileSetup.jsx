import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase'; // Path check kar lena apne hisab se
import { useNavigate } from 'react-router-dom';
import { Upload, User, X, Image, MapPin, Heart, Star, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Country options list as requested
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

export default function ProfileSetup({ session, onProfileUpdate }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Combined all fields securely
  const [profile, setProfile] = useState({ 
    full_name: '', 
    username: '', 
    age: '', 
    gender: '', 
    country: 'IN', // Default India
    bio: '',
    looking_for: '',
    avatar_url: '' 
  });
  
  const [photos, setPhotos] = useState([]);
  const fileRef = useRef(null);
  const multiFileRef = useRef(null);

  const getProfile = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          username: data.username || '',
          age: data.age || '',
          gender: data.gender || '',
          country: data.country || 'IN',
          bio: data.bio || '',
          looking_for: data.looking_for || '',
          avatar_url: data.avatar_url || ''
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPhotos = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (data) setPhotos(data);
  };

  useEffect(() => {
    getProfile();
    getPhotos();
  }, [session]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !session?.user?.id) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('profile-photos').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
      
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Avatar updated! 📸");
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleMultiPhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !session?.user?.id) return;
    if (photos.length + files.length > 6) { 
      toast.error("Max 6 photos allowed"); 
      return; 
    }

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `${session.user.id}/${Date.now()}_${i}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('profile-photos').upload(fileName, file);

        if (error) { 
          toast.error("Upload failed: " + error.message); 
          continue; 
        }

        const { data: { publicUrl } } = supabase.storage.from('profile-photos').getPublicUrl(fileName);
        await supabase.from('profile_photos').insert({
          user_id: session.user.id,
          url: publicUrl,
          is_main: photos.length === 0 && i === 0
        });
      }
      getPhotos();
      toast.success("Photos uploaded to gallery!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
    e.target.value = null;
  };

  const deletePhoto = async (id, url) => {
    try {
      await supabase.from('profile_photos').delete().eq('id', id);
      const path = url.split('/profile-photos/')[1];
      if (path) { 
        await supabase.storage.from('profile-photos').remove([path]); 
      }
      getPhotos();
      toast.success("Photo removed");
    } catch (err) { 
      toast.error("Failed to delete photo"); 
    }
  };

  const setMainPhoto = async (id, url) => {
    if (!session?.user?.id) return;
    try {
      await supabase.from('profile_photos').update({ is_main: false }).eq('user_id', session.user.id);
      await supabase.from('profile_photos').update({ is_main: true }).eq('id', id);
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', session.user.id);
      
      setProfile(prev => ({ ...prev, avatar_url: url }));
      getPhotos();
      toast.success("Main profile photo updated!");
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) {
      toast.error("Failed to set main photo");
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const updates = { 
        id: session.user.id, 
        ...profile, 
        age: profile.age ? Number(profile.age) : null, 
        updated_at: new Date() 
      };
      
      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      
      toast.success("FindLove Profile saved successfully! ✨");
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Log Out Handler
  const handleLogOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logged out successfully!");
      navigate('/'); // Logout ke baad login/home page par redirect
    } catch (err) {
      toast.error("Error logging out: " + err.message);
    }
  };

  // 🔥 Delete Account Handler
  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("⚠️ Are you absolutely sure you want to delete your FindLove account? This will erase your profile info permanently.");
    if (!confirmDelete) return;

    setLoading(true);
    try {
      // 1. Database profiles table se record saaf karo
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', session?.user?.id);

      if (profileError) throw profileError;

      // 2. Auth user session terminate karo
      await supabase.auth.signOut();
      toast.success("Account deleted successfully.");
      navigate('/');
    } catch (err) {
      toast.error("Error deleting account: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCountryName = (code) => COUNTRIES_LIST.find(c => c.code === code)?.name || code || 'Not set';

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-[#121212] p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-900 space-y-6">
      <h2 className="text-2xl font-black text-center text-pink-600 dark:text-pink-400 tracking-wide">
        💘 FindLove Settings
      </h2>

      {/* AVATAR DISPLAY */}
      <div className="flex flex-col items-center">
        <div className="w-28 h-28 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden mb-3 border-4 border-pink-100 dark:border-pink-950 shadow-inner relative group">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
          ) : (
            <User className="w-14 h-14 text-gray-400 mx-auto mt-6" />
          )}
        </div>
        <label className="cursor-pointer bg-pink-50 text-pink-600 dark:bg-pink-950/40 dark:text-pink-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-pink-100 transition shadow-sm">
          <Upload size={16} /> {uploading ? 'Uploading...' : 'Change Main Avatar'}
          <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
        </label>
      </div>

      {/* MULTI PHOTO GALLERY */}
      <div className="bg-gray-50 dark:bg-[#1a1a1a] p-4 rounded-xl">
        <label className="block text-xs font-black tracking-wider mb-2 text-gray-500 dark:text-gray-400 uppercase">
          🖼️ Photos Gallery ({photos.length}/6)
        </label>
        
        <div className="grid grid-cols-3 gap-2 mb-3">
          {photos.map((p) => (
            <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800">
              <img src={p.url} className="w-full h-full object-cover" alt="Gallery item" />
              <button type="button" onClick={() => setMainPhoto(p.id, p.url)} className={`absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded shadow text-white ${p.is_main ? 'bg-pink-500' : 'bg-gray-900/80 hover:bg-gray-900'}`}>
                {p.is_main ? 'Main' : 'Set Main'}
              </button>
              <button type="button" onClick={() => deletePhoto(p.id, p.url)} className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow transition">
                <X size={12}/>
              </button>
            </div>
          ))}
        </div>
        
        <label className="w-full cursor-pointer bg-white dark:bg-[#222] hover:bg-gray-100 dark:hover:bg-gray-800 border-2 border-dashed p-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 transition">
          <Image size={14} /> Add Multi Photos
          <input type="file" ref={multiFileRef} accept="image/*" multiple className="hidden" onChange={handleMultiPhotoUpload} disabled={uploading} />
        </label>
      </div>

      {/* CORE FIELDS FORM */}
      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div>
          <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">👤 FULL NAME</label>
          <input type="text" value={profile.full_name || ''} onChange={(e) => setProfile({...profile, full_name: e.target.value })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-transparent focus:outline-none focus:border-pink-500 dark:text-white font-medium text-sm" required/>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">🆔 USERNAME</label>
          <input type="text" value={profile.username || ''} onChange={(e) => setProfile({...profile, username: e.target.value })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-transparent focus:outline-none focus:border-pink-500 dark:text-white font-medium text-sm" required/>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">🎂 AGE</label>
            <input type="number" value={profile.age || ''} onChange={(e) => setProfile({...profile, age: e.target.value })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-transparent focus:outline-none focus:border-pink-500 dark:text-white font-medium text-sm" min="18"/>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">⚧️ GENDER</label>
            <select value={profile.gender || ''} onChange={(e) => setProfile({...profile, gender: e.target.value })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-transparent focus:outline-none focus:border-pink-500 dark:text-white font-medium text-sm">
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* COUNTRY SELECT DROPDOWN */}
        <div>
          <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 flex items-center gap-1"><MapPin size={12}/> COUNTRY LOCATION</label>
          <select value={profile.country || ''} onChange={(e) => setProfile({...profile, country: e.target.value })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-transparent focus:outline-none focus:border-pink-500 dark:text-white font-medium text-sm">
            <option value="">Select Country</option>
            {COUNTRIES_LIST.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 flex items-center gap-1"><Star size={12}/> ABOUT ME (BIO)</label>
          <textarea value={profile.bio || ''} onChange={(e) => setProfile({...profile, bio: e.target.value })} rows="2" placeholder="Tell something interesting about yourself..." className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-transparent focus:outline-none focus:border-pink-500 dark:text-white font-medium text-sm resize-none"/>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 flex items-center gap-1"><Heart size={12}/> LOOKING FOR</label>
          <select value={profile.looking_for || ''} onChange={(e) => setProfile({...profile, looking_for: e.target.value })} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-transparent focus:outline-none focus:border-pink-500 dark:text-white font-medium text-sm">
            <option value="">Looking For</option>
            <option value="Dating">Dating</option>
            <option value="Friendship">Friendship</option>
            <option value="Relationship">Relationship</option>
            <option value="Chat">Just Chat</option>
          </select>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition shadow-md flex items-center justify-center gap-2 mt-2 text-sm">
          <Save size={16}/> {loading ? 'Saving Parameters...' : 'Save Complete Profile'}
        </button>

        {/* 🚀 LOG OUT & DELETE ACCOUNT SECTION */}
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800/60 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleLogOut}
            className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800/80 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
          >
            🚪 Log Out
          </button>

          <button
            type="button"
            onClick={handleDeleteAccount}
            className="w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
          >
            🗑️ Delete Account
          </button>
        </div>
      </form>
    </div>
  );
}