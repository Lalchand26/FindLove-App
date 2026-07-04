import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'react-hot-toast'
import { Shield, XCircle, Eye, Clock, Ban, Flag, Users, LogOut, UserX, Unlock, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AdminDashboard({ session }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [blockedUsers, setBlockedUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('reports')
  const [actionLoading, setActionLoading] = useState(null)
  const [stats, setStats] = useState({ totalUsers: 0, totalReports: 0, totalBlocks: 0, pendingReports: 0 })

  useEffect(() => { loadAllData() }, )

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
      .select(`*, reporter:profiles!reports_reporter_id_fkey(full_name, email), reported_user:profiles!reports_reported_user_id_fkey(id, full_name, email)`)
      .order('created_at', { ascending: false })

    if (error) { toast.error('Reports load error: ' + error.message); console.error(error); return }
    const normalized = data.map(r => ({
     ...r,
      reporter_name: r.reporter?.full_name || 'Deleted User',
      reporter_email: r.reporter?.email,
      reported_name: r.reported_user?.full_name || 'Deleted User',
      reported_email: r.reported_user?.email,
    }))
    setReports(normalized)
  }

  const fetchBlockedUsers = async () => {
    const { data, error } = await supabase
      .from('blocked_users')
      .select(`*, blocker:profiles!blocked_users_blocker_id_fkey(full_name, email), blocked:profiles!blocked_users_blocked_id_fkey(id, full_name, email)`)
      .order('created_at', { ascending: false })
    if (error) { toast.error('Blocks load error'); return }
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
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setAllUsers(data || [])
  }

  const handleReportAction = async (reportId, action, reportedUserId, reportedName) => {
    setActionLoading(reportId)
    const newStatus = action === 'approve'? 'actioned' : 'dismissed'
    await supabase.from('reports').update({ status: newStatus }).eq('id', reportId)
    if (action === 'approve') {
      await supabase.from('profiles').update({ is_banned: true }).eq('id', reportedUserId)
      toast.success(`${reportedName} ko Ban kar diya`)
    } else toast.success('Report Dismiss kar di')
    loadAllData()
    setActionLoading(null)
  }

  const handleUnblock = async (blockId, name) => {
    await supabase.from('blocked_users').delete().eq('id', blockId)
    toast.success(`${name} Unblocked`)
    loadAllData()
  }

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`${name} ko permanently delete kare?`)) return
    await supabase.from('profiles').delete().eq('id', userId)
    toast.success(`${name} Deleted`)
    loadAllData()
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><Shield className="w-12 h-12 animate-pulse text-pink-500" /></div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3"><Shield className="w-8 h-8 text-pink-500" /><div><h1 className="text-3xl font-bold">Admin Dashboard</h1><p className="text-sm text-gray-500">Logged in as: {user.email}</p></div></div>
          <button onClick={() => {supabase.auth.signOut(); navigate('/login')}} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"><LogOut className="w-4 h-4"/>Logout</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm"><p className="text-xs text-gray-500">TOTAL USERS</p><p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p></div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm"><p className="text-xs text-gray-500">PENDING REPORTS</p><p className="text-2xl font-bold text-yellow-600">{stats.pendingReports}</p></div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm"><p className="text-xs text-gray-500">TOTAL BLOCKS</p><p className="text-2xl font-bold text-red-600">{stats.totalBlocks}</p></div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm"><p className="text-xs text-gray-500">TOTAL REPORTS</p><p className="text-2xl font-bold text-purple-600">{stats.totalReports}</p></div>
        </div>

        <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm">
          <button onClick={() => setActiveView('reports')} className={`flex-1 p-2 rounded-lg font-bold flex items-center justify-center gap-2 ${activeView === 'reports'? 'bg-pink-500 text-white' : 'text-gray-600'}`}><Flag className="w-4 h-4" />Reports ({stats.pendingReports})</button>
          <button onClick={() => setActiveView('blocks')} className={`flex-1 p-2 rounded-lg font-bold flex items-center justify-center gap-2 ${activeView === 'blocks'? 'bg-pink-500 text-white' : 'text-gray-600'}`}><Ban className="w-4 h-4" />Blocks ({blockedUsers.length})</button>
          <button onClick={() => setActiveView('users')} className={`flex-1 p-2 rounded-lg font-bold flex items-center justify-center gap-2 ${activeView === 'users'? 'bg-pink-500 text-white' : 'text-gray-600'}`}><Users className="w-4 h-4" />Users ({allUsers.length})</button>
        </div>

        {activeView === 'reports' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Eye /> Reports - Kisne Kisko Report Kiya</h2>
            {reports.length === 0 ? <p className="text-gray-500">No reports found</p> : reports.map((report) => (
              <div key={report.id} className="border p-4 rounded-lg mb-4 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">{report.reporter_name} <span className="text-xs font-normal">({report.reporter_email})</span></p>
                    <p className="text-sm text-red-600">ne report kiya → <b>{report.reported_name}</b> ({report.reported_email})</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${report.status === 'pending'? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{report.status}</span>
                </div>
                <p className="mt-2"><b>Reason:</b> {report.reason}</p>
                {report.details && <p className="text-sm text-gray-500"><b>Details:</b> {report.details}</p>}
                <p className="text-xs mt-1 text-gray-400"><Clock className="w-3 h-3 inline" /> {new Date(report.created_at).toLocaleString('en-IN')}</p>
                {report.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button disabled={actionLoading === report.id} onClick={() => handleReportAction(report.id, 'approve', report.reported_user_id, report.reported_name)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"><UserX className="w-4 h-4" /> Ban User</button>
                    <button disabled={actionLoading === report.id} onClick={() => handleReportAction(report.id, 'dismiss', report.reported_user_id, report.reported_name)} className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm">Dismiss</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeView === 'blocks' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Ban /> Blocked Users</h2>
            {blockedUsers.length === 0 ? <p className="text-gray-500">No blocked users</p> : blockedUsers.map((b) => (
              <div key={b.id} className="border p-4 rounded-lg mb-3 flex justify-between items-center dark:border-gray-700">
                <p><b>{b.blocker_name}</b> ne block kiya → <b>{b.blocked_name}</b></p>
                <button onClick={() => handleUnblock(b.id, b.blocked_name)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"><Unlock className="w-4 h-4" /> Unblock</button>
              </div>
            ))}
          </div>
        )}

        {activeView === 'users' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Users /> All Users</h2>
            {allUsers.map((u) => (
              <div key={u.id} className="border p-3 rounded-lg mb-2 flex justify-between items-center dark:border-gray-700">
                <div><p className="font-bold">{u.full_name} {u.is_banned && <span className="text-xs bg-red-500 text-white px-2 rounded">BANNED</span>}</p><p className="text-xs text-gray-500">{u.email}</p></div>
                {!u.is_banned && <button onClick={() => handleDeleteUser(u.id, u.full_name)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"><Trash2 className="w-3 h-3"/>Delete</button>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
