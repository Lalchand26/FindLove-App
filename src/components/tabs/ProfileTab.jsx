import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

function ProfileTab({ session, onProfileUpdate }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ full_name: '', country: '', avatar_url: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
       .from('profiles')
       .select('full_name, country, avatar_url')
       .eq('id', session.user.id)
       .single();

      if (data) setProfile(data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      let { error: uploadError } = await supabase.storage
       .from('avatars')
       .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } = supabase.storage
       .from('avatars')
       .getPublicUrl(filePath);

      setProfile({...profile, avatar_url: publicUrl });
      alert("Photo uploaded! Click Save to confirm changes.");
    } catch (error) {
      alert("Error uploading image: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        full_name: profile.full_name,
        country: profile.country,
        avatar_url: profile.avatar_url,
        updated_at: new Date(),
      });

      if (error) throw error;
      alert("Profile updated seamlessly! ✨");
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm("🚨 Are you absolutely sure? This will delete your FindLove account and data permanently.");
    if (!confirmDelete) return;

    setLoading(true);
    try {
      await supabase.from('profiles').delete().eq('id', session.user.id);
      await supabase.auth.signOut();
      alert("Account permanently closed.");
      navigate('/login');
    } catch (err) {
      alert("Error deleting account: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 👇 YE CLASS SAB INPUT ME USE KARENGE
  const inputClass = "w-full p-3 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 border-2 border-gray-200 focus:border-pink-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border-gray-100 dark:border-gray-700">
      <h2 className="text-xl font-bold mb-4 text-center text-pink-600">Edit FindLove Profile</h2>
      
      <form onSubmit={handleSaveProfile} className="space-y-4">
        {/* Profile Pic Slot */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 border-2 border-pink-400 relative shadow-inner">
            <img src={profile.avatar_url || 'https://via.placeholder.com/150'} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          
          <label className="mt-2 text-xs font-semibold bg-pink-100 dark:bg-pink-950/40 text-pink-600 px-3 py-1.5 rounded-full cursor-pointer hover:bg-pink-200">
            {uploading? 'Uploading... ⏳' : '📸 Change Photo'}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="hidden" />
          </label>
        </div>

        {/* Inputs */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Full Name</label>
          <input 
            type="text" 
            required 
            value={profile.full_name || ''} 
            onChange={(e) => setProfile({...profile, full_name: e.target.value })} 
            className={inputClass}
            placeholder="Enter your name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Country</label>
          <input 
            type="text" 
            placeholder="e.g. India" 
            value={profile.country || ''} 
            onChange={(e) => setProfile({...profile, country: e.target.value })} 
            className={inputClass}
          />
        </div>

        {/* Action Controls */}
        <button type="submit" disabled={loading} className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2.5 rounded-xl shadow transition">
          {loading? 'Saving changes...' : '💾 Save Profile'}
        </button>
      </form>

      <hr className="my-6 border-gray-200 dark:border-gray-700" />

      {/* Delete Zone */}
      <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200">
        <label className="text-xs text-red-600 dark:text-red-400 mb-2 font-medium">Danger Zone: Yeh action undone nahi kiya ja sakta.</label>
        <button onClick={handleDeleteAccount} className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 rounded-lg transition">
          🗑️ Delete Account Permanently
        </button>
      </div>
    </div>
  );
}

export default ProfileTab;
