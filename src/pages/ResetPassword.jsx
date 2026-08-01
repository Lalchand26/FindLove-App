import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Lock } from 'lucide-react'

const ResetPassword = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    const handleInitSession = async () => {
      // 1. Check Query Params (?error_description=... or ?code=...)
      const urlParams = new URLSearchParams(window.location.search)
      const errorDescription = urlParams.get('error_description')
      let code = urlParams.get('code')

      // 2. Fallback: Check Hash Fragments (#code=... or token hashes) if not found in search
      if (!code && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'))
        code = hashParams.get('code')
        const hashError = hashParams.get('error_description')
        
        if (hashError && mounted) {
          toast.error(hashError || 'Reset link invalid ya expire ho gaya hai.')
          setVerifying(false)
          setValidSession(false)
          return
        }
      }

      if (errorDescription && mounted) {
        toast.error(errorDescription || 'Reset link invalid ya expire ho gaya hai.')
        setVerifying(false)
        setValidSession(false)
        return
      }

      // 3. Exchange Code for Session (PKCE Flow)
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          
          if (mounted && data?.session) {
            setValidSession(true)
            setVerifying(false)
            window.history.replaceState({}, document.title, window.location.pathname)
            return
          }
        } catch (err) {
          console.error("PKCE Exchange Error:", err.message)
          if (mounted) {
            setValidSession(false)
            setVerifying(false)
          }
          return
        }
      }

      // 4. Check existing session as fallback
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return

      if (session) {
        setValidSession(true)
        setVerifying(false)
      } else {
        const timer = setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (!mounted) return

          setValidSession(!!retrySession)
          setVerifying(false)
        }, 2000)

        return () => clearTimeout(timer)
      }
    }

    handleInitSession()

    // Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setValidSession(true)
        setVerifying(false)
      }
    })

    return () => {
      mounted = false
      if (subscription) subscription.unsubscribe()
    }
  }, [])

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
      toast.error(error.message || 'Password update nahi ho paya.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
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

  if (!validSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Invalid or Expired Link</h2>
          <p className="text-gray-600 text-sm mb-6">Aapka password reset link expire ho chuka hai ya pehle hi use ho gaya hai.</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white p-3 rounded-xl font-bold transition"
          >
            Go to Login
          </button>
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