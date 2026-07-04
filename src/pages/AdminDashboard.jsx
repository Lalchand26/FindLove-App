import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'react-hot-toast'
import { Shield, XCircle, Eye, Clock, Ban, Flag, Users, LogOut, UserX, Unlock } from 'lucide-react'
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

  // RPC HATA DIYA - DIRECT QUERY
  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('reports')
      .select(`id, reason, details, status, created_at, reporter_id, reported_user_id,
          reporter:profiles!reports_reporter_id_fkey(full_name, email),
          reported_user:profiles!reports_reported_user_id_fkey(id, full_name, email)
        `)
      .order('created_at', { ascending: false })

    if (error) { 
      console.error(error)
      toast.error('Reports load nahi hue: ' + error.message); 
      return 
    }
    
    const normalized = data.map(r => ({
     ...r,
      reporter_name: r.reporter?.full_name || 'Deleted',
      reporter_email: r.reporter?.email,
      reported_name: r.reported_user?.full_name || 'Deleted',
      reported_email: r.reported_user?.email,
    }))
    setReports(normalized)
  }

  // RPC HATA DIYA - DIRECT QUERY
  const fetchBlockedUsers = async () => {
    const { data, error } = await supabase
      .from('blocked_users')
      .select(`id, created_at, 
        blocker:profiles!blocked_users_blocker_id_fkey(full_name, email), 
        blocked:profiles!blocked_users_blocked_id_fkey(id, full_name, email)`)
      .order('created_at', { ascending: false })
    
    if(error) { toast.error('Blocks load nahi hue'); return }

    const normalized = data.map(b => ({
     ...b,
      blocker_name: b.blocker?.full_name,
      blocker_email: b.blocker?.email,
      blocked_id: b.blocked?.id,
      blocked_name: b.blocked?.full_name,
      blocked_email: b.blocked?.email,
    }))
    setBlockedUsers(normalized)
  }

  const fetchAllUsers = async () => {
    const { data } = await supabase.from('profiles').select('*')
    setAllUsers(data || [])
  }

  const handleReportAction = async (reportId, action, reportedUserId, reportedName) => {
    setActionLoading(reportId)
    const newStatus = action === 'approve'? 'actioned' : 'dismissed'
    await supabase.from('reports').update({ status: newStatus }).eq('id', reportId)
    if (action === 'approve') {
      await supabase.from('profiles').update({ is_banned: true }).eq('id', reportedUserId)
      toast.success(`${reportedName} Banned`)
    } else toast.success('Report Dismissed')
    loadAllData()
    setActionLoading(null)
  }

  const handleUnblock = async (blockId, name) => {
    await supabase.from('blocked_users').delete().eq('id', blockId)
    toast.success(`${name} Unblocked`)
    loadAllData()
  }

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>
  if (!isAdmin) return <div className="flex h-screen items-center justify-center"><XCircle className="w-10 h-10 text-red-500 mr-2" /> Access Denied</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3"><Shield className="text-pink-500" />Admin Dashboard</h1>
          <button onClick={() => {supabase.auth.signOut(); navigate('/login')}} className="bg-red-500 text-white px-4 py-2 rounded-lg flex items-center gap-2"><LogOut />Logout</button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl"><p>TOTAL USERS</p><p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p></div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl"><p>PENDING REPORTS</p><p className="text-2xl font-bold text-yellow-600">{stats.pendingReports}</p></div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl"><p>TOTAL BLOCKS</p><p className="text-2xl font-bold text-red-600">{stats.totalBlocks}</p></div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl"><p>TOTAL REPORTS</p><p className="text-2xl font-bold text-purple-600">{stats.totalReports}</p></div>
        </div>

        <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 p-2 rounded-xl">
          <button onClick={() => setActiveView('reports')} className={`flex-1 p-2 rounded-lg font-bold ${activeView === 'reports'? 'bg-pink-500 text-white' : ''}`}><Flag /> Reports ({stats.pendingReports})</button>
          <button onClick={() => setActiveView('blocks')} className={`flex-1 p-2 rounded-lg font-bold ${activeView === 'blocks'? 'bg-pink-500 text-white' : ''}`}><Ban /> Blocks ({blockedUsers.length})</button>
          <button onClick={() => setActiveView('users')} className={`flex-1 p-2 rounded-lg font-bold ${activeView === 'users'? 'bg-pink-500 text-white' : ''}`}><Users /> Users ({allUsers.length})</button>
        </div>

        {activeView === 'reports' && reports.map((report) => (
          <div key={report.id} className="border p-4 rounded-lg mb-4 bg-white dark:bg-gray-800">
            <p><b>{report.reporter_name}</b> ({report.reporter_email}) <span className="text-red-500">ne report kiya</span> → <b>{report.reported_name}</b> ({report.reported_email})</p>
            <p><b>Reason:</b> {report.reason}</p>
            <p className="text-xs"><Clock className="w-3 h-3 inline" /> {new Date(report.created_at).toLocaleString('en-IN')}</p>
            {report.status === 'pending' && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleReportAction(report.id, 'approve', report.reported_user_id, report.reported_name)} className="bg-red-500 text-white px-3 py-1 rounded text-sm"><UserX /> Ban</button>
                <button onClick={() => handleReportAction(report.id, 'dismiss', report.reported_user_id, report.reported_name)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm">Dismiss</button>
              </div>
            )}
          </div>
        ))}

        {activeView === 'blocks' && blockedUsers.map((b) => (
          <div key={b.id} className="border p-4 rounded-lg mb-3 flex justify-between bg-white dark:bg-gray-800">
            <p><b>{b.blocker_name}</b> ne block kiya → <b>{b.blocked_name}</b></p>
            <button onClick={() => handleUnblock(b.id, b.blocked_name)} className="bg-green-500 text-white px-3 py-1 rounded text-sm flex items-center gap-1"><Unlock /> Unblock</button>
          </div>
        ))}
      </div>
    </div>
  )
}
