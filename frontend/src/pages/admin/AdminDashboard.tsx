import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { adminApi, complaintsApi } from '../../services/api';
import { StatusBadge, PriorityBadge, BarChart } from '../../components/complaints/ComplaintComponents';
import { CATEGORY_LABELS } from '../../types';

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/admin/complaints', icon: '📋', label: 'All Complaints' },
  { to: '/admin/notices', icon: '📢', label: 'Notices' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: adminApi.getDashboard,
  });
  const { data: overdue = [], isLoading: _overdueLoading } = useQuery({
    queryKey: ['overdue'],
    queryFn: complaintsApi.getOverdue,
  });

  return (
    <div className="app-layout">
      <Sidebar navItems={NAV_ITEMS} role="ADMIN" />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Overview of all maintenance activities</p>
          </div>
          <Link to="/admin/complaints" className="btn btn-primary">View All Complaints</Link>
        </div>

        {/* Stats */}
        {statsLoading ? (
          <div className="empty-state" style={{ height: 120 }}><div className="spinner" /></div>
        ) : stats ? (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">📋</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total_complaints}</div>
                <div className="stat-label">Total Complaints</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon yellow">🔔</div>
              <div className="stat-content">
                <div className="stat-value">{stats.open_complaints}</div>
                <div className="stat-label">Open</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple">⚙️</div>
              <div className="stat-content">
                <div className="stat-value">{stats.in_progress_complaints}</div>
                <div className="stat-label">In Progress</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">✅</div>
              <div className="stat-content">
                <div className="stat-value">{stats.resolved_complaints}</div>
                <div className="stat-label">Resolved</div>
              </div>
            </div>
            <div className="stat-card" style={{ borderColor: stats.overdue_complaints > 0 ? 'rgba(239,68,68,0.3)' : undefined }}>
              <div className="stat-icon red">⚠️</div>
              <div className="stat-content">
                <div className="stat-value" style={{ color: stats.overdue_complaints > 0 ? 'var(--danger)' : undefined }}>
                  {stats.overdue_complaints}
                </div>
                <div className="stat-label">Overdue</div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Overdue Section */}
        {overdue.length > 0 && (
          <div className="overdue-section">
            <div className="overdue-section-title">⚠️ Overdue Complaints ({overdue.length})</div>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 8, overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Category</th>
                    <th>Resident</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Days Old</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.map(c => {
                    const daysOld = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 86400000);
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>#{c.id}</td>
                        <td>{CATEGORY_LABELS[c.category]}</td>
                        <td>{c.resident?.name ?? '—'}</td>
                        <td><PriorityBadge priority={c.priority} /></td>
                        <td><StatusBadge status={c.status} /></td>
                        <td><span style={{ color: 'var(--danger)', fontWeight: 600 }}>{daysOld}d</span></td>
                        <td><Link to={`/admin/complaints/${c.id}`} className="btn btn-secondary btn-sm">Manage</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Charts */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">By Status</span>
              </div>
              <BarChart data={{
                OPEN: stats.open_complaints,
                IN_PROGRESS: stats.in_progress_complaints,
                RESOLVED: stats.resolved_complaints,
              }} />
            </div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">By Category</span>
              </div>
              <BarChart data={stats.by_category} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
