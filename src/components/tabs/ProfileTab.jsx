import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Upload, User } from 'lucide-react';

function ProfileTab({ session, onProfileUpdate }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState({ full_name: '', username: '', age: '', gender: '', country: '', avatar_url: '' });
  const fileRef = useRef(null);

  useEffect(() => { getProfile(); }, [session]);

  const getProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (error && error.code!== 'PGRST116') console.log(error); // PGRST116 = no row found
    if (data) setProfile(data);
    setLoading(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
     .from('avatars')
     .upload(fileName, file, { upsert: true }); // upsert: purani pic replace ho jayegi

    if (uploadError) {
      alert(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    setProfile({...profile, avatar_url: data.publicUrl });
    setUploading(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    const updates = {
      id: session.user.id,
     ...profile,
      age: Number(profile.age), // number me convert
      updated_at: new Date()
    };
    const { error } = await supabase.from('profiles').upsert(updates);
    if (error) alert(error.message);
    else {
      alert("Profile updated! ✨");
      if(onProfileUpdate) onProfileUpdate();
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-[#121212] p-6 rounded-2xl shadow-md">
      <h2 className="text-xl font-bold mb-4 text-center text-pink-600 dark:text-pink-400">⚙️ CONFIGURE CORE PROFILE META</h2>

      {/* AVATAR SECTION */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-2">
          {profile.avatar_url
           ? <img src={profile.avatar_url} className="w-full h-full object-cover" />
            : <User className="w-12 h-12 text-gray-400 mx-auto mt-6" />
          }
        </div>
        <label className="cursor-pointer bg-pink-100 text-pink-600 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
          <Upload size={16} /> {uploading? 'Uploading...' : 'Upload Photo'}
          <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
        </label>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">👤 FULL NAME</label>
          <input type="text" value={profile.full_name || ''} onChange={(e) => setProfile({...profile, full_name: e.target.value })} className="w-full p-3 rounded-xl input-darkmode bg-gray-100 dark:bg-gray-800" placeholder="Your Name" required/>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">🆔 USERNAME</label>
          <input type="text" value={profile.username || ''} onChange={(e) => setProfile({...profile, username: e.target.value })} className="w-full p-3 rounded-xl input-darkmode bg-gray-100 dark:bg-gray-800" placeholder="unique_name" required/>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">🎂 AGE</label>
            <input type="number" value={profile.age || ''} onChange={(e) => setProfile({...profile, age: e.target.value })} className="w-full p-3 rounded-xl input-darkmode bg-gray-100 dark:bg-gray-800" placeholder="18" min="18"/>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">⚧️ GENDER</label>
            <select value={profile.gender || ''} onChange={(e) => setProfile({...profile, gender: e.target.value })} className="w-full p-3 rounded-xl input-darkmode bg-gray-100 dark:bg-gray-800">
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">🌍 SELECT REGIONAL COUNTRY</label>
          <input type="text" value={profile.country || ''} onChange={(e) => setProfile({...profile, country: e.target.value })} className="w-full p-3 rounded-xl input-darkmode bg-gray-100 dark:bg-gray-800" placeholder="India" />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold py-3 rounded-xl disabled:opacity-50">
          {loading? 'Saving...' : '💾 Commit & Save Profile Node'}
        </button>
      </form>
    </div>
  );
}
export default ProfileTab;