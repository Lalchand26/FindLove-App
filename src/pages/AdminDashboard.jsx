import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'react-hot-toast'
import { Shield, CheckCircle, XCircle, Eye, Clock, Ban, Flag, Users, Trash2, Unlock, Search, LogOut, UserX } from 'lucide-react'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalReports: 0,
    totalBlocks: 0,
    pendingReports: 0
  })

  const ADMIN_EMAIL = 'lalchandpahan88@gmail.com'

  useEffect(() => {
    checkAdminAndFetch()
  }, [])

  const checkAdminAndFetch = async () => {
    if (!user?.email) {
      setLoading(false)
      return
    }

    // Check if user is admin by email or role
    if (user.email !== ADMIN_EMAIL) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        setIsAdmin(false)
        setLoading(false)
        return
      }
    }

    setIsAdmin(true)
    await Promise.all([fetchStats(), fetchReports(), fetchBlockedUsers(), fetchAllUsers()])
    setLoading(false)
  }

  const fetchStats = async () => {
    try {
      const { count: users } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      const { count: reportCount } = await supabase.from('reports').select('*', { count: 'exact', head: true })
      const { count: pendingCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      const { count: blockCount } = await supabase.from('blocked_users').select('*', { count: 'exact', head: true })

      setStats({
        totalUsers: users || 0,
        totalReports: reportCount || 0,
        totalBlocks: blockCount || 0,
        pendingReports: pendingCount || 0
      })
    } catch (error) {
      console.error('Stats error:', error)
    }
  }

  const fetchReports = async () => {
    console.log('Fetching reports...')
    try {
      const { data, error } = await supabase.rpc('get_all_reports_admin', {
        admin_id: user.id
      })

      if (error) {
        console.error('Error in RPC get_all_reports_admin:', error)
        // fallback to direct query if RPC fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('reports')
          .select(`
            *,
            reporter:profiles!reports_reporter_id_fkey(id, full_name, email, avatar_url),
            reported_user:profiles!reports_reported_user_id_fkey(id, full_name, email, avatar_url)
          `)
          .order('created_at', { ascending: false })

        if (fallbackError) {
          console.error('Fallback fetch reports error:', fallbackError)
          toast.error('Reports load nahi hue')
          setReports([])
        } else {
          console.log('Fallback reports data:', fallbackData)
          setReports(fallbackData || [])
        }
        return
      }

      console.log('Reports fetched:', data)
      setReports(data || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Reports load nahi hue')
      setReports([])
    }
  }

  const fetchBlockedUsers = async () => {
    console.log('Fetching blocked users...')
    try {
      const { data, error } = await supabase.rpc('get_all_blocks_admin', {
        admin_id: user.id
      })

      if (error) {
        console.error('Error in RPC get_all_blocks_admin:', error)
        // fallback to direct query if RPC fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('blocked_users')
          .select(`
            *,
            blocker:profiles!blocked_users_blocker_id_fkey(id, full_name, email, avatar_url),
            blocked:profiles!blocked_users_blocked_id_fkey(id, full_name, email, avatar_url)
          `)
          .order('created_at', { ascending: false })

        if (fallbackError) {
          console.error('Fallback fetch blocked users error:', fallbackError)
          toast.error('Blocked users load nahi hue')
          setBlockedUsers([])
        } else {
          console.log('Fallback blocked users data:', fallbackData)
          setBlockedUsers(fallbackData || [])
        }
        return
      }

      console.log('Blocked users fetched:', data)
      setBlockedUsers(data || [])
    } catch (error) {
      console.error('Error fetching blocks:', error)
      toast.error('Blocked users load nahi hue')
      setBlockedUsers([])
    }
  }

  const fetchAllUsers = async () => {
    console.log('Fetching all users...')
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error in fetchAllUsers:', error)
        throw error
      }
      console.log('All users data:', data)
      setAllUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Users load nahi hue')
      setAllUsers([])
    }
  }

  const handleReportAction = async (reportId, action, reportedUserId, reportedUserName) => {
    setActionLoading(reportId)
    try {
      const newStatus = action === 'approve' ? 'actioned' : 'dismissed'

      await supabase
        .from('reports')
        .update({
          status: newStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reportId)

      if (action === 'approve') {
        await supabase.from('profiles').delete().eq('id', reportedUserId)
        toast.success(`Report approved & ${reportedUserName} banned permanently`)
      } else {
        toast.success('Report dismissed')
      }

      await Promise.all([fetchReports(), fetchAllUsers(), fetchStats()])
    } catch (error) {
      console.error('Action failed:', error)
      toast.error('Action fail ho gaya: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`${userName} ko permanently delete karna hai? Ye undo nahi hoga!`)) return

    setActionLoading(userId)
    try {
      await supabase.from('profiles').delete().eq('id', userId)
      toast.success(`${userName} deleted successfully`)
      await Promise.all([fetchAllUsers(), fetchReports(), fetchBlockedUsers(), fetchStats()])
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Delete fail ho gaya: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnblock = async (blockId, blockedName) => {
    try {
      await supabase
        .from('blocked_users')
        .delete()
        .eq('id', blockId)

      toast.success(`${blockedName} unblocked successfully`)
      await Promise.all([fetchBlockedUsers(), fetchStats()])
    } catch (error) {
      console.error('Unblock failed:', error)
      toast.error('Unblock fail ho gaya')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const filteredUsers = allUsers.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto animate-pulse text-pink-500" />
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <XCircle className="w-16 h-16 mx-auto text-red-500" />
          <h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">Access Denied</h2>
          <p className="text-gray-500 dark:text-gray-400">Sirf admin hi ye page dekh sakta hai</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-pink-500" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Logged in as: {user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total Users */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Users</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          {/* Pending Reports */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Pending Reports</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingReports}</p>
              </div>
              <Flag className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          {/* Total Blocks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Blocks</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalBlocks}</p>
              </div>
              <Ban className="w-8 h-8 text-red-500" />
            </div>
          </div>
          {/* Total Reports */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Reports</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalReports}</p>
              </div>
              <Flag className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* View Switch Buttons */}
        <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveView('reports')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition ${
              activeView === 'reports'
                ? 'bg-pink-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Flag className="w-4 h-4 inline mr-2" />
            Reports ({reports.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveView('blocks')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition ${
              activeView === 'blocks'
                ? 'bg-pink-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Ban className="w-4 h-4 inline mr-2" />
            Blocks ({blockedUsers.length})
          </button>
          <button
            onClick={() => setActiveView('users')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition ${
              activeView === 'users'
                ? 'bg-pink-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            All Users ({allUsers.length})
          </button>
        </div>

        {/* Reports View */}
        {activeView === 'reports' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <Eye className="w-5 h-5" />
              Reports Management - Kisne Kisko Report Kiya
            </h2>
            {reports.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">Koi report nahi hai abhi</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="border dark:border-gray-700 rounded-lg p-4">
                    {/* Report info */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={report.reporter_avatar || `https://ui-avatars.com/api/?name=${report.reporter_name}`}
                          className="w-10 h-10 rounded-full"
                          alt=""
                        />
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {report.reporter_name || 'Unknown'}
                            <span className="text-xs text-gray-500 ml-1">({report.reporter_email})</span>
                          </p>
                          <p className="text-xs text-red-600 font-bold">
                            ne report kiya → {report.reported_name || 'Unknown'} ({report.reported_email})
                          </p>
                        </div>
                      </div>
                      {/* Status badge */}
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          report.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : report.status === 'actioned'
                            ? 'bg-green-100 text-green-800'
                            : report.status === 'dismissed'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {report.status.toUpperCase()}
                      </span>
                    </div>
                    {/* Report details */}
                    <div className="grid md:grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Reason:</p>
                        <p className="font-medium text-gray-900 dark:text-white">{report.reason}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Date:</p>
                        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(report.created_at).toLocaleString('en-IN')}
                        </p>
                      </div>
                      {report.details && (
                        <div className="md:col-span-2">
                          <p className="text-gray-500 dark:text-gray-400">Details:</p>
                          <p className="font-medium text-gray-900 dark:text-white">{report.details}</p>
                        </div>
                      )}
                    </div>
                    {/* Action buttons */}
                    {report.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() =>
                            handleReportAction(
                              report.id,
                              'approve',
                              report.reported_user_id,
                              report.reported_name
                            )
                          }
                          disabled={actionLoading === report.id}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg transition text-sm font-semibold"
                        >
                          <UserX className="w-4 h-4" />
                          {actionLoading === report.id ? 'Processing...' : 'Approve & Ban User'}
                        </button>
                        <button
                          onClick={() =>
                            handleReportAction(report.id, 'reject', report.reported_user_id, report.reported_name)
                          }
                          disabled={actionLoading === report.id}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white rounded-lg transition text-sm font-semibold"
                        >
                          <XCircle className="w-4 h-4" />
                          Dismiss Report
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Blocks View */}
        {activeView === 'blocks' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <Ban className="w-5 h-5" />
              User Blocks - Kisne Kisko Block Kiya
            </h2>
            {blockedUsers.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">Koi block nahi hai abhi</p>
            ) : (
              <div className="space-y-4">
                {blockedUsers.map((block) => (
                  <div key={block.id} className="border dark:border-gray-700 rounded-lg p-4">
                    {/* Block info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img
                          src={block.blocker_avatar || `https://ui-avatars.com/api/?name=${block.blocker_name}`}
                          className="w-10 h-10 rounded-full"
                          alt=""
                        />
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {block.blocker_name || 'Unknown'}
                            <span className="text-xs text-gray-500 ml-1">({block.blocker_email})</span>
                          </p>
                          <p className="text-xs text-red-600 font-bold">ne block kiya</p>
                        </div>
                        <Ban className="w-5 h-5 text-red-500" />
                        <img
                          src={block.blocked_avatar || `https://ui-avatars.com/api/?name=${block.blocked_name}`}
                          className="w-10 h-10 rounded-full"
                          alt=""
                        />
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {block.blocked_name || 'Unknown'}
                            <span className="text-xs text-gray-500 ml-1">({block.blocked_email})</span>
                          </p>
                        </div>
                      </div>
                      {/* Unblock button & date */}
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(block.created_at).toLocaleDateString('en-IN')}
                        </p>
                        <button
                          onClick={() => handleUnblock(block.id, block.blocked_name)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold transition"
                        >
                          <Unlock className="w-3 h-3" />
                          Unblock
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users View */}
        {activeView === 'users' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <Users className="w-5 h-5" />
              All Users Management - Total: {allUsers.length}
            </h2>
            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            {/* User list */}
            <div className="space-y-3">
              {filteredUsers.map((userProfile) => {
                const isBlocked = blockedUsers.some(b => b.blocked_id === userProfile.id)
                const isAdminUser = userProfile.role === 'admin' || userProfile.email === ADMIN_EMAIL
                return (
                  <div
                    key={userProfile.id}
                    className="border dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={userProfile.avatar_url || `https://ui-avatars.com/api/?name=${userProfile.full_name}`}
                        className="w-12 h-12 rounded-full"
                        alt=""
                      />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {userProfile.full_name || 'No Name'}
                          {(userProfile.role === 'admin' || userProfile.email === ADMIN_EMAIL) && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">ADMIN</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{userProfile.email}</p>
                        <p className="text-xs text-gray-400">
                          {userProfile.country} • Age: {userProfile.age || 'N/A'} • {userProfile.gender || 'N/A'}
                        </p>
                        {isBlocked && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded mt-1 inline-block">BLOCKED</span>
                        )}
                      </div>
                    </div>
                    {/* Delete button for non-admin users */}
                    <div className="flex items-center gap-2">
                      {!isAdminUser && (
                        <button
                          onClick={() => handleDeleteUser(userProfile.id, userProfile.full_name)}
                          disabled={actionLoading === userProfile.id}
                          className="flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white rounded-lg text-xs font-semibold transition"
                        >
                          <Trash2 className="w-4 h-4" />
                          {actionLoading === userProfile.id ? 'Deleting...' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
