import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

function ProfileTab({ session, onProfileUpdate }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ full_name: '', username: '', age: '', gender: '', country: '', bio: '', interests: '', avatar_url: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

      if (data) setProfile(data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
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

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-md border-gray-100">
      <style>{`::placeholder{color:#6b7280 !important; opacity:1 !important;}`}</style> {/* ye line important hai */}
      
      <h2 className="text-xl font-bold mb-4 text-center text-pink-600">CONFIGURE CORE PROFILE META</h2>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-500">👤 FULL NAME</label>
          <input
            type="text"
            value={profile.full_name || ''}
            onChange={(e) => setProfile({...profile, full_name: e.target.value })}
            style={{color: 'black', backgroundColor: 'white', border: '2px solid #e5e7eb', padding: '12px', borderRadius: '12px', width: '100%'}}
            placeholder="Anish"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-500">🆔 USERNAME</label>
          <input
            type="text"
            value={profile.username || ''}
            onChange={(e) => setProfile({...profile, username: e.target.value })}
            style={{color: 'black', backgroundColor: 'white', border: '2px solid #e5e7eb', padding: '12px', borderRadius: '12px', width: '100%'}}
            placeholder="username"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-500">🎂 AGE</label>
            <input
              type="number"
              value={profile.age || ''}
              onChange={(e) => setProfile({...profile, age: e.target.value })}
              style={{color: 'black', backgroundColor: 'white', border: '2px solid #e5e7eb', padding: '12px', borderRadius: '12px', width: '100%'}}
              placeholder="19"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-500">⚧️ GENDER</label>
            <input
              type="text"
              value={profile.gender || ''}
              onChange={(e) => setProfile({...profile, gender: e.target.value })}
              style={{color: 'black', backgroundColor: 'white', border: '2px solid #e5e7eb', padding: '12px', borderRadius: '12px', width: '100%'}}
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
            style={{color: 'black', backgroundColor: 'white', border: '2px solid #e5e7eb', padding: '12px', borderRadius: '12px', width: '100%'}}
            placeholder="🇮🇳 India"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-500">📝 BIO / ABOUT ME</label>
          <textarea
            value={profile.bio || ''}
            onChange={(e) => setProfile({...profile, bio: e.target.value })}
            style={{color: 'black', backgroundColor: 'white', border: '2px solid #e5e7eb', padding: '12px', borderRadius: '12px', width: '100%', minHeight: '80px'}}
            placeholder="About you..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-500">💖 INTERESTS</label>
          <input
            type="text"
            value={profile.interests || ''}
            onChange={(e) => setProfile({...profile, interests: e.target.value })}
            style={{color: 'black', backgroundColor: 'white', border: '2px solid #e5e7eb', padding: '12px', borderRadius: '12px', width: '100%'}}
            placeholder="Music, Travel..."
          />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-3 rounded-xl shadow-lg">
          💾 Commit & Save Profile Node
        </button>
      </form>
    </div>
  );
}

export default ProfileTab;
