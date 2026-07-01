import { useState, useRef, useEffect } from 'react'
import { Camera, MapPin, User, Edit3, Save, X, Trash2, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ProfileTab() {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const [user, setUser] = useState({
    id: '',
    fullName: '',
    age: '',
    gender: '',
    bio: '',
    location: '',
    interests: '',
    photo: ''
  })

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({...user})
  const [photoPreview, setPhotoPreview] = useState('')
  const fileInputRef = useRef(null)

  // Load user data on mount
  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      setLoading(true)
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) return
      setCurrentUser(authUser)

      // Fix:.maybeSingle() + upsert use karna
      const { data, error } = await supabase
       .from('profiles')
       .select('*')
       .eq('id', authUser.id)
       .maybeSingle()

      if (error) throw error

      // Agar profile nahi hai toh bana de
      if (!data) {
        const { data: newProfile, error: upsertError } = await supabase
         .from('profiles')
         .upsert({
            id: authUser.id,
            full_name: authUser.user_metadata?.full_name || '',
            avatar_url: authUser.user_metadata?.avatar_url || '',
            updated_at: new Date()
          })
         .select()
         .single()

        if (upsertError) throw upsertError

        const profileData = {
          id: newProfile.id,
          fullName: newProfile.full_name || '',
          age: newProfile.age || '',
          gender: newProfile.gender || '',
          bio: newProfile.bio || '',
          location: newProfile.location || 'Mumbai, Maharashtra',
          interests: newProfile.interests || '',
          photo: newProfile.avatar_url || ''
        }
        setUser(profileData)
        setFormData(profileData)
        setPhotoPreview(profileData.photo)
        return
      }

      const profileData = {
        id: data.id,
        fullName: data.full_name || '',
        age: data.age || '',
        gender: data.gender || '',
        bio: data.bio || '',
        location: data.location || 'Mumbai, Maharashtra',
        interests: data.interests || '',
        photo: data.avatar_url || ''
      }

      setUser(profileData)
      setFormData(profileData)
      setPhotoPreview(profileData.photo)
    } catch (err) {
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value})
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file ||!currentUser) return

    try {
      setUploading(true)

      // Preview dikhao
      setPhotoPreview(URL.createObjectURL(file))

      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`

      // Upload to storage - user.id/ folder zaroori hai RLS ke liye
      const { error: uploadError } = await supabase.storage
       .from('profile-photos')
       .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
       .from('profile-photos')
       .getPublicUrl(fileName)

      // DB mein turant save kar
      const { error: updateError } = await supabase
       .from('profiles')
       .update({ avatar_url: data.publicUrl })
       .eq('id', currentUser.id)

      if (updateError) throw updateError

      setFormData({...formData, photo: data.publicUrl})
      setPhotoPreview(data.publicUrl)
      setUser({...user, photo: data.publicUrl})
    } catch (err) {
      alert('Upload failed: ' + err.message)
      setPhotoPreview(user.photo)
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setFormData({...user})
    setPhotoPreview(user.photo)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({...user})
    setPhotoPreview(user.photo)
  }

  const handleSave = async () => {
    try {
      if (!currentUser) return

      // Fix: upsert use karo taaki conflict na aaye
      const { error } = await supabase
       .from('profiles')
       .upsert({
          id: currentUser.id,
          full_name: formData.fullName,
          age: formData.age,
          gender: formData.gender,
          bio: formData.bio,
          location: formData.location,
          interests: formData.interests,
          avatar_url: formData.photo,
          updated_at: new Date()
        })

      if (error) throw error

      setUser({...formData, photo: photoPreview})
      setIsEditing(false)
      alert('Profile updated successfully! ✅')
    } catch (err) {
      alert('Save failed: ' + err.message)
    }
  }

  const handleDeleteAccount = async () => {
    const confirm = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    )
    if (!confirm ||!currentUser) return

    try {
      // Pehle profile delete karo
      await supabase.from('profiles').delete().eq('id', currentUser.id)

      // Phir auth user delete - ye server-side function se karna padega
      // Abhi ke liye sirf signout kar rahe
      await supabase.auth.signOut()
      alert('Account deleted. Redirecting...')
      window.location.href = '/login'
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return <div className="text-white text-center">Loading...</div>
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header with Logout */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">FindLove</h1>
        <button
          onClick={handleLogout}
          className="text-white hover:text-rose-200 transition flex items-center gap-1"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
            <p className="text-gray-500 text-sm">
              {isEditing? 'Edit your details below' : 'Your profile information'}
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-rose-500 text-white rounded-lg font-semibold hover:bg-rose-600 transition flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          )}
        </div>

        {/* Photo Section */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden border-4 border-rose-200">
              {photoPreview? (
                <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Camera className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-rose-500 p-2 rounded-full cursor-pointer hover:bg-rose-600 transition disabled:opacity-50"
              >
                {uploading? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>
          {uploading && <p className="text-sm text-rose-500 mt-2">Uploading...</p>}
        </div>

        {/* View Mode */}
        {!isEditing? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-rose-500" />
              <div>
                <p className="text-xs text-gray-500">Full Name</p>
                <p className="font-semibold text-gray-800">{user.fullName || 'Not set'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Age</p>
                <p className="font-semibold text-gray-800">{user.age || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Gender</p>
                <p className="font-semibold text-gray-800">{user.gender || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-rose-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="font-semibold text-gray-800">{user.location || 'Not set'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Bio</p>
              <p className="text-gray-800">{user.bio || 'No bio yet'}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Interests</p>
              <p className="text-gray-800">{user.interests || 'No interests yet'}</p>
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                name="age"
                placeholder="Age"
                value={formData.age}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
              />
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
              >
                <option value="">Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="relative">
              <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="location"
                placeholder="Location - City, State"
                value={formData.location}
                onChange={handleChange}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <textarea
              name="bio"
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none resize-none"
            />

            <input
              type="text"
              name="interests"
              placeholder="Interests - e.g. Travel, Music, Food"
              value={formData.interests}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none"
            />

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                onClick={handleCancel}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" /> Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-3 bg-rose-500 text-white rounded-lg font-semibold hover:bg-rose-600 transition flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" /> Save
              </button>
            </div>

            <button
              onClick={handleDeleteAccount}
              className="w-full px-6 py-3 border-2 border-red-500 text-red-500 rounded-lg font-semibold hover:bg-red-50 transition flex items-center justify-center gap-2 mt-4"
            >
              <Trash2 className="w-5 h-5" /> Delete Account
            </button>
          </div>
        )}
      </div>
    </div>
  )
}