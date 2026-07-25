import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Lock } from 'lucide-react' // 👈 Eye icons import kiye

const ResetPassword = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false) // 👈 Eye toggle state
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Auth State change suno (Recovery event catch karne ke liye)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setValidSession(true)
      }
    })

    // Fallback: Check existing session after a brief tick
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setValidSession(true)
      } else {
        // Agar 3 sec tak recovery session na mile tab redirect karein
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (!retrySession) {
            toast.error('Reset link invalid ya expire ho gaya hai. Dobara try karein.')
            navigate('/login')
          } else {
            setValidSession(true)
          }
        }, 2000)
      }
    }

    checkSession()

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleUpdatePassword = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Dono password match nahi kar rahe!')
      return
    }
    if (password.length < 8) {
      toast.error('Password kam se kam 8 characters ka hona chahiye!')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      if (error) throw error

      await supabase.auth.signOut()
      toast.success('Password successfully update ho gaya! Naye password se login karein.')
      navigate('/login')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!validSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h1 className="text-xl font-bold text-gray-800">Verifying Reset Link...</h1>
          <p className="text-gray-500 text-sm mt-1">Kripya thoda intzar karein</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-1 text-center text-gray-900">Reset Password</h2>
        <p className="text-gray-500 text-sm mb-6 text-center">Apna naya password set karein</p>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          
          {/* New Password */}
          <div className="relative flex items-center">
            <Lock className="absolute left-3 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Naya Password (Min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-12 p-3 bg-gray-50 border border-gray-300 rounded-xl focus:border-pink-500 focus:bg-white outline-none text-gray-900"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-gray-400 hover:text-gray-600 transition focus:outline-none"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative flex items-center">
            <Lock className="absolute left-3 w-5 h-5 text-gray-400" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Password Confirm Karein"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-11 pr-12 p-3 bg-gray-50 border border-gray-300 rounded-xl focus:border-pink-500 focus:bg-white outline-none text-gray-900"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 text-gray-400 hover:text-gray-600 transition focus:outline-none"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white p-3 rounded-xl font-bold transition disabled:opacity-50"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword