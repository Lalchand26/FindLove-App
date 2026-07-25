import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  const handleSignup = async (e) => {
    e.preventDefault()

    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name },
          // 🔽 Email confirmation redirect link
          emailRedirectTo: 'https://citycrossed.com/login'
        }
      })

      if (error) throw error

      await supabase.functions.invoke('send-admin-alert', {
        body: { 
          type: 'new_user',
          data: { 
            name: name || 'New User',
            email: email 
          } 
        }
      })

      alert('Account created successfully ❤️ Check your email for verification.')
      navigate('/login')
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-600 via-rose-500 to-purple-700 px-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <Heart className="w-14 h-14 text-white fill-white mx-auto mb-3" />
          <h1 className="text-4xl font-bold text-white">CityCrossed</h1>
          <p className="text-pink-100 mt-2">
            Create Your Account ❤️
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          
          {/* NAME FIELD */}
          <div className="relative">
            <User className="absolute left-3 top-3.5 w-5 h-5 text-white/70" />
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/20 border border-white/20 text-white placeholder-white/70 outline-none"
              required
            />
          </div>

          {/* EMAIL FIELD */}
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-white/70" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/20 border border-white/20 text-white placeholder-white/70 outline-none"
              required
            />
          </div>

          {/* PASSWORD FIELD WITH EYE ICON */}
          <div className="relative flex items-center">
            <Lock className="absolute left-3 w-5 h-5 text-white/70" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (Min 8 Characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-12 py-3 rounded-xl bg-white/20 border border-white/20 text-white placeholder-white/70 outline-none"
              minLength={8}
              required
            />
            {/* Eye Icon Toggle Button */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-white/70 hover:text-white transition focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white text-pink-600 font-bold hover:scale-105 transition disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>

        </form>

        <p className="text-center text-white mt-6">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-bold text-pink-200 hover:text-white"
          >
            Login
          </Link>
        </p>

      </div>
    </div>
  )
}