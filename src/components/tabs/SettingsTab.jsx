// src/components/tabs/SettingsTab.jsx
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Upload, LogOut, Save } from 'lucide-react'

export default function SettingsTab() {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [gender, setGender] = useState('')
  const [country, setCountry] = useState('India')
  const [lookingFor, setLookingFor] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const { data: { user } = await supabase.auth.getUser() // FIXED: } } add kiya
      if (!user) return

      const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

      if (error) {
        console.error("Error loading profile:", error.message)
        return
      }

      if (!data) {
        const defaultProfile = { id: user.id, country: 'India' }
        const { error: insertError } = await supabase
        .from('profiles')
        .insert(defaultProfile)

        if (insertError) {
          console.error("Insert error:", insertError.message)
        } else {
          setCountry('India')
        }
        return
      }

      setFullName(data.full_name || '')
      setBio(data.bio || '')
      setGender(data.gender || '')
      setCountry(data.country || 'India')
      setLookingFor(data.looking_for || '')
      setAvatarUrl(data.avatar_url || '')
    } catch (err) {
      console.error(err)
    }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    try {
      setUploading(true)
      const { data: { user } = await supabase.auth.getUser() // FIXED
      if (!user) throw new Error('Not logged in')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { error } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      const { data } = await supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName)

      setAvatarUrl(data.publicUrl + `?t=${Date.now()}`)
    } catch (err) {
      alert(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    try {
      setLoading(true)
      const { data: { user } = await supabase.auth.getUser() // FIXED
      if (!user) return

      const { error } = await supabase
      .from('profiles')
      .upsert({
          id: user.id,
          full_name: fullName,
          bio,
          gender,
          country,
          looking_for: lookingFor,
          avatar_url: avatarUrl,
          updated_at: new Date()
        })

      if (error) throw error
      alert('Profile updated successfully ❤️')
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-[#121212] rounded-3xl shadow-xl p-6 border-pink-50 dark:border-gray-800 mb-10">
      <h2 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white">
        Settings ⚙️
      </h2>

      <div className="flex flex-col items-center mb-6">
        <img
          src={avatarUrl || 'https://placehold.co/150x150/EFEF/AAAAAA?text=Avatar'}
          alt="Avatar"
          className="w-32 h-32 rounded-full object-cover border-4 border-pink-400 shadow-md"
        />
        <label className={`mt-4 cursor-pointer bg-gradient-to-r from-pink-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-all flex items-center gap-2 ${uploading? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}>
          <Upload size={18} />
          {uploading? 'Uploading...' : 'Upload Photo'}
          <input hidden type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase px-1">Full Name</label>
          <input
            type="text"
            placeholder="Your Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 mt-1 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase px-1">Bio</label>
          <textarea
            placeholder="Tell us about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 mt-1 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase px-1">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 mt-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
            >
              <option value="">Select Gender</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase px-1">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 mt-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
            >
              <option value="India">India 🇮🇳</option>
              <option value="United States">United States 🇺🇸</option>
              <option value="United Kingdom">United Kingdom 🇬🇧</option>
              <option value="Canada">Canada 🇨🇦</option>
              <option value="Australia">Australia 🇦🇺</option>
              <option value="United Arab Emirates">UAE 🇦🇪</option>
              <option value="Singapore">Singapore 🇸🇬</option>
              <option value="Germany">Germany 🇩🇪</option>
              <option value="France">France 🇫🇷</option>
              <option value="Japan">Japan 🇯🇵</option>
              <option value="Brazil">Brazil 🇧🇷</option>
              <option value="Russia">Russia 🇷🇺</option>
              <option value="South Africa">South Africa 🇿🇦</option>
              <option value="Nepal">Nepal 🇳🇵</option>
              <option value="Bangladesh">Bangladesh 🇧🇩</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase px-1">Looking For</label>
          <input
            type="text"
            placeholder="e.g. Serious Relationship, Dating"
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 mt-1 transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div className="pt-4 space-y-3">
          <button
            onClick={handleSave}
            disabled={loading || uploading}
            className={`w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3.5 rounded-xl font-bold shadow-lg hover:opacity-95 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 ${
              (loading || uploading)? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Save size={18} />
            {loading? 'Saving Changes...' : 'Save Profile'}
          </button>

          <button
            onClick={handleLogout}
            className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}