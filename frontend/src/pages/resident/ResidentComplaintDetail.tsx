import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '../../components/layout/Sidebar';
import { complaintsApi } from '../../services/api';
import { StatusBadge, PriorityBadge, OverdueBadge, ComplaintTimeline } from '../../components/complaints/ComplaintComponents';
import { CATEGORY_LABELS } from '../../types';

const NAV_ITEMS = [
  { to: '/resident/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/resident/complaints', icon: '📋', label: 'My Complaints' },
  { to: '/resident/complaints/new', icon: '➕', label: 'New Complaint' },
  { to: '/resident/notices', icon: '📢', label: 'Notices' },
];

export default function ResidentComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: complaint, isLoading, error } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => complaintsApi.getComplaint(Number(id)),
    enabled: !!id,
  });

  return (
    <div className="app-layout">
      <Sidebar navItems={NAV_ITEMS} role="RESIDENT" />
      <main className="main-content">
        <div style={{ marginBottom: 16 }}>
          <Link to="/resident/complaints" className="btn btn-secondary btn-sm">← Back to Complaints</Link>
        </div>

        {isLoading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : error ? (
          <div className="alert alert-error">Failed to load complaint</div>
        ) : !complaint ? null : (
          <>
            <div className="page-header">
              <div>
                <h1 className="page-title">Complaint #{complaint.id}</h1>
                <p className="page-subtitle">
                  {CATEGORY_LABELS[complaint.category]} · Created {new Date(complaint.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatusBadge status={complaint.status} />
                <PriorityBadge priority={complaint.priority} />
                {complaint.is_overdue && <OverdueBadge />}
              </div>
            </div>

            <div className="complaint-detail-grid">
              {/* Left: details */}
              <div>
                <div className="card" style={{ marginBottom: 20 }}>
                  <h3 style={{ marginBottom: 16 }}>Complaint Details</h3>

                  <div className="detail-field">
                    <div className="detail-label">Category</div>
                    <div className="detail-value">{CATEGORY_LABELS[complaint.category]}</div>
                  </div>

                  <div className="detail-field">
                    <div className="detail-label">Description</div>
                    <div className="detail-value" style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {complaint.description}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="detail-field">
                      <div className="detail-label">Status</div>
                      <div className="detail-value"><StatusBadge status={complaint.status} /></div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-label">Priority</div>
                      <div className="detail-value"><PriorityBadge priority={complaint.priority} /></div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-label">Submitted</div>
                      <div className="detail-value" style={{ fontSize: '0.875rem' }}>
                        {new Date(complaint.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                    {complaint.resolved_at && (
                      <div className="detail-field">
                        <div className="detail-label">Resolved</div>
                        <div className="detail-value" style={{ fontSize: '0.875rem' }}>
                          {new Date(complaint.resolved_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </div>
                    )}
                  </div>

                  {complaint.photo_url && (
                    <div className="detail-field">
                      <div className="detail-label">Attached Photo</div>
                      <a href={complaint.photo_url} target="_blank" rel="noreferrer">
                        <img src={complaint.photo_url} alt="Complaint photo" className="complaint-photo" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: history */}
              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Status History</h3>
                {complaint.history.length === 0 ? (
                  <div className="empty-state" style={{ padding: 24 }}>
                    <div className="empty-state-desc">No history yet</div>
                  </div>
                ) : (
                  <ComplaintTimeline complaint={complaint} />
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
