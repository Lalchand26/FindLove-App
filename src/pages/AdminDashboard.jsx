import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'react-hot-toast'
import { Shield, XCircle, Eye, Clock, Ban, Flag, Users, Trash2, Unlock, LogOut, UserX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AdminDashboard({ session }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [blockedUsers, setBlockedUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeView, setActiveView] = useState('reports')
  const [actionLoading, setActionLoading] = useState(null)

  const ADMIN_EMAIL = 'lalchandpahan88@gmail.com'

  useEffect(() => { if (user) checkAdminAndFetch() }, )

  const checkAdminAndFetch = async () => {
    const isAdminUser = user.email === ADMIN_EMAIL
    setIsAdmin(isAdminUser)
    if (!isAdminUser) { setLoading(false); return }
    
    await Promise.all([fetchReports(), fetchBlockedUsers(), fetchAllUsers()])
    setLoading(false)
  }

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('reports')
      .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(full_name, email, avatar_url),
          reported_user:profiles!reports_reported_user_id_fkey(full_name, email, avatar_url)
        `)
      .order('created_at', { ascending: false })

    if (error) { toast.error(error.message); return }
    
    const normalized = data.map(r => ({
     ...r,
      reporter_name: r.reporter?.full_name,
      reporter_email: r.reporter?.email,
      reported_name: r.reported_user?.full_name,
      reported_email: r.reported_user?.email,
    }))
    setReports(normalized)
  }

  const fetchBlockedUsers = async () => {
    const { data } = await supabase
      .from('blocked_users')
      .select(`*, blocker:profiles!blocked_users_blocker_id_fkey(*), blocked:profiles!blocked_users_blocked_id_fkey(*)`)
      .order('created_at', { ascending: false })
    setBlockedUsers(data || [])
  }

  const fetchAllUsers = async () => {
    const { data } = await supabase.from('profiles').select('*')
    setAllUsers(data || [])
  }

  const handleReportAction = async (reportId, action, reportedUserId) => {
    setActionLoading(reportId)
    await supabase.from('reports').update({ status: action === 'approve'? 'actioned' : 'dismissed' }).eq('id', reportId)
    if (action === 'approve') {
      await supabase.from('profiles').update({ is_banned: true }).eq('id', reportedUserId)
      toast.success('User Banned')
    } else toast.success('Report Dismissed')
    fetchReports()
    setActionLoading(null)
  }

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>
  if (!isAdmin) return <div className="flex h-screen items-center justify-center"><XCircle /> Access Denied</div>

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3"><Shield />Admin Dashboard</h1>
      
      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveView('reports')} className={`p-2 rounded ${activeView === 'reports'? 'bg-pink-500 text-white' : 'bg-gray-200'}`}>Reports ({reports.filter(r=>r.status==='pending').length})</button>
        <button onClick={() => setActiveView('blocks')} className={`p-2 rounded ${activeView === 'blocks'? 'bg-pink-500 text-white' : 'bg-gray-200'}`}>Blocks</button>
      </div>

      {activeView === 'reports' && reports.map((report) => (
        <div key={report.id} className="border p-4 rounded-lg mb-4 bg-white dark:bg-gray-800">
          <p><b>{report.reporter_name}</b> ({report.reporter_email}) <span className="text-red-500">ne report kiya</span> → <b>{report.reported_name}</b> ({report.reported_email})</p>
          <p><b>Reason:</b> {report.reason}</p>
          <p className="text-xs"><Clock className="w-3 h-3 inline" /> {new Date(report.created_at).toLocaleString('en-IN')}</p>
          
          {report.status === 'pending' && (
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleReportAction(report.id, 'approve', report.reported_user_id)} disabled={actionLoading === report.id} className="bg-red-500 text-white px-3 py-1 rounded text-sm">
                <UserX className="w-4 h-4 inline" /> Ban
              </button>
              <button onClick={() => handleReportAction(report.id, 'dismiss', report.reported_user_id)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm">Dismiss</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
