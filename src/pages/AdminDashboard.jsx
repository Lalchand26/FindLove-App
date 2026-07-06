import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'react-hot-toast'
import { Shield, CheckCircle, XCircle, Eye, Clock, Ban, Flag, Users, Trash2, Unlock, AlertTriangle, Search } from 'lucide-react'

function AdminDashboard() {
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [blockedUsers, setBlockedUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeView, setActiveView] = useState('reports')
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportingUserId, setReportingUserId] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const ADMIN_EMAIL = 'lalchandpahan88@gmail.com'

  useEffect(() => {
    checkAdminAndFetch()
  }, [user])

  const checkAdminAndFetch = async () => {
    if (!user?.email) {
      setLoading(false)
      return
    }

    if (user.email!== ADMIN_EMAIL) {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    setIsAdmin(true)
    await Promise.all([fetchReports(), fetchBlockedUsers(), fetchAllUsers()])
    setLoading(false)
  }

  const fetchReports = async () => {
    try {
      const { data: reportsData, error: reportsError } = await supabase
       .from('reports')
       .select('*')
       .order('created_at', { ascending: false })

      if (reportsError) throw reportsError
      if (!reportsData || reportsData.length === 0) {
        setReports([])
        return
      }

      const userIds = [
       ...new Set([
         ...reportsData.map(r => r.reporter_id),
         ...reportsData.map(r => r.reported_user_id)
        ])
      ]

      const { data: profilesData, error: profilesError } = await supabase
       .from('profiles')
       .select('id, full_name, email, avatar_url')
       .in('id', userIds)

      if (profilesError) throw profilesError

      const reportsWithProfiles = reportsData.map(report => ({
       ...report,
        reporter: profilesData.find(p => p.id === report.reporter_id),
        reported_user: profilesData.find(p => p.id === report.reported_user_id)
      }))

      setReports(reportsWithProfiles)
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Reports load nahi hue', { id: 'report-error' })
    }
  }

  const fetchBlockedUsers = async () => {
    try {
      const { data: blocksData, error: blocksError } = await supabase
       .from('blocked_users')
       .select('*')
       .order('created_at', { ascending: false })

      if (blocksError) throw blocksError
      if (!blocksData || blocksData.length === 0) {
        setBlockedUsers([])
        return
      }

      const userIds = [
       ...new Set([
         ...blocksData.map(b => b.blocker_id),
         ...blocksData.map(b => b.blocked_id)
        ])
      ]

      const { data: profilesData, error: profilesError } = await supabase
       .from('profiles')
       .select('id, full_name, email, avatar_url')
       .in('id', userIds)

      if (profilesError) throw profilesError

      const blocksWithProfiles = blocksData.map(block => ({
       ...block,
        blocker: profilesData.find(p => p.id === block.blocker_id),
        blocked: profilesData.find(p => p.id === block.blocked_id)
      }))

      setBlockedUsers(blocksWithProfiles)
    } catch (error) {
      console.error('Error fetching blocks:', error)
      toast.error('Blocked users load nahi hue', { id: 'block-error' })
    }
  }

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
       .from('profiles')
       .select('*')
       .order('created_at', { ascending: false })

      if (error) throw error
      setAllUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Users load nahi hue', { id: 'user-error' })
    }
  }

  const handleReportAction = async (reportId, action, reportedUserId) => {
    setActionLoading(reportId)
    try {
      const newStatus = action === 'approve'? 'actioned' : 'dismissed'

      await supabase
       .from('reports')
       .update({
          status: newStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
       .eq('id', reportId)

      if (action === 'approve') {
        const { error } = await supabase.functions.invoke('ban-user', {
          body: {
            user_id: reportedUserId,
            admin_email: user.email
          }
        })

        if (error) throw error
        toast.success('Report approved & User banned permanently')
      } else {
        toast.success('Report dismissed')
      }

      fetchReports()
      fetchBlockedUsers()
      fetchAllUsers()
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
      const { error } = await supabase.functions.invoke('ban-user', {
        body: {
          user_id: userId,
          admin_email: user.email
        }
      })

      if (error) throw error

      toast.success('User banned & deleted successfully')
      fetchAllUsers()
      fetchReports()
      fetchBlockedUsers()
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Delete fail ho gaya: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnblock = async (blockId) => {
    try {
      await supabase
       .from('blocked_users')
       .delete()
       .eq('id', blockId)

      toast.success('User unblocked')
      fetchBlockedUsers()
    } catch (error) {
      console.error('Unblock failed:', error)
      toast.error('Unblock fail ho gaya')
    }
  }

  const handleDirectBlock = async (userId, userName) => {
    if (!window.confirm(`${userName} ko block karna hai?`)) return

    setActionLoading(userId)
    try {
      const { data: existing } = await supabase
       .from('blocked_users')
       .select('id')
       .eq('blocker_id', user.id)
       .eq('blocked_id', userId)
       .single()

      if (existing) {
        toast.error('User already blocked hai')
        setActionLoading(null)
        return
      }

      await supabase
       .from('blocked_users')
       .insert({
          blocker_id: user.id,
          blocked_id: userId
        })

      toast.success(`${userName} blocked successfully`)
      fetchBlockedUsers()
    } catch (error) {
      console.error('Block failed:', error)
      toast.error('Block fail ho gaya')
    } finally {
      setActionLoading(null)
    }
  }

  const openReportModal = (userId) => {
    setReportingUserId(userId)
    setReportReason('')
    setShowReportModal(true)
  }

  const handleAdminReport = async () => {
    if (!reportReason.trim()) {
      toast.error('Report reason likho')
      return
    }

    try {
      await supabase
       .from('reports')
       .insert({
          reporter_id: user.id,
          reported_user_id: reportingUserId,
          reason: reportReason,
          details: 'Reported by Admin',
          status: 'pending'
        })

      toast.success('Report submitted successfully')
      setShowReportModal(false)
      setReportReason('')
      setReportingUserId(null)
      fetchReports()
    } catch (error) {
      console.error('Report failed:', error)
      toast.error('Report fail ho gaya')
    }
  }

  const filteredUsers = allUsers.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
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

  const pendingReports = reports.filter(r => r.status === 'pending').length
  const totalBlocked = blockedUsers.length
  const displayedReports = reports

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-pink-500" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage reports, blocks & users</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Pending Reports</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingReports}</p>
              </div>
              <Flag className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Blocks</p>
                <p className="text-2xl font-bold text-red-600">{totalBlocked}</p>
              </div>
              <Ban className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Users</p>
                <p className="text-2xl font-bold text-blue-600">{allUsers.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Reports</p>
                <p className="text-2xl font-bold text-purple-600">{reports.length}</p>
              </div>
              <Flag className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

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
            Reports ({reports.length})
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

        {activeView === 'reports' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <Eye className="w-5 h-5" />
              Reports Management
            </h2>

            {displayedReports.length === 0? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">Koi report nahi hai abhi</p>
            ) : (
              <div className="space-y-4">
                {displayedReports.map((report) => (
                  <div key={report.id} className="border dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={report.reporter?.avatar_url || `https://ui-avatars.com/api/?name=${report.reporter?.full_name}`}
                          className="w-10 h-10 rounded-full"
                          alt=""
                        />
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {report.reporter?.full_name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-gray-500">ne report kiya → {report.reported_user?.full_name || 'Unknown'}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        report.status === 'pending'? 'bg-yellow-100 text-yellow-800' :
                        report.status === 'actioned'? 'bg-green-100 text-green-800' :
                        report.status === 'dismissed'? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {report.status.toUpperCase()}
                      </span>
                    </div>

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

                    {report.status === 'pending' && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleReportAction(report.id, 'approve', report.reported_user_id)}
                          disabled={actionLoading === report.id}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg transition text-sm font-semibold"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {actionLoading === report.id? 'Processing...' : 'Approve & Ban User'}
                        </button>
                        <button
                          onClick={() => handleReportAction(report.id, 'reject', report.reported_user_id)}
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

        {activeView === 'blocks' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <Ban className="w-5 h-5" />
              User Blocks
            </h2>

            {blockedUsers.length === 0? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">Koi block nahi hai abhi</p>
            ) : (
              <div className="space-y-4">
                {blockedUsers.map((block) => (
                  <div key={block.id} className="border dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img
                          src={block.blocker?.avatar_url || `https://ui-avatars.com/api/?name=${block.blocker?.full_name}`}
                          className="w-10 h-10 rounded-full"
                          alt=""
                        />
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {block.blocker?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">ne block kiya</p>
                        </div>
                        <Ban className="w-5 h-5 text-red-500" />
                        <img
                          src={block.blocked?.avatar_url || `https://ui-avatars.com/api/?name=${block.blocked?.full_name}`}
                          className="w-10 h-10 rounded-full"
                          alt=""
                        />
                        <div>
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {block.blocked?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">{block.blocked?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(block.created_at).toLocaleDateString('en-IN')}
                        </p>
                        <button
                          onClick={() => handleUnblock(block.id)}
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

        {activeView === 'users' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <Users className="w-5 h-5" />
              All Users Management
            </h2>

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

            <div className="space-y-3">
              {filteredUsers.map((userProfile) => {
                const isBlocked = blockedUsers.some(b => b.blocked_id === userProfile.id)
                return (
                  <div key={userProfile.id} className="border dark:border-gray-700 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img
                        src={userProfile.avatar_url || `https://ui-avatars.com/api/?name=${userProfile.full_name}`}
                        className="w-12 h-12 rounded-full"
                        alt=""
                      />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{userProfile.full_name || 'No Name'}</p>
                        <p className="text-xs text-gray-500">{userProfile.email}</p>
                        <p className="text-xs text-gray-400">
                          {userProfile.country} • Age: {userProfile.age || 'N/A'} • {userProfile.gender || 'N/A'}
                        </p>
                        {isBlocked && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded mt-1 inline-block">BLOCKED</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openReportModal(userProfile.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-semibold transition"
                      >
                        <Flag className="w-4 h-4" />
                        Report
                      </button>
                      <button
                        onClick={() => handleDirectBlock(userProfile.id, userProfile.full_name)}
                        disabled={isBlocked || actionLoading === userProfile.id}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                          isBlocked
                           ? 'bg-gray-400 cursor-not-allowed text-white'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                      >
                        <Ban className="w-4 h-4" />
                        Block
                      </button>
                      <button
                        onClick={() => handleDeleteUser(userProfile.id, userProfile.full_name)}
                        disabled={actionLoading === userProfile.id}
                        className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-lg text-xs font-semibold transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        {actionLoading === userProfile.id? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Report User
              </h3>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Report ka reason likho..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm dark:bg-gray-700 dark:text-white"
                rows="4"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdminReport}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard