import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const ResetPassword = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check karo ki valid recovery session hai ya nahi
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setValidSession(true)
      } else {
        toast.error('Link expire ho gaya. Dubara reset karo')
        setTimeout(() => navigate('/login'), 2000)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleUpdatePassword = async (e) => {
    e.preventDefault()

    if (password!== confirmPassword) {
      toast.error('Dono password match nahi kar rahe')
      return
    }
    if (password.length < 6) {
      toast.error('Password kam se kam 6 characters ka hona chahiye')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      if (error) throw error

      await supabase.auth.signOut()
      toast.success('Password update ho gaya! Ab naye password se login karo')
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
          <h1 className="text-2xl font-bold text-pink-500">Verifying...</h1>
          <p className="text-gray-500 mt-2">Reset link check ho raha hai</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-2 text-center">Reset Password</h2>
        <p className="text-gray-500 text-sm mb-6 text-center">Apna naya password set karo</p>
        <form onSubmit={handleUpdatePassword}>
          <input
            type="password"
            placeholder="Naya password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-4 border rounded-lg"
            minLength={6}
            required
          />
          <input
            type="password"
            placeholder="Password confirm karo"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 mb-4 border rounded-lg"
            minLength={6}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-500 text-white p-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword