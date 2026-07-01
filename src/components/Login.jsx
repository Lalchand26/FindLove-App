import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom' // Link add karo
import { useAuth } from '../hooks/useAuth.jsx'
import { supabase } from '../lib/supabase' // Ye bhi add karo
import toast from 'react-hot-toast'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Login successful!')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

const handleForgotPassword = async () => {
  if (!email) {
    toast.error('Pehle email daalo')
    return
  }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://findlove-chat.netlify.app/reset-password'
    })
    if (error) throw error
    toast.success('Reset link email pe bhej diya!')
  } catch (error) {
    toast.error(error.message)
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 mb-4 border rounded-lg"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-4 border rounded-lg"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-500 text-white p-3 rounded-lg font-semibold"
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
        
        {/* YE FORGOT PASSWORD LINK ADD KARO */}
        <div className="text-center mt-4">
          <button 
            onClick={handleForgotPassword}
            className="text-pink-500 text-sm hover:underline"
          >
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login