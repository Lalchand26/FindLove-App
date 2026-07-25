import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { ArrowLeft, Eye, EyeOff, ArrowRight } from 'lucide-react'

const Login = () => {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  // 1. Move to Password Step
  const handleNextStep = (e) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Kripya email enter karein')
      return
    }
    setStep(2)
  }

  // 2. PASSWORD RESET LINK FUNCTION
  const sendResetEmail = async (targetEmail) => {
    const emailToSend = targetEmail?.trim() || email.trim()

    if (!emailToSend) {
      toast.error('Kripya email address provide karein')
      return
    }

    setResetLoading(true)
    try {
      const redirectUrl = `${window.location.origin}/reset-password`
      
      const { error } = await supabase.auth.resetPasswordForEmail(emailToSend, {
        redirectTo: redirectUrl
      })

      if (error) throw error

      toast.success(`Reset link ${emailToSend} par bhej diya gaya hai!`)
    } catch (error) {
      console.error("❌ Reset Link Error:", error)
      toast.error('Reset link bhejne mein error: ' + error.message)
    } finally {
      setResetLoading(false)
    }
  }

  // 3. Normal Email/Password Login
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Login successful!')
      navigate('/dashboard')
    } catch (error) {
      console.error("❌ Login Error:", error)
      toast.error(error.message || 'Login failed!')
    } finally {
      setLoading(false)
    }
  }

  // 4. Google OAuth Login
  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const queryParams = { prompt: 'select_account', access_type: 'offline' }
      if (email.trim()) queryParams.login_hint = email.trim()

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams
        }
      })
      if (error) throw error
    } catch (error) {
      console.error("❌ Google Login Error:", error)
      toast.error('Google login error: ' + error.message)
      setGoogleLoading(false)
    }
  }

  // 5. Forgot Password Button Handler
  const handleForgotPassword = async () => {
    let resetEmail = email.trim()
    if (!resetEmail) {
      const inputEmail = prompt('Kripya apna registered email address dalein:')
      if (!inputEmail) return
      resetEmail = inputEmail.trim()
    }
    await sendResetEmail(resetEmail)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
          CityCrossed Login
        </h2>

        {/* STEP 1: EMAIL FIELD */}
        {step === 1 && (
          <form onSubmit={handleNextStep}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mb-4 bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-300 rounded-lg focus:border-pink-500 outline-none"
              required
            />
            <button 
              type="submit" 
              className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white p-3 rounded-lg font-semibold transition"
            >
              Next <ArrowRight size={18} />
            </button>
          </form>
        )}

        {/* STEP 2: PASSWORD FIELD */}
        {step === 2 && (
          <form onSubmit={handleLogin}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{email}</span>
            </div>

            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 pr-12 bg-white text-gray-900 placeholder-gray-500 border-2 border-gray-300 rounded-lg focus:border-pink-500 outline-none"
                required
                autoFocus
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-pink-600 transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="w-1/3 bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded-lg font-semibold transition flex items-center justify-center gap-1"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button 
                type="submit" 
                disabled={loading || googleLoading || resetLoading} 
                className="w-2/3 bg-pink-600 hover:bg-pink-700 text-white p-3 rounded-lg font-semibold disabled:opacity-50 transition"
              >
                {loading ? 'Loading...' : 'Login'}
              </button>
            </div>
          </form>
        )}

        {/* DIVIDER */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="border-t border-gray-300 w-full"></div>
          <span className="bg-white px-3 text-sm text-gray-500 absolute">OR</span>
        </div>

        {/* GOOGLE BUTTON */}
        <button 
          type="button" 
          onClick={handleGoogleLogin} 
          disabled={loading || googleLoading || resetLoading} 
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold p-3 border-2 border-gray-300 rounded-lg transition disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          {googleLoading ? 'Connecting...' : 'Sign in with Google'}
        </button>

        {/* FORGOT PASSWORD */}
        <div className="text-center mt-4">
          <button 
            type="button" 
            onClick={handleForgotPassword} 
            disabled={resetLoading} 
            className="text-pink-600 text-sm hover:underline disabled:opacity-50"
          >
            {resetLoading ? 'Sending link...' : 'Forgot Password?'}
          </button>
        </div>

        {/* BACK TO SIGNUP */}
        <div className="flex justify-center mt-6 pt-4 border-t border-gray-200">
          <button 
            type="button" 
            onClick={() => navigate('/signup')} 
            className="flex items-center text-sm text-gray-600 hover:text-pink-600 font-medium"
          >
            <ArrowLeft size={16} className="mr-1" /> Back to Signup
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login