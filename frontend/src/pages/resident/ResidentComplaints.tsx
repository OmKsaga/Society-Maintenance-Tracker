import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { complaintsApi } from '../../services/api';
import { StatusBadge, PriorityBadge, OverdueBadge } from '../../components/complaints/ComplaintComponents';
import { CATEGORY_LABELS } from '../../types';

const NAV_ITEMS = [
  { to: '/resident/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/resident/complaints', icon: '📋', label: 'My Complaints' },
  { to: '/resident/complaints/new', icon: '➕', label: 'New Complaint' },
  { to: '/resident/notices', icon: '📢', label: 'Notices' },
];

export default function ResidentComplaints() {
  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['myComplaints'],
    queryFn: complaintsApi.getMyComplaints,
  });

  return (
    <div className="app-layout">
      <Sidebar navItems={NAV_ITEMS} role="RESIDENT" />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Complaints</h1>
            <p className="page-subtitle">{complaints.length} total complaint{complaints.length !== 1 ? 's' : ''}</p>
          </div>
          <Link to="/resident/complaints/new" className="btn btn-primary">+ New Complaint</Link>
        </div>

        {isLoading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : complaints.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No complaints yet</div>
              <div className="empty-state-desc">
                <Link to="/resident/complaints/new" className="auth-link">Raise your first complaint</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>#{c.id}</td>
                    <td>{CATEGORY_LABELS[c.category]}</td>
                    <td style={{ maxWidth: 240 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.description}
                      </span>
                    </td>
                    <td><PriorityBadge priority={c.priority} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        <StatusBadge status={c.status} />
                        {c.is_overdue && <OverdueBadge />}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <Link to={`/resident/complaints/${c.id}`} className="btn btn-secondary btn-sm">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
