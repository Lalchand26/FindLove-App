import React, { useState } from 'react'
import { Flag, Ban, Users, Trash2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { supabase } from "../../lib/supabase";
import { toast } from 'react-hot-toast'

export default function AdminFeature({ 
  pendingReports = 0, 
  totalBlocked = 0, 
  totalUsers = 0, 
  activeReportsCount = 0,
  activeView,
  setActiveView,
  usersList = [],       // Pass users array from parent
  setUsersList         // Pass setUsers setter function from parent
}) {
  const [loadingId, setLoadingId] = useState(null)

  // 1. Toggle Ban / Unban User Handler
  const handleToggleBan = async (userId, currentBanStatus) => {
    setLoadingId(userId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: !currentBanStatus })
        .eq('id', userId)

      if (error) throw error

      toast.success(currentBanStatus ? "User Unbanned Successfully! 🎉" : "User Banned Successfully! 🚫")

      // 💥 INSTANT UI UPDATE (React State Update)
      if (setUsersList) {
        setUsersList(prev => 
          prev.map(u => u.id === userId ? { ...u, is_banned: !currentBanStatus } : u)
        )
      }
    } catch (err) {
      toast.error("Action failed: " + err.message)
    } finally {
      setLoadingId(null)
    }
  }

  // 2. Delete User Handler
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("⚠️ Are you sure you want to permanently delete this user?")) return

    setLoadingId(userId)
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      toast.success("User deleted successfully!")

      // 💥 INSTANT UI REMOVAL (React State Update)
      if (setUsersList) {
        setUsersList(prev => prev.filter(u => u.id !== userId))
      }
    } catch (err) {
      toast.error("Delete failed: " + err.message)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-medium">Pending Reports</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingReports}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-medium">Total Blocks</p>
          <p className="text-2xl font-bold text-red-600">{totalBlocked}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-medium">Total Users</p>
          <p className="text-2xl font-bold text-blue-600">{totalUsers}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-medium">Active Reports</p>
          <p className="text-2xl font-bold text-purple-600">{activeReportsCount}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 bg-white dark:bg-gray-800 p-2 rounded-xl border dark:border-gray-700 shadow-sm">
        <button 
          onClick={() => setActiveView('reports')} 
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            activeView === 'reports' ? 'bg-pink-500 text-white' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Flag className="w-4 h-4 inline mr-2" />
          Reports ({activeReportsCount})
        </button>
        <button 
          onClick={() => setActiveView('blocks')} 
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            activeView === 'blocks' ? 'bg-pink-500 text-white' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Ban className="w-4 h-4 inline mr-2" />
          Blocks ({totalBlocked})
        </button>
        <button 
          onClick={() => setActiveView('users')} 
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            activeView === 'users' ? 'bg-pink-500 text-white' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          All Users ({totalUsers})
        </button>
      </div>

      {/* Dynamic View Section */}
      {activeView === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 shadow-sm space-y-3">
          <h3 className="text-lg font-bold dark:text-white mb-2">User Management</h3>
          <div className="divide-y dark:divide-gray-700">
            {usersList && usersList.length > 0 ? (
              usersList.map((user) => (
                <div key={user.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.avatar_url || 'https://via.placeholder.com/40'} 
                      className="w-10 h-10 rounded-full object-cover border" 
                      alt="avatar" 
                    />
                    <div>
                      <p className="font-semibold text-sm dark:text-white flex items-center gap-2">
                        {user.full_name || 'No Name'} 
                        {user.is_banned && (
                          <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Banned
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{user.email || user.username || 'No email/username'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Ban / Unban Button */}
                    <button
                      onClick={() => handleToggleBan(user.id, user.is_banned)}
                      disabled={loadingId === user.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        user.is_banned 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      }`}
                    >
                      {user.is_banned ? <ShieldCheck size={14}/> : <ShieldAlert size={14}/>}
                      {user.is_banned ? 'Unban' : 'Ban'}
                    </button>

                    {/* Delete User Button */}
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={loadingId === user.id}
                      className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg text-xs transition"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm py-4 text-center">No users found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}