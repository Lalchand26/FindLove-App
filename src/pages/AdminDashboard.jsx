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
  const [stats, setStats] = useState({ totalUsers: 0, totalReports: 0, totalBlocks: 0, pendingReports: 0 })

  const ADMIN_EMAIL = 'lalchandpahan88@gmail.com'

  useEffect(() => { if (user) init() }, )

  const init = async () => {
    if (user.email === ADMIN_EMAIL) setIsAdmin(true)
    else { setLoading(false); return }
    
    await Promise.all([fetchStats(), fetchReports(), fetchBlockedUsers(), fetchAllUsers()])
    setLoading(false)
  }

  const fetchStats = async () => {
    const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
    const { count: reportCount } = await supabase.from('reports').select('*', { count: 'exact', head: true })
    const { count: pendingCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    const { count: blockCount } = await supabase.from('blocked_users').select('*', { count: 'exact', head: true })
    setStats({ totalUsers: users, totalReports: reportCount, totalBlocks: blockCount, pendingReports: pendingCount })
  }

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('reports')
      .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(full_name, email, avatar_url),
          reported_user:profiles!reports_reported_user_id_fkey(id, full_name, email, avatar_url)
        `)
      .order('created_at', { ascending: false })

    if (error) { console.log(error); toast.error('Reports load nahi hue: ' + error.message); return }
    
    const normalized = data.map(r => ({
     ...r,
      reporter_name: r.reporter?.full_name || 'Deleted',
      reporter_email: r.reporter?.email,
      reported_user_id: r.reported_user?.id, // BAN KE LIYE
      reported_name: r.reported_user?.full_name || 'Deleted',
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

  const handleReportAction = async (reportId, action, reportedUserId, reportedName) => {
    setActionLoading(reportId)
    await supabase.from('reports').update({ status: action === 'approve'? 'actioned' : 'dismissed' }).eq('id', reportId)
    if (action === 'approve') {
      await supabase.from('profiles').update({ is_banned: true }).eq('id', reportedUserId)
      toast.success(`${reportedName} Banned`)
    } else toast.success('Report Dismissed')
    await Promise.all([fetchReports(), fetchStats()])
    setActionLoading(null)
  }

  const handleUnblock = async (blockId, name) => {
    await supabase.from('blocked_users').delete().eq('id', blockId)
    toast.success(`${name} Unblocked`)
    fetchBlockedUsers(); fetchStats()
  }

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>
  if (!isAdmin) return <div className="flex h-screen items-center justify-center"><XCircle className="w-10 h-10 text-red-500" /> Access Denied</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3"><Shield className="text-pink-500" />Admin Dashboard</h1>
          <button onClick={() => {supabase.auth.signOut(); navigate('/login')}} className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"><LogOut />Logout</button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl"><p className="text-sm">TOTAL USERS</p><p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p></div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl"><p className="text-sm">PENDING REPORTS</p><p className="text-2xl font-bold text-yellow-600">{stats.pendingReports}</p></div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl"><p className="text-sm">TOTAL BLOCKS</p><p className="text-2xl font-bold text-red-600">{stats.totalBlocks}</p></div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl"><p className="text-sm">TOTAL REPORTS</p><p className="text-2xl font-bold text-purple-600">{stats.totalReports}</p></div>
        </div>

        <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 p-2 rounded-xl">
          <button onClick={() => setActiveView('reports')} className={`flex-1 p-2 rounded-lg font-bold ${activeView === 'reports'? 'bg-pink-500 text-white' : ''}`}><Flag className="w-4 h-4 inline mr-2" />Reports ({stats.pendingReports})</button>
          <button onClick={() => setActiveView('blocks')} className={`flex-1 p-2 rounded-lg font-bold ${activeView === 'blocks'? 'bg-pink-500 text-white' : ''}`}><Ban className="w-4 h-4 inline mr-2" />Blocks ({blockedUsers.length})</button>
          <button onClick={() => setActiveView('users')} className={`flex-1 p-2 rounded-lg font-bold ${activeView === 'users'? 'bg-pink-500 text-white' : ''}`}><Users className="w-4 h-4 inline mr-2" />All Users ({allUsers.length})</button>
        </div>

        {activeView === 'reports' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Eye />Reports Management - Kisne Kisko Report Kiya</h2>
            {reports.length === 0? <p className="text-center text-gray-500 py-8">Koi report nahi hai abhi</p> :
              reports.map((report) => (
                <div key={report.id} className="border p-4 rounded-lg mb-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-bold">{report.reporter_name} <span className="text-xs text-gray-500">({report.reporter_email})</span></p>
                      <p className="text-sm text-red-600">ne report kiya → <b>{report.reported_name}</b> ({report.reported_email})</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${report.status === 'pending'? 'bg-yellow-100 text-yellow-800' : 'bg-green-100'}`}>{report.status}</span>
                  </div>
                  <p className="mt-2"><b>Reason:</b> {report.reason}</p>
                  <p className="text-xs mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(report.created_at).toLocaleString('en-IN')}</p>
                  {report.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => handleReportAction(report.id, 'approve', report.reported_user_id, report.reported_name)} disabled={actionLoading === report.id} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1">
                        <UserX className="w-4 h-4" />{actionLoading === report.id? 'Banning...' : 'Approve & Ban'}
                      </button>
                      <button onClick={() => handleReportAction(report.id, 'dismiss', report.reported_user_id, report.reported_name)} className="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm">Dismiss</button>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}
