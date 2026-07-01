import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Mail, Lock, User } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const [name, setName] = useState('') // 👈 NAME FIELD ADD KIYA
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
          data: { name: name } // 👈 Supabase mein name save hoga
        }
      })

      if (error) throw error

      // 👇👇👇 YE CODE ADD KIYA HAI - SIGNUP SUCCESS KE BAAD MAIL BHEJEGA 👇👇👇
      await supabase.functions.invoke('send-admin-alert', {
        body: { 
          type: 'new_user',
          data: { 
            name: name || 'New User', // agar name khali hai to 'New User'
            email: email 
          } 
        }
      })
      // 👆👆👆 YAHAN TAK ADD KARNA HAI 👆👆👆

      alert('Account created successfully ❤️')
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
          <h1 className="text-4xl font-bold text-white">FindLove</h1>
          <p className="text-pink-100 mt-2">
            Create Your Account ❤️
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          
          {/* 👇 NAME INPUT FIELD ADD KIYA HAI 👇 */}
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

          //<div className="relative">
            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-white/70" />
            <input
              type="password"
              placeholder="Password (Min 6 Characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/20 border border-white/20 text-white placeholder-white/70 outline-none"
              minLength={8}
              required
            />
          </div>//

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white text-pink-600 font-bold hover:scale-105 transition"
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