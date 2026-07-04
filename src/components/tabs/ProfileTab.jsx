import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

function ProfileTab({ session, onProfileUpdate }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ full_name: '', username: '', age: '', gender: '', country: '', avatar_url: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      setLoading(true);
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (data) setProfile(data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    color: 'black', // 👈 FORCE BLACK
    backgroundColor: 'white', // 👈 FORCE WHITE BG
    border: '2px solid #e5e7eb',
    padding: '12px',
    borderRadius: '12px',
    width: '100%',
    fontSize: '16px'
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-md">
      <style>{`input::placeholder, textarea::placeholder { color: #9ca3af !important; }`}</style>
      
      <h2 className="text-xl font-bold mb-4 text-center">⚙️ CONFIGURE CORE PROFILE META</h2>

      <div className="flex flex-col items-center mb-4">
        <img src={profile.avatar_url || 'https://via.placeholder.com/150'} className="w-28 h-28 rounded-full border-4 border-pink-300 object-cover" />
        <button className="mt-2 px-4 py-1.5 bg-gray-100 rounded-full text-sm font-semibold">📸 Change Display Photo</button>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-500">👤 FULL NAME</label>
          <input type="text" value={profile.full_name || ''} onChange={(e) => setProfile({...profile, full_name: e.target.value })} style={{...inputStyle, borderColor: '#fda4af'}} placeholder="Hi" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-500">🆔 USERNAME</label>
          <input type="text" value={profile.username || ''} onChange={(e) => setProfile({...profile, username: e.target.value })} style={inputStyle} placeholder="@Anish701" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-500">🎂 AGE</label>
            <input type="number" value={profile.age || ''} onChange={(e) => setProfile({...profile, age: e.target.value })} style={inputStyle} placeholder="19" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-500">⚧️ GENDER</label>
            <input type="text" value={profile.gender || ''} onChange={(e) => setProfile({...profile, gender: e.target.value })} style={inputStyle} placeholder="Male" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-500">🌍 SELECT REGIONAL COUNTRY</label>
          <input type="text" value={profile.country || ''} onChange={(e) => setProfile({...profile, country: e.target.value })} style={inputStyle} placeholder="India" />
        </div>

        <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl">💾 Commit & Save Profile Node</button>
      </form>
    </div>
  );
}

export default ProfileTab;
