import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { MoreVertical, Flag, Ban, X, ShieldAlert } from 'lucide-react';

export default function UserActions({ userId, userName, onBlock }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = [
    'Fake Profile / Catfish',
    'Inappropriate Photos',
    'Harassment / Abuse',
    'Scam / Money Request',
    'Underage User',
    'Other'
  ];

  const handleReport = async () => {
    if (!reason) {
      alert('Please select a reason');
      return;
    }

    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("User authentication failed.");

      // 💡 NOTE: Agar aapke database me 'reported_user_id' ki jagah 'target_id' hai, 
      // toh aap niche 'reported_user_id' ko badal kar 'target_id' ya 'user_id' kar sakte hain.
      const { error: reportError } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: userId, // 👈 'reported_id' ko 'reported_user_id' se replace kiya hai
        reason: reason,
        details: details,
        status: 'pending'
      });

      if (reportError) throw reportError;

      alert('Report submitted successfully. We will review within 48 hours.');
      
      setShowReportModal(false);
      setShowMenu(false);
      setReason('');
      setDetails('');

    } catch (err) {
      alert('Error submitting report: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockOnly = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('blocked_users').insert({
        blocker_id: user.id,
        blocked_id: userId
      });

      if (error) throw error;

      alert(`${userName} has been blocked.`);
      setShowBlockModal(false);
      setShowMenu(false);
      if (onBlock) onBlock(userId);

    } catch (err) {
      alert('Block failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 3 Dots Button */}
      <div className="relative inline-block text-left">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-gray-100 rounded-full transition shadow-sm border border-gray-200/50"
        >
          <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowReportModal(true);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-xs text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition text-left font-bold"
            >
              <Flag className="w-3.5 h-3.5" />
              Report Profile
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowBlockModal(true);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 border-t border-gray-50 dark:border-gray-700 transition text-left font-bold"
            >
              <Ban className="w-3.5 h-3.5" />
              Block User
            </button>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 text-left shadow-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Report Account</h3>
              <button type="button" onClick={() => setShowReportModal(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-2xl mb-4 border border-orange-100">
              <p className="text-xs text-orange-700 dark:text-orange-400 flex gap-2 font-medium">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 text-orange-500" />
                <span>You are flagging <b>{userName}</b>. Our admin matrix will investigate this profile log within 24 hours.</span>
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <label className="text-xs font-black text-gray-500 uppercase tracking-wider block">Select Reason *</label>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 border border-gray-100 p-1 rounded-xl">
                {reasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition ${
                      reason === r
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide specific details about this violation..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-xs text-gray-900 mb-4 focus:outline-none focus:bg-white focus:border-orange-500 transition"
              rows="3"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-bold text-xs hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReport}
                disabled={loading || !reason}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl disabled:opacity-50 text-xs transition"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowBlockModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-2">Block {userName}?</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 px-2">
              This will isolate profiles. You won't see each other across the FindLove dashboard timeline anymore.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-bold text-xs hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBlockOnly}
                disabled={loading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl disabled:opacity-50 text-xs transition"
              >
                {loading ? 'Blocking...' : 'Confirm Block'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}