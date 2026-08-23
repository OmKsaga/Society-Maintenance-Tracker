import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { complaintsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge, PriorityBadge, OverdueBadge } from '../../components/complaints/ComplaintComponents';

const NAV_ITEMS = [
  { to: '/resident/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/resident/complaints', icon: '📋', label: 'My Complaints' },
  { to: '/resident/complaints/new', icon: '➕', label: 'New Complaint' },
  { to: '/resident/notices', icon: '📢', label: 'Notices' },
];

export default function ResidentDashboard() {
  const { user } = useAuth();
  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['myComplaints'],
    queryFn: complaintsApi.getMyComplaints,
  });

  const open = complaints.filter(c => c.status === 'OPEN').length;
  const inProgress = complaints.filter(c => c.status === 'IN_PROGRESS').length;
  const resolved = complaints.filter(c => c.status === 'RESOLVED').length;
  const overdue = complaints.filter(c => c.is_overdue).length;
  const recent = complaints.slice(0, 5);

  return (
    <div className="app-layout">
      <Sidebar navItems={NAV_ITEMS} role="RESIDENT" />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="page-subtitle">Here's an overview of your maintenance complaints</p>
          </div>
          <Link to="/resident/complaints/new" className="btn btn-primary">
            + New Complaint
          </Link>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">📋</div>
            <div className="stat-content">
              <div className="stat-value">{complaints.length}</div>
              <div className="stat-label">Total Complaints</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow">🔔</div>
            <div className="stat-content">
              <div className="stat-value">{open}</div>
              <div className="stat-label">Open</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">⚙️</div>
            <div className="stat-content">
              <div className="stat-value">{inProgress}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">✅</div>
            <div className="stat-content">
              <div className="stat-value">{resolved}</div>
              <div className="stat-label">Resolved</div>
            </div>
          </div>
          {overdue > 0 && (
            <div className="stat-card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
              <div className="stat-icon red">⚠️</div>
              <div className="stat-content">
                <div className="stat-value" style={{ color: 'var(--danger)' }}>{overdue}</div>
                <div className="stat-label">Overdue</div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Complaints</span>
            <Link to="/resident/complaints" className="btn btn-secondary btn-sm">View All</Link>
          </div>

          {isLoading ? (
            <div className="empty-state"><div className="spinner" /></div>
          ) : recent.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No complaints yet</div>
              <div className="empty-state-desc">
                <Link to="/resident/complaints/new" className="auth-link">Raise your first complaint</Link>
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
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(c => (
                    <tr key={c.id}>
                      <td><Link to={`/resident/complaints/${c.id}`} className="table-link">#{c.id}</Link></td>
                      <td>{c.category.replace('_', ' ')}</td>
                      <td style={{ maxWidth: 200 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.description}
                        </span>
                      </td>
                      <td><PriorityBadge priority={c.priority} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                          <StatusBadge status={c.status} />
                          {c.is_overdue && <OverdueBadge />}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
