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

      const userIds = [...new Set([...reportsData.map(r => r.reporter_id),...reportsData.map(r => r.reported_user_id)])]

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
      toast.error('Reports load nahi hue')
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

      const userIds = [...new Set([...blocksData.map(b => b.blocker_id),...blocksData.map(b => b.blocked_id)])]

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
      toast.error('Blocked users load nahi hue')
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
      toast.error('Users load nahi hue')
    }
  }

  const handleReportAction = async (reportId, action, reportedUserId) => {
    setActionLoading(reportId)
    try {
      const newStatus = action === 'approve'? 'actioned' : 'dismissed'

      await supabase
       .from('reports')
       .update({ status: newStatus, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
       .eq('id', reportId)

      if (action === 'approve') {
        // Direct ban: profile + data delete
        await handleDeleteUser(reportedUserId, 'Reported User', true)
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

  const handleDeleteUser = async (userId, userName, isSilent = false) => {
    if (!isSilent) {
      if (!window.confirm(`${userName} ko permanently delete karna hai? Ye undo nahi hoga!`)) return
    }
    setActionLoading(userId)
    try {
      // 1. Saara related data delete karo pehle
      await supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      await supabase.from('likes').delete().or(`liker_id.eq.${userId},liked_id.eq.${userId}`)
      await supabase.from('blocked_users').delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
      await supabase.from('reports').delete().or(`reporter_id.eq.${userId},reported_user_id.eq.${userId}`)

      // 2. Profile delete
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) throw error

      if (!isSilent) toast.success('User deleted successfully')
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
      await supabase.from('blocked_users').delete().eq('id', blockId)
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
       .maybeSingle() // FIX:.single() ki jagah

      if (existing) {
        toast.error('User already blocked hai')
        setActionLoading(null)
        return
      }

      const { error } = await supabase.from('blocked_users').insert({ blocker_id: user.id, blocked_id: userId })
      if (error) throw error

      toast.success(`${userName} blocked successfully`)
      fetchBlockedUsers()
    } catch (error) {
      console.error('Block failed:', error)
      toast.error('Block fail ho gaya: ' + error.message)
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
      await supabase.from('reports').insert({
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
    return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><Shield className="w-12 h-12 mx-auto animate-pulse text-pink-500" /><p className="mt-2 text-gray-600 dark:text-gray-400">Loading admin panel...</p></div>
  }
  if (!isAdmin) {
    return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900"><XCircle className="w-16 h-16 mx-auto text-red-500" /><h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">Access Denied</h2></div>
  }

  const pendingReports = reports.filter(r => r.status === 'pending').length
  const totalBlocked = blockedUsers.length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-pink-500" />
          <div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1><p className="text-sm text-gray-500 dark:text-gray-400">Manage reports, blocks & users</p></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border"><p className="text-xs text-gray-500 uppercase">Pending Reports</p><p className="text-2xl font-bold text-yellow-600">{pendingReports}</p></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border"><p className="text-xs text-gray-500 uppercase">Total Blocks</p><p className="text-2xl font-bold text-red-600">{totalBlocked}</p></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border"><p className="text-xs text-gray-500 uppercase">Total Users</p><p className="text-2xl font-bold text-blue-600">{allUsers.length}</p></div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border"><p className="text-xs text-gray-500 uppercase">Total Reports</p><p className="text-2xl font-bold text-purple-600">{reports.length}</p></div>
        </div>

        <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 p-2 rounded-xl border">
          <button onClick={() => setActiveView('reports')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold ${activeView === 'reports'? 'bg-pink-500 text-white' : 'text-gray-600'}`}><Flag className="w-4 h-4 inline mr-2" />Reports ({reports.length})</button>
          <button onClick={() => setActiveView('blocks')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold ${activeView === 'blocks'? 'bg-pink-500 text-white' : 'text-gray-600'}`}><Ban className="w-4 h-4 inline mr-2" />Blocks ({blockedUsers.length})</button>
          <button onClick={() => setActiveView('users')} className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold ${activeView === 'users'? 'bg-pink-500 text-white' : 'text-gray-600'}`}><Users className="w-4 h-4 inline mr-2" />All Users ({allUsers.length})</button>
        </div>

        {activeView === 'reports' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Eye className="w-5 h-5" />Reports Management</h2>
            {reports.length === 0? <p className="text-center py-8">Koi report nahi hai</p> : reports.map((report) => (
              <div key={report.id} className="border rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <img src={report.reporter?.avatar_url || `https://ui-avatars.com/api/?name=${report.reporter?.full_name}`} className="w-10 h-10 rounded-full" />
                    <div><p className="font-semibold text-sm">{report.reporter?.full_name}</p><p className="text-xs text-gray-500">ne report kiya → {report.reported_user?.full_name}</p></div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${report.status === 'pending'? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{report.status.toUpperCase()}</span>
                </div>
                <p className="text-sm mb-2"><b>Reason:</b> {report.reason}</p>
                {report.status === 'pending' && (
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => handleReportAction(report.id, 'approve', report.reported_user_id)} disabled={actionLoading === report.id} className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold"><CheckCircle className="w-4 h-4" />Approve & Ban</button>
                    <button onClick={() => handleReportAction(report.id, 'reject', report.reported_user_id)} disabled={actionLoading === report.id} className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold"><XCircle className="w-4 h-4" />Dismiss</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeView === 'blocks' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Ban className="w-5 h-5" />User Blocks</h2>
            {blockedUsers.length === 0? <p className="text-center py-8">Koi block nahi hai</p> : blockedUsers.map((block) => (
              <div key={block.id} className="border rounded-lg p-4 mb-4 flex justify-between">
                <div className="flex items-center gap-4">
                  <img src={block.blocker?.avatar_url} className="w-10 h-10 rounded-full" />
                  <Ban className="w-5 h-5 text-red-500" />
                  <img src={block.blocked?.avatar_url} className="w-10 h-10 rounded-full" />
                  <div><p className="font-semibold text-sm">{block.blocked?.full_name}</p><p className="text-xs text-gray-500">{block.blocked?.email}</p></div>
                </div>
                <button onClick={() => handleUnblock(block.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold"><Unlock className="w-3 h-3" />Unblock</button>
              </div>
            ))}
          </div>
        )}

        {activeView === 'users' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5" />All Users</h2>
            <div className="mb-4 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700" /></div>
            {filteredUsers.map((userProfile) => {
              const isBlocked = blockedUsers.some(b => b.blocked_id === userProfile.id)
              return (
                <div key={userProfile.id} className="border rounded-lg p-4 mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={userProfile.avatar_url || `https://ui-avatars.com/api/?name=${userProfile.full_name}`} className="w-12 h-12 rounded-full" />
                    <div><p className="font-semibold">{userProfile.full_name}</p><p className="text-xs text-gray-500">{userProfile.email}</p>{isBlocked && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">BLOCKED</span>}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openReportModal(userProfile.id)} className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-xs font-semibold"><Flag className="w-4 h-4 inline" />Report</button>
                    <button onClick={() => handleDirectBlock(userProfile.id, userProfile.full_name)} disabled={isBlocked} className={`px-3 py-2 rounded-lg text-xs font-semibold ${isBlocked? 'bg-gray-400' : 'bg-red-500 text-white'}`}><Ban className="w-4 h-4 inline" />Block</button>
                    <button onClick={() => handleDeleteUser(userProfile.id, userProfile.full_name)} disabled={actionLoading === userProfile.id} className="px-3 py-2 bg-gray-700 text-white rounded-lg text-xs font-semibold"><Trash2 className="w-4 h-4 inline" />{actionLoading === userProfile.id? 'Deleting...' : 'Delete'}</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {showReportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-500" />Report User</h3>
              <textarea value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="Report ka reason likho..." className="w-full border rounded-lg p-3 text-sm dark:bg-gray-700" rows="4" />
              <div className="flex gap-2 mt-4"><button onClick={() => setShowReportModal(false)} className="flex-1 px-4 py-2 bg-gray-200 rounded-lg text-sm font-semibold">Cancel</button><button onClick={handleAdminReport} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold">Submit</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard