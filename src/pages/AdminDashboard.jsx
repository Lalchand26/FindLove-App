import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total_users: 0, pending_reports: 0, total_blocks: 0, total_reports: 0 });
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'blocks' | 'users'
  const [reports, setReports] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    getAdminSession();
    fetchDashboardData();
  }, [activeTab]);

  // Admin user check
  const getAdminSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setAdminEmail(user.email);
  };

  // Main Data Fetcher
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats Counter via RPC
      const { data: statsData, error: statsErr } = await supabase.rpc('get_admin_dashboard_stats');
      if (!statsErr && statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // 2. Tab Based Dynamic Data Fetching with Profiles Join
      if (activeTab === 'reports') {
        const { data: reportsData } = await supabase
          .from('reports')
          .select(`
            *,
            reporter:profiles!reports_reporter_id_fkey(email, full_name),
            reported:profiles!reports_reported_user_id_fkey(email, full_name)
          `)
          .order('created_at', { ascending: false });
        setReports(reportsData || []);
      } 
      
      else if (activeTab === 'blocks') {
        const { data: blocksData } = await supabase
          .from('blocked_users')
          .select(`
            *,
            blocker:profiles!blocked_users_blocker_id_fkey(email, full_name),
            blocked:profiles!blocked_users_blocked_id_fkey(email, full_name)
          `)
          .order('created_at', { ascending: false });
        setBlocks(blocksData || []);
      } 
      
      else if (activeTab === 'users') {
        const { data: usersData } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        setUsers(usersData || []);
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Action Handlers
  const handleUpdateReportStatus = async (reportId, newStatus) => {
    const { error } = await supabase
      .from('reports')
      .update({ status: newStatus })
      .eq('id', reportId);

    if (!error) fetchDashboardData();
  };

  const handleUnblockUser = async (blockId) => {
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('id', blockId);

    if (!error) fetchDashboardData();
  };

  const handleToggleUserBan = async (userId, currentBanStatus) => {
    // Assuming you have an 'is_banned' column in profiles table
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: !currentBanStatus })
      .eq('id', userId);

    if (!error) fetchDashboardData();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto flex justify-between items-center bg-white p-6 rounded-xl shadow-sm mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            🛡️ Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">Logged in as: <span className="font-semibold text-gray-700">{adminEmail || 'lalchandpahan88@gmail.com'}</span></p>
        </div>
        <button 
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-medium px-5 py-2 rounded-lg transition shadow-sm flex items-center gap-2"
        >
          Logout 🚪
        </button>
      </div>

      {/* Stats Counter Row (Exactly as seen in image_af60a1.png) */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500 flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Users</p>
            <h3 className="text-3xl font-black text-blue-600 mt-1">{stats.total_users}</h3>
          </div>
          <span className="text-2xl bg-blue-50 p-3 rounded-full">👥</span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500 flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Reports</p>
            <h3 className="text-3xl font-black text-yellow-600 mt-1">{stats.pending_reports}</h3>
          </div>
          <span className="text-2xl bg-yellow-50 p-3 rounded-full">⚠️</span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500 flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Blocks</p>
            <h3 className="text-3xl font-black text-red-600 mt-1">{stats.total_blocks}</h3>
          </div>
          <span className="text-2xl bg-red-50 p-3 rounded-full">🚫</span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500 flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Reports</p>
            <h3 className="text-3xl font-black text-purple-600 mt-1">{stats.total_reports}</h3>
          </div>
          <span className="text-2xl bg-purple-50 p-3 rounded-full">📊</span>
        </div>
      </div>

      {/* Navigation Tabs Layout */}
      <div className="max-w-7xl mx-auto mb-6 bg-white p-2 rounded-xl shadow-sm flex gap-2 border border-gray-100">
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-3 font-semibold rounded-lg text-center transition ${activeTab === 'reports' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          🚩 Reports ({stats.total_reports})
        </button>
        <button
          onClick={() => setActiveTab('blocks')}
          className={`flex-1 py-3 font-semibold rounded-lg text-center transition ${activeTab === 'blocks' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          🚫 Blocks ({stats.total_blocks})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-3 font-semibold rounded-lg text-center transition ${activeTab === 'users' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          👥 All Users ({stats.total_users})
        </button>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        {loading ? (
          <div className="text-center py-12 text-gray-400 font-medium animate-pulse">Loading dashboard data...</div>
        ) : (
          <>
            {/* TABS 1: REPORTS MANAGEMENT */}
            {activeTab === 'reports' && (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">User Reports Management</h2>
                {reports.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Abhi koi reports nahi hain.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 text-sm font-semibold uppercase border-b">
                          <th className="p-4">Reporter (Kisne kiya)</th>
                          <th className="p-4">Reported User (Kisko kiya)</th>
                          <th className="p-4">Reason & Details</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-gray-700 text-sm">
                        {reports.map((report) => (
                          <tr key={report.id} className="hover:bg-gray-50/70 transition">
                            <td className="p-4">
                              <p className="font-semibold text-gray-900">{report.reporter?.full_name || 'N/A'}</p>
                              <p className="text-xs text-gray-400">{report.reporter?.email}</p>
                            </td>
                            <td className="p-4">
                              <p className="font-semibold text-gray-900">{report.reported?.full_name || 'N/A'}</p>
                              <p className="text-xs text-gray-400">{report.reported?.email}</p>
                            </td>
                            <td className="p-4 max-w-xs">
                              <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs font-bold uppercase">{report.reason}</span>
                              <p className="text-gray-500 mt-1 text-xs truncate">{report.details || 'No additional details provided'}</p>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold tracking-wider ${
                                report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                report.status === 'actioned' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                              }`}>{report.status}</span>
                            </td>
                            <td className="p-4 text-right flex gap-2 justify-end">
                              {report.status === 'pending' && (
                                <>
                                  <button onClick={() => handleUpdateReportStatus(report.id, 'actioned')} className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded transition">Action Taken</button>
                                  <button onClick={() => handleUpdateReportStatus(report.id, 'dismissed')} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded transition">Dismiss</button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TABS 2: USER BLOCKS (Matches "User Blocks - Kisne Kisko Block Kiya") */}
            {activeTab === 'blocks' && (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">User Blocks - Kisne Kisko Block Kiya</h2>
                {blocks.length === 0 ? (
                  <p className="text-center text-gray-400 py-12 border-2 border-dashed rounded-xl bg-gray-50 font-medium">Koi block nahi hai abhi</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600 text-sm font-semibold uppercase border-b">
                          <th className="p-4">Blocker (Kisne Block Kiya)</th>
                          <th className="p-4">Blocked User (Kisko Block Kiya)</th>
                          <th className="p-4">Blocked At</th>
                          <th className="p-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-gray-700 text-sm">
                        {blocks.map((block) => (
                          <tr key={block.id} className="hover:bg-gray-50/70 transition">
                            <td className="p-4">
                              <p className="font-semibold text-gray-900">{block.blocker?.full_name || 'N/A'}</p>
                              <p className="text-xs text-gray-400">{block.blocker?.email}</p>
                            </td>
                            <td className="p-4">
                              <p className="font-semibold text-gray-900">{block.blocked?.full_name || 'N/A'}</p>
                              <p className="text-xs text-gray-400">{block.blocked?.email}</p>
                            </td>
                            <td className="p-4 text-xs text-gray-400">
                              {new Date(block.created_at).toLocaleString()}
                            </td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => handleUnblockUser(block.id)}
                                className="text-xs border border-red-200 hover:bg-red-50 text-red-600 font-semibold px-3 py-1.5 rounded transition"
                              >
                                Force Unblock 🔓
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TABS 3: TOTAL REGISTERED USERS */}
            {activeTab === 'users' && (
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Registered System Users</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 text-sm font-semibold uppercase border-b">
                        <th className="p-4">User Details</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Administrative Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-gray-700 text-sm">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50/70 transition">
                          <td className="p-4">
                            <p className="font-semibold text-gray-900">{u.full_name || 'No Name Set'}</p>
                            <p className="text-xs text-gray-400">{u.email || 'N/A'}</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold capitalize ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                              {u.role || 'user'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`h-2.5 w-2.5 inline-block rounded-full mr-2 ${u.is_banned ? 'bg-red-500' : 'bg-green-500'}`}></span>
                            {u.is_banned ? 'Suspended' : 'Active'}
                          </td>
                          <td className="p-4 text-right">
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleToggleUserBan(u.id, u.is_banned)}
                                className={`text-xs px-3 py-1.5 font-semibold rounded transition ${
                                  u.is_banned ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-100 hover:bg-red-200 text-red-700'
                                }`}
                              >
                                {u.is_banned ? 'Revoke Ban' : 'Ban User Account'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
