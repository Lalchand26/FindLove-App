import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

function ProfileTab({ session, onProfileUpdate }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ full_name: '', username: '', age: '', gender: '', country: '', avatar_url: '' });

  useEffect(() => { getProfile(); }, [session]);

  const getProfile = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) setProfile(data);
    setLoading(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.from('profiles').upsert({ id: session.user.id,...profile, updated_at: new Date() });
    if (error) alert(error.message); else { alert("Profile updated! ✨"); if(onProfileUpdate) onProfileUpdate(); }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-[#121212] p-6 rounded-2xl shadow-md">
      <h2 className="text-xl font-bold mb-4 text-center text-pink-600 dark:text-pink-400">⚙️ CONFIGURE CORE PROFILE META</h2>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">👤 FULL NAME</label>
          <input type="text" value={profile.full_name || ''} onChange={(e) => setProfile({...profile, full_name: e.target.value })} className="w-full p-3 rounded-xl input-darkmode" placeholder="A" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">🆔 USERNAME</label>
          <input type="text" value={profile.username || ''} onChange={(e) => setProfile({...profile, username: e.target.value })} className="w-full p-3 rounded-xl input-darkmode" placeholder="Hello" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">🎂 AGE</label>
            <input type="number" value={profile.age || ''} onChange={(e) => setProfile({...profile, age: e.target.value })} className="w-full p-3 rounded-xl input-darkmode" placeholder="2326" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">⚧️ GENDER</label>
            <input type="text" value={profile.gender || ''} onChange={(e) => setProfile({...profile, gender: e.target.value })} className="w-full p-3 rounded-xl input-darkmode" placeholder="Male" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">🌍 SELECT REGIONAL COUNTRY</label>
          <input type="text" value={profile.country || ''} onChange={(e) => setProfile({...profile, country: e.target.value })} className="w-full p-3 rounded-xl input-darkmode" placeholder="India" />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold py-3 rounded-xl">
          {loading? 'Saving...' : '💾 Commit & Save Profile Node'}
        </button>
      </form>
    </div>
  );
}
export default ProfileTab;
