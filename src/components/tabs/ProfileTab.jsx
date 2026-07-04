import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

function ProfileTab({ session, onProfileUpdate }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    username: '',
    age: '',
    gender: '',
    country: '',
    bio: '',
    interests: '',
    avatar_url: ''
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getProfile();
  }, [session]);

  const getProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
       .from('profiles')
       .select('*')
       .eq('id', session.user.id)
       .single();

      if (error && error.code!== 'PGRST116') throw error;
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
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      let { error: uploadError } = await supabase.storage
       .from('avatars')
       .upload(filePath, file, { upsert: true });

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
       ...profile,
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

  // MOBILE TEXT FIX - FORCE BLACK
  const inputStyle = {
    WebkitTextFillColor: 'black',
    color: 'black',
    backgroundColor: 'white',
    border: '2px solid #e5e7eb',
    padding: '12px',
    borderRadius: '12px',
    width: '100%',
    fontSize: '16px'
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-md border-gray-100">
      <style>{`input::placeholder, textarea::placeholder { color: #9ca3af!important; opacity: 1!important; }`}</style>

      <h2 className="text-xl font-bold mb-4 text-center text-pink-600">⚙️ CONFIGURE CORE PROFILE META</h2>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        {/* Profile Pic Slot */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 border-4 border-pink-400 relative shadow-inner">
            <img src={profile.avatar_url || 'https://via.placeholder.com/150'} alt="Avatar" className="w-full h-full object-cover" />
          </div>

          <label className="mt-2 text-sm font-semibold bg-pink-100 text-pink-600 px-4 py-2 rounded-full cursor-pointer hover:bg-pink-200">
            {uploading? 'Uploading... ⏳' : '📸 Change Display Photo'}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="hidden" />
          </label>
        </div>

        {/* Inputs */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-500">👤 FULL NAME</label>
          <input
            type="text"
            autoComplete="off"
            required
            value={profile.full_name || ''}
            onChange={(e) => setProfile({...profile, full_name: e.target.value })}
            style={{...inputStyle, borderColor: '#fda4af'}}
            placeholder="A"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-500">🆔 USERNAME</label>
          <input
            type="text"
            autoComplete="off"
            value={profile.username || ''}
            onChange={(e) => setProfile({...profile, username: e.target.value })}
            style={inputStyle}
            placeholder="Hello"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-500">🎂 AGE</label>
            <input
              type="number"
              value={profile.age || ''}
              onChange={(e) => setProfile({...profile, age: e.target.value })}
              style={inputStyle}
              placeholder="2326"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-500">⚧️ GENDER</label>
            <input
              type="text"
              value={profile.gender || ''}
              onChange={(e) => setProfile({...profile, gender: e.target.value })}
              style={inputStyle}
              placeholder="Male"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-500">🌍 SELECT REGIONAL COUNTRY</label>
          <input
            type="text"
            value={profile.country || ''}
            onChange={(e) => setProfile({...profile, country: e.target.value })}
            style={inputStyle}
            placeholder="India"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-500">📝 BIO / ABOUT ME</label>
          <textarea
            value={profile.bio || ''}
            onChange={(e) => setProfile({...profile, bio: e.target.value })}
            style={{...inputStyle, minHeight: '80px'}}
            placeholder="Write something about you..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-500">💖 INTERESTS</label>
          <input
            type="text"
            value={profile.interests || ''}
            onChange={(e) => setProfile({...profile, interests: e.target.value })}
            style={inputStyle}
            placeholder="Music, Travel, Coding"
          />
        </div>

        {/* Action Controls */}
        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 rounded-xl shadow-lg transition disabled:opacity-50">
          {loading? 'Saving changes...' : '💾 Commit & Save Profile Node'}
        </button>
      </form>

      <hr className="my-6 border-gray-200" />

      {/* Delete Zone */}
      <div className="p-3 bg-red-50 rounded-xl border-red-200">
        <p className="text-xs text-red-600 mb-2 font-medium">Danger Zone: Yeh action undone nahi kiya ja sakta.</p>
        <button onClick={handleDeleteAccount} className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 rounded-lg transition">
          🗑️ Delete Account Permanently
        </button>
      </div>
    </div>
  );
}

export default ProfileTab;
