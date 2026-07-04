import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'react-hot-toast'
import { Shield, XCircle, Eye, Clock, Ban, Flag, Users, LogOut, UserX } from 'lucide-react'
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
  const [stats, setStats] = useState({ totalUsers: 0, totalReports: 0, totalBlocks: 0, pendingReports: 0 })

  const ADMIN_EMAIL = 'lalchandpahan88@gmail.com'

  useEffect(() => { 
    if (user) checkAdmin() 
  }, )

  const checkAdmin = async () => {
    if (user.email === ADMIN_EMAIL) {
      setIsAdmin(true)
      loadAllData()
    } else {
      setLoading(false)
      setIsAdmin(false)
    }
  }

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([fetchStats(), fetchReports(), fetchBlockedUsers(), fetchAllUsers()])
    setLoading(false)
  }

  const fetchStats = async () => {
    const [{count: users}, {count: reportCount}, {count: pendingCount}, {count: blockCount}] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('blocked_users').select('*', { count: 'exact', head: true })
    ])
    setStats({ totalUsers: users || 0, totalReports: reportCount || 0, totalBlocks: blockCount || 0, pendingReports: pendingCount || 0 })
  }

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('reports')
      .select(`
          id, reason, details, status, created_at,
          reporter:profiles!reports_reporter_id_fkey(full_name, email),
          reported_user:profiles!reports_reported_user_id_fkey(id, full_name, email)
        `)
      .order('created_at', { ascending: false })

    if (error) { 
      console.error(error)
      toast.error('Reports load nahi hue: ' + error.message); 
      setReports([])
      return 
    }
    
    const normalized = data.map(r => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      created_at: r.created_at,
      reporter_name: r.reporter?.full_name || 'Deleted',
      reporter_email: r.reporter?.email,
      reported_user_id: r.reported_user?.id,
      reported_name: r.reported_user?.full_name || 'Deleted',
      reported_email: r.reported_user?.email,
    }))
    setReports(normalized)
  }

  const fetchBlockedUsers = async () => {
    const { data } = await supabase
      .from('blocked_users')
      .select(`id, created_at, blocker:profiles!blocked_users_blocker_id_fkey(full_name, email), blocked:profiles!blocked_users_blocked_id_fkey(id, full_name, email)`)
      .order('created_at', { ascending: false })
    setBlockedUsers(data || [])
  }

  const fetchAllUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, email, avatar_url, is_banned, role, created_at')
    setAllUsers(data || [])
  }

  const handleReportAction = async (reportId, action, reportedUserId, reportedName) => {
    setActionLoading(reportId)
    try {
      const newStatus = action === 'approve'? 'actioned' : 'dismissed'
      const { error } = await supabase.from('reports').update({ status: newStatus }).eq('id', reportId)
      if(error) throw error

      if (action === 'approve') {
        await supabase.from('profiles').update({ is_banned: true }).eq('id', reportedUserId)
        toast.success(`${reportedName} ko ban kar diya`)
      } else {
        toast.success('Report dismiss kar di')
      }
      loadAllData()
    } catch (err) {
      toast.error('Action fail: ' + err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnblock = async (blockId, name) => {
    await supabase.from('blocked_users').delete().eq('id', blockId)
    toast.success(`${name} unblock ho gaya`)
    loadAllData()
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><Shield className="w-12 h-12 animate-pulse text-pink-500" /></div>
  if (!isAdmin) return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><XCircle className="w-16 h-16 text-red-500 mr-4" /><div><h2 className="text-2xl font-bold">Access Denied</h2><p>Sirf admin dekh sakta hai</p></div></div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-pink-500" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Logged in as: {user.email}</p>
            </div>
          </div>
          <button onClick={() => {supabase.auth.signOut(); navigate('/login')}} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold"><LogOut className="w-4 h-4" />Logout</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border"><p className="text-xs text-gray-500">TOTAL USERS</p><p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border"><p className="text-xs text-gray-500">PENDING REPORTS</p><p className="text-2xl font-bold text-yellow-600">{stats.pendingReports}</p></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border"><p className="text-xs text-gray-500">TOTAL BLOCKS</p><p className="text-2xl font-bold text-red-600">{stats.totalBlocks}</p></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border"><p className="text-xs text-gray-500">TOTAL REPORTS</p><p className="text-2xl font-bold text-purple-600">{stats.totalReports}</p></div>
        </div>

        <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 p-2 rounded-xl border">
          <button onClick={() => setActiveView('reports')} className={`flex-1 px-4 py-2 rounded-lg font-bold ${activeView === 'reports'? 'bg-pink-500 text-white' : 'text-gray-600'}`}><Flag className="w-4 h-4 inline mr-2" />Reports ({stats.pendingReports})</button>
          <button onClick={() => setActiveView('blocks')} className={`flex-1 px-4 py-2 rounded-lg font-bold ${activeView === 'blocks'? 'bg-pink-500 text-white' : 'text-gray-600'}`}><Ban className="w-4 h-4 inline mr-2" />Blocks ({blockedUsers.length})</button>
          <button onClick={() => setActiveView('users')} className={`flex-1 px-4 py-2 rounded-lg font-bold ${activeView === 'users'? 'bg-pink-500 text-white' : 'text-gray-600'}`}><Users className="w-4 h-4 inline mr-2" />Users ({allUsers.length})</button>
        </div>

        {activeView === 'reports' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Eye />Reports Management - Kisne Kisko Report Kiya</h2>
            {reports.length === 0? <p className="text-gray-500 text-center py-8">Koi report nahi hai abhi</p> :
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="border dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold">{report.reporter_name} <span className="text-xs text-gray-500">({report.reporter_email})</span></p>
                        <p className="text-sm text-red-600 font-bold">ne report kiya → {report.reported_name} ({report.reported_email})</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${report.status === 'pending'? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{report.status}</span>
                    </div>
                    <p><b>Reason:</b> {report.reason}</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(report.created_at).toLocaleString('en-IN')}</p>
                    {report.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => handleReportAction(report.id, 'approve', report.reported_user_id, report.reported_name)} disabled={actionLoading === report.id} className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold disabled:bg-red-300">
                          <UserX className="w-4 h-4" />{actionLoading === report.id? 'Processing...' : 'Approve & Ban'}
                        </button>
                        <button onClick={() => handleReportAction(report.id, 'dismiss', report.reported_user_id, report.reported_name)} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold">Dismiss</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {activeView === 'blocks' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Ban />User Blocks</h2>
            {blockedUsers.map((b) => (
              <div key={b.id} className="border p-4 rounded-lg mb-3 flex justify-between">
                <p><b>{b.blocker?.full_name}</b> ne block kiya → <b>{b.blocked?.full_name}</b></p>
                <button onClick={() => handleUnblock(b.id, b.blocked?.full_name)} className="bg-green-500 text-white px-3 py-1 rounded text-sm">Unblock</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
