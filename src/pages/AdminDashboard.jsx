import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    fetchReports();
    fetchBlocks();
  }, []);

  const fetchReports = async () => {
    const res = await axios.get('/api/admin/reports');
    setReports(res.data);
  };

  const fetchBlocks = async () => {
    const res = await axios.get('/api/admin/blocks');
    setBlocks(res.data);
  };

  const handleApproveReport = async (reportId, reportedUserId) => {
    await axios.post(`/api/admin/reports/${reportId}/approve`, { reportedUserId });
    fetchReports();
    fetchBlocks();
  };

  const handleDismissReport = async (reportId) => {
    await axios.post(`/api/admin/reports/${reportId}/dismiss`);
    fetchReports();
  };

  const handleUnblock = async (blockId) => {
    await axios.post(`/api/admin/blocks/${blockId}/unblock`);
    fetchBlocks();
  };

  return (
    <div>
      <h2>Reports</h2>
      {reports.length === 0 ? (
        <p>No reports found</p>
      ) : (
        reports.map((report) => (
          <div key={report._id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px' }}>
            <p>Reporter ID: {report.reporterId}</p>
            <p>Reported User ID: {report.reportedUserId}</p>
            <p>Reason: {report.reason}</p>
            <p>Status: {report.status}</p>
            {report.status === 'pending' && (
              <>
                <button onClick={() => handleApproveReport(report._id, report.reportedUserId)}>
                  Approve & Block
                </button>
                <button onClick={() => handleDismissReport(report._id)}>Dismiss</button>
              </>
            )}
          </div>
        ))
      )}

      <h2>Blocked Users</h2>
      {blocks.length === 0 ? (
        <p>No blocked users</p>
      ) : (
        blocks.map((block) => (
          <div key={block._id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px' }}>
            <p>
              {block.blockedUserId} was blocked by {block.blockerId}
            </p>
            <button onClick={() => handleUnblock(block._id)}>Unblock</button>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminDashboard;
