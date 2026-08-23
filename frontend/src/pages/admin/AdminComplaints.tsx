import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';
import { complaintsApi } from '../../services/api';
import { StatusBadge, PriorityBadge, OverdueBadge } from '../../components/complaints/ComplaintComponents';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '../../types';

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/admin/complaints', icon: '📋', label: 'All Complaints' },
  { to: '/admin/notices', icon: '📢', label: 'Notices' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

export default function AdminComplaints() {
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['adminComplaints', category, statusFilter, dateFilter],
    queryFn: () => complaintsApi.getAllComplaints({
      category: category || undefined,
      status_filter: statusFilter || undefined,
      date_filter: dateFilter || undefined,
    }),
  });

  const overdueCnt = complaints.filter(c => c.is_overdue).length;

  return (
    <div className="app-layout">
      <Sidebar navItems={NAV_ITEMS} role="ADMIN" />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">All Complaints</h1>
            <p className="page-subtitle">
              {complaints.length} complaint{complaints.length !== 1 ? 's' : ''}
              {overdueCnt > 0 && <span style={{ color: 'var(--danger)', marginLeft: 8 }}>· {overdueCnt} overdue</span>}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Filter:</span>
          <select
            className="filter-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {ALL_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            className="filter-select"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            aria-label="Filter by date"
          >
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {(category || statusFilter || dateFilter) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setCategory(''); setStatusFilter(''); setDateFilter(''); }}
            >
              Clear
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : complaints.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No complaints found</div>
              <div className="empty-state-desc">Try adjusting your filters</div>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Category</th>
                  <th>Resident</th>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.id} style={c.is_overdue ? { background: 'rgba(239,68,68,0.03)' } : undefined}>
                    <td style={{ fontWeight: 600 }}>#{c.id}</td>
                    <td>{CATEGORY_LABELS[c.category]}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{c.resident?.name ?? '—'}</td>
                    <td style={{ maxWidth: 200 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.description}
                      </span>
                    </td>
                    <td><PriorityBadge priority={c.priority} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <StatusBadge status={c.status} />
                        {c.is_overdue && <OverdueBadge />}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td>
                      <Link to={`/admin/complaints/${c.id}`} className="btn btn-secondary btn-sm">Manage</Link>
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
