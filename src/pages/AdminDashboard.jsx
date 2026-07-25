import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { toast } from 'react-hot-toast'
import { Shield, XCircle } from 'lucide-react'

import AdminFeature from "../components/admin/AdminFeature"
import AdminAction from "../components/admin/AdminAction"

// Master Admin Emails List
const ADMIN_EMAILS = ['lalchandpahan88@gmail.com']

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

  useEffect(() => {
    checkAdminAndFetch()
  }, [user])

  const checkAdminAndFetch = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const userEmail = user.email?.toLowerCase() || ''
      const isMasterAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const isRoleAdmin = isMasterAdmin || profile?.role === 'admin'

      if (!isRoleAdmin) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      setIsAdmin(true)
      await Promise.all([fetchReports(), fetchBlockedUsers(), fetchAllUsers()])
    } catch (err) {
      console.error('Admin check error:', err)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
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

      const userIds = [...new Set([...reportsData.map(r => r.reporter_id), ...reportsData.map(r => r.reported_user_id)])].filter(Boolean)

      if (userIds.length === 0) {
        setReports(reportsData)
        return
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, is_banned')
        .in('id', userIds)

      const reportsWithProfiles = reportsData.map(report => ({
        ...report,
        reporter: profilesData?.find(p => p.id === report.reporter_id),
        reported_user: profilesData?.find(p => p.id === report.reported_user_id)
      }))

      setReports(reportsWithProfiles)
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Reports load nahi hue: ' + error.message)
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

      const userIds = [...new Set([...blocksData.map(b => b.blocker_id), ...blocksData.map(b => b.blocked_id)])].filter(Boolean)

      if (userIds.length === 0) {
        setBlockedUsers(blocksData)
        return
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)

      const blocksWithProfiles = blocksData.map(block => ({
        ...block,
        blocker: profilesData?.find(p => p.id === block.blocker_id),
        blocked: profilesData?.find(p => p.id === block.blocked_id)
      }))

      setBlockedUsers(blocksWithProfiles)
    } catch (error) {
      console.error('Error fetching blocks:', error)
      toast.error('Blocked users load nahi hue: ' + error.message)
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
      toast.error('Users load nahi hue: ' + error.message)
    }
  }

  const handleReportAction = async (target, action, targetUserId) => {
    const reportId = typeof target === 'object' ? target.id : target
    const reportedUserId = targetUserId || (typeof target === 'object' ? target.reported_user_id : null)

    setActionLoading(reportId)
    try {
      const newStatus = action === 'approve' ? 'actioned' : 'dismissed'

      const { error: updateError } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId)

      if (updateError) throw updateError

      if (action === 'approve' && reportedUserId) {
        await supabase
          .from('profiles')
          .update({ is_banned: true })
          .eq('id', reportedUserId)

        setAllUsers(prev => prev.map(u => u.id === reportedUserId ? { ...u, is_banned: true } : u))
        toast.success('Report Approved & User Banned!')
      } else {
        toast.success('Report Dismissed!')
      }

      setReports(prevReports =>
        prevReports.map(r => (r.id === reportId ? { ...r, status: newStatus } : r))
      )

    } catch (error) {
      console.error('Action failed:', error)
      toast.error('Action fail ho gaya: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  // 🟢 Unban Handler: User unban hoga aur Report list se remove/hide ho jayega
  const handleUnbanUser = async (target, targetUserId) => {
    const reportId = typeof target === 'object' ? target.id : target
    const reportedUserId = targetUserId || (typeof target === 'object' ? target.reported_user_id : null)

    setActionLoading(reportId)
    try {
      // 1. Unban User in Database Profiles Table
      if (reportedUserId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_banned: false })
          .eq('id', reportedUserId)

        if (profileError) throw profileError

        setAllUsers(prev => prev.map(u => u.id === reportedUserId ? { ...u, is_banned: false } : u))
      }

      // 2. Mark report status as 'dismissed' or 'resolved' so it stops showing in Active Reports list
      if (reportId) {
        const { error: reportError } = await supabase
          .from('reports')
          .update({ status: 'dismissed' })
          .eq('id', reportId)

        if (reportError) throw reportError

        // Remove from local active reports view immediately
        setReports(prevReports => prevReports.filter(r => r.id !== reportId))
      }

      toast.success('User Unbanned & Report Cleared!')
    } catch (error) {
      console.error('Unban failed:', error)
      toast.error('Unban fail ho gaya: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }
const handleDeleteUser = async (userId, userName, isSilent = false) => {
    if (!isSilent) {
      if (!window.confirm(`${userName || 'Is user'} ko permanent delete karna hai?`)) return
    }
    setActionLoading(userId)
    try {
      // 1. First clear all referencing records in related tables
      await supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      await supabase.from('likes').delete().or(`liker_id.eq.${userId},liked_id.eq.${userId}`)
      await supabase.from('blocked_users').delete().or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
      await supabase.from('reports').delete().or(`reporter_id.eq.${userId},reported_user_id.eq.${userId}`)
      
      // 🟢 ADDED: Delete notifications referencing this user
      await supabase.from('notifications').delete().eq('user_id', userId)

      // 2. Now delete the profile
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      
      if (error) {
        console.warn('Profile delete restriction:', error.message)
        if (!isSilent) toast.error('Delete restriction: ' + error.message)
      } else {
        if (!isSilent) toast.success('User deleted successfully')
        setAllUsers(prev => prev.filter(u => u.id !== userId))
        setReports(prev => prev.filter(r => r.reporter_id !== userId && r.reported_user_id !== userId))
        setBlockedUsers(prev => prev.filter(b => b.blocker_id !== userId && b.blocked_id !== userId))
      }

    } catch (error) {
      console.error('Delete failed:', error)
      if (!isSilent) toast.error('Delete fail: ' + error.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnblock = async (blockId) => {
    try {
      const { error } = await supabase.from('blocked_users').delete().eq('id', blockId)
      if (error) throw error
      toast.success('User unblocked')
      setBlockedUsers(prev => prev.filter(b => b.id !== blockId))
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
        .maybeSingle()

      if (existing) {
        toast.error('User pehle se blocked hai')
        return
      }

      const { error } = await supabase
        .from('blocked_users')
        .insert({ blocker_id: user.id, blocked_id: userId })

      if (error) throw error

      toast.success(`${userName} blocked successfully`)
      await fetchBlockedUsers()

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
      toast.error('Report reason likhna zaroori hai')
      return
    }
    try {
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: reportingUserId,
        reason: reportReason,
        details: 'Reported by Admin',
        status: 'pending'
      })
      if (error) throw error

      toast.success('Report submitted successfully')
      setShowReportModal(false)
      setReportReason('')
      setReportingUserId(null)
      fetchReports()
    } catch (error) {
      console.error('Report failed:', error)
      toast.error('Report fail ho gaya: ' + error.message)
    }
  }

  const filteredUsers = allUsers.filter(u =>
    (u.full_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (u.email || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  )

  // Pure Active/Pending Reports display honge (dismissed ya resolved list se hidden rahenge)
  const activeReports = reports.filter(r => r.status !== 'dismissed' && r.status !== 'resolved')
  const pendingReports = reports.filter(r => r.status === 'pending').length
  const totalBlocked = blockedUsers.length

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto animate-pulse text-pink-500" />
          <p className="mt-2 text-gray-600 dark:text-gray-400 font-medium">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm">
          <XCircle className="w-16 h-16 mx-auto text-red-500" />
          <h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">Access Denied</h2>
          <p className="text-gray-500 mt-2 text-sm">Aapko is page ka admin access nahi hai.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-pink-500" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage reports, blocks & user permissions</p>
          </div>
        </div>

        <AdminFeature 
          pendingReports={pendingReports}
          totalBlocked={totalBlocked}
          totalUsers={allUsers.length}
          activeReportsCount={activeReports.length}
          activeView={activeView}
          setActiveView={setActiveView}
        />

        <AdminAction 
          activeView={activeView}
          activeReports={activeReports}
          blockedUsers={blockedUsers}
          filteredUsers={filteredUsers}
          actionLoading={actionLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleReportAction={handleReportAction}
          handleUnbanUser={handleUnbanUser}
          handleUnblock={handleUnblock}
          openReportModal={openReportModal}
          handleDirectBlock={handleDirectBlock}
          handleDeleteUser={handleDeleteUser}
          showReportModal={showReportModal}
          setShowReportModal={setShowReportModal}
          reportReason={reportReason}
          setReportReason={setReportReason}
          handleAdminReport={handleAdminReport}
        />
      </div>
    </div>
  )
}

export default AdminDashboard