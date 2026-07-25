import React from 'react'
import { Eye, Ban, Users, CheckCircle, XCircle, Unlock, Search, Flag, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react'

export default function AdminAction({
  activeView,
  activeReports = [],
  blockedUsers = [],
  filteredUsers = [],
  actionLoading,
  searchQuery,
  setSearchQuery,
  handleReportAction,
  handleUnbanUser,
  handleUnblock,
  openReportModal,
  handleDirectBlock,
  handleDeleteUser,
  showReportModal,
  setShowReportModal,
  reportReason,
  setReportReason,
  handleAdminReport
}) {
  return (
    <>
      {/* 1. REPORTS VIEW */}
      {activeView === 'reports' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-pink-500" />Reports Management
          </h2>
          {activeReports.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Koi active report nahi hai</p>
          ) : (
            activeReports.map((report) => {
              const isActioned = report.status === 'actioned' || report.status === 'approved' || report.reported_user?.is_banned

              return (
                <div 
                  key={report.id} 
                  className={`border rounded-lg p-4 mb-4 transition-all ${
                    isActioned 
                      ? 'border-red-500/50 bg-red-50/30 dark:bg-red-950/20' 
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={report.reporter?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.reporter?.full_name || 'Reporter')}`} 
                        className="w-10 h-10 rounded-full object-cover border" 
                        alt="Reporter"
                      />
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">
                          {report.reporter?.full_name || 'Unknown Reporter'}
                        </p>
                        <p className="text-xs text-gray-500">
                          ne report kiya → {' '}
                          <span className={`font-bold ${isActioned ? 'text-red-600 dark:text-red-400 underline' : 'text-pink-500'}`}>
                            {report.reported_user?.full_name || 'Unknown User'}
                            {isActioned && ' (BANNED)'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      isActioned
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : report.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {isActioned ? 'BANNED / ACTIONED' : (report.status ? report.status.toUpperCase() : 'PENDING')}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-lg border dark:border-gray-700">
                    <b className="text-gray-900 dark:text-white">Reason:</b> {report.reason}
                  </p>

                  {/* Pending Action Buttons */}
                  {!isActioned && report.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => handleReportAction(report.id, 'approve', report.reported_user_id)} 
                        disabled={actionLoading === report.id} 
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {actionLoading === report.id ? 'Processing...' : 'Approve & Ban'}
                      </button>
                      <button 
                        onClick={() => handleReportAction(report.id, 'reject', report.reported_user_id)} 
                        disabled={actionLoading === report.id} 
                        className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition"
                      >
                        <XCircle className="w-4 h-4" />
                        {actionLoading === report.id ? 'Processing...' : 'Dismiss'}
                      </button>
                    </div>
                  )}

                  {/* Banned/Actioned state pe Unban button */}
                  {isActioned && (
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => handleUnbanUser(report.id, report.reported_user_id)} 
                        disabled={actionLoading === report.id} 
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition"
                      >
                        <Unlock className="w-4 h-4" />
                        {actionLoading === report.id ? 'Unbanning...' : 'Unban User'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* 2. BLOCKS VIEW */}
      {activeView === 'blocks' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-500" />User Blocks
          </h2>
          {blockedUsers.length === 0 ? (
            <p className="text-center py-8 text-gray-500">Koi blocked user nahi hai</p>
          ) : (
            blockedUsers.map((block) => (
              <div key={block.id} className="border dark:border-gray-700 rounded-lg p-4 mb-3 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30">
                <div className="flex items-center gap-3">
                  <img 
                    src={block.blocker?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(block.blocker?.full_name || 'Blocker')}`} 
                    className="w-9 h-9 rounded-full object-cover border" 
                    alt="Blocker"
                  />
                  <Ban className="w-4 h-4 text-red-500 shrink-0" />
                  <img 
                    src={block.blocked?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(block.blocked?.full_name || 'Blocked')}`} 
                    className="w-9 h-9 rounded-full object-cover border" 
                    alt="Blocked"
                  />
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                      {block.blocked?.full_name || 'Blocked User'}
                    </p>
                    <p className="text-xs text-gray-500">Blocked by: <span className="font-medium text-gray-700 dark:text-gray-300">{block.blocker?.full_name || 'Admin/User'}</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => handleUnblock(block.id)} 
                  disabled={actionLoading === block.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  {actionLoading === block.id ? 'Unblocking...' : 'Unblock'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. USERS VIEW */}
      {activeView === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />All Users ({filteredUsers.length})
          </h2>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search users by name, email or username..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:outline-none focus:border-pink-500" 
            />
          </div>

          {filteredUsers.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No users found.</p>
          ) : (
            filteredUsers.map((userProfile) => {
              const isBlocked = blockedUsers.some(b => b.blocked_id === userProfile.id)
              const isBanned = userProfile.is_banned === true

              return (
                <div key={userProfile.id} className="border dark:border-gray-700 rounded-lg p-4 mb-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                  <div className="flex items-center gap-3">
                    <img 
                      src={userProfile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.full_name || 'User')}`} 
                      className="w-11 h-11 rounded-full object-cover border" 
                      alt="User Avatar"
                    />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                        {userProfile.full_name || 'User'}
                        {isBanned && (
                          <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ShieldAlert size={10}/> BANNED
                          </span>
                        )}
                        {isBlocked && !isBanned && (
                          <span className="text-[10px] bg-yellow-100 text-yellow-800 border border-yellow-200 font-bold px-2 py-0.5 rounded-full">
                            BLOCKED
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{userProfile.email || userProfile.username || 'No email/username'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => openReportModal(userProfile.id)} 
                      className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
                    >
                      <Flag className="w-3.5 h-3.5" />Report
                    </button>

                    <button 
                      onClick={() => handleDirectBlock(userProfile.id, userProfile.full_name)} 
                      disabled={isBlocked || isBanned || actionLoading === userProfile.id} 
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                        isBlocked || isBanned 
                          ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                          : 'bg-red-500 hover:bg-red-600 text-white'
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />Block
                    </button>

                    <button 
                      onClick={() => handleDeleteUser(userProfile.id, userProfile.full_name)} 
                      disabled={actionLoading === userProfile.id} 
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {actionLoading === userProfile.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full border dark:border-gray-700 shadow-2xl">
            <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />Report User
            </h3>
            <textarea 
              value={reportReason} 
              onChange={(e) => setReportReason(e.target.value)} 
              placeholder="Report karne ki wajah likhein..." 
              className="w-full border dark:border-gray-600 rounded-xl p-3 text-sm dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-pink-500 resize-none" 
              rows="4" 
            />
            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => setShowReportModal(false)} 
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleAdminReport} 
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition shadow-md"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}