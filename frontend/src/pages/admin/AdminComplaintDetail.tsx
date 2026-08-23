import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '../../components/layout/Sidebar';
import { complaintsApi } from '../../services/api';
import {
  StatusBadge, PriorityBadge, OverdueBadge, ComplaintTimeline
} from '../../components/complaints/ComplaintComponents';
import { useToast } from '../../components/ui/Toaster';
import { CATEGORY_LABELS } from '../../types';
import type { ComplaintStatus, ComplaintPriority } from '../../types';

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/admin/complaints', icon: '📋', label: 'All Complaints' },
  { to: '/admin/notices', icon: '📢', label: 'Notices' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

const NEXT_STATUS: Partial<Record<ComplaintStatus, ComplaintStatus>> = {
  OPEN: 'IN_PROGRESS',
  IN_PROGRESS: 'RESOLVED',
};

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
};

export default function AdminComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const [statusNote, setStatusNote] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<ComplaintPriority | ''>('');
  const qc = useQueryClient();
  const toast = useToast();

  const { data: complaint, isLoading, error } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => complaintsApi.getComplaint(Number(id)),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: ComplaintStatus; note?: string }) =>
      complaintsApi.updateStatus(Number(id), status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaint', id] });
      qc.invalidateQueries({ queryKey: ['adminComplaints'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowStatusModal(false);
      setStatusNote('');
      toast('Status updated successfully!', 'success');
    },
    onError: (err: any) => toast(err.message || 'Failed to update status', 'error'),
  });

  const priorityMutation = useMutation({
    mutationFn: (priority: ComplaintPriority) =>
      complaintsApi.updatePriority(Number(id), priority),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaint', id] });
      toast('Priority updated!', 'success');
      setSelectedPriority('');
    },
    onError: (err: any) => toast(err.message || 'Failed to update priority', 'error'),
  });

  const nextStatus = complaint ? NEXT_STATUS[complaint.status] : undefined;

  return (
    <div className="app-layout">
      <Sidebar navItems={NAV_ITEMS} role="ADMIN" />
      <main className="main-content">
        <div style={{ marginBottom: 16 }}>
          <Link to="/admin/complaints" className="btn btn-secondary btn-sm">← Back to Complaints</Link>
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
                  By {complaint.resident?.name ?? 'Unknown'} · {CATEGORY_LABELS[complaint.category]}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusBadge status={complaint.status} />
                <PriorityBadge priority={complaint.priority} />
                {complaint.is_overdue && <OverdueBadge />}
              </div>
            </div>

            <div className="complaint-detail-grid">
              {/* Left: details + actions */}
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
                      <div className="detail-label">Resident</div>
                      <div className="detail-value">{complaint.resident?.name}<br /><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{complaint.resident?.email}</span></div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-label">Created</div>
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
                        <img src={complaint.photo_url} alt="Complaint" className="complaint-photo" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Admin Actions */}
                {complaint.status !== 'RESOLVED' && (
                  <div className="card" style={{ marginBottom: 20 }}>
                    <h3 style={{ marginBottom: 16 }}>Admin Actions</h3>

                    {/* Status update */}
                    {nextStatus && (
                      <div style={{ marginBottom: 16 }}>
                        <div className="detail-label" style={{ marginBottom: 8 }}>Update Status</div>
                        <button
                          className="btn btn-primary"
                          onClick={() => setShowStatusModal(true)}
                        >
                          Mark as {STATUS_LABELS[nextStatus]}
                        </button>
                      </div>
                    )}

                    {/* Priority update */}
                    <div>
                      <div className="detail-label" style={{ marginBottom: 8 }}>Change Priority</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select
                          className="filter-select"
                          value={selectedPriority}
                          onChange={e => setSelectedPriority(e.target.value as ComplaintPriority)}
                          aria-label="Select priority"
                        >
                          <option value="">Select priority...</option>
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={!selectedPriority || priorityMutation.isPending}
                          onClick={() => selectedPriority && priorityMutation.mutate(selectedPriority as ComplaintPriority)}
                        >
                          {priorityMutation.isPending ? '...' : 'Update'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: history */}
              <div className="card">
                <h3 style={{ marginBottom: 16 }}>Status History</h3>
                <ComplaintTimeline complaint={complaint} />
              </div>
            </div>

            {/* Status Update Modal */}
            {showStatusModal && nextStatus && (
              <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                  <div className="modal-header">
                    <span className="modal-title">Update Status</span>
                    <button className="modal-close" onClick={() => setShowStatusModal(false)}>×</button>
                  </div>

                  <p style={{ marginBottom: 16 }}>
                    Change complaint #{complaint.id} from{' '}
                    <StatusBadge status={complaint.status} /> to{' '}
                    <StatusBadge status={nextStatus} />
                  </p>

                  <div className="form-group">
                    <label className="form-label" htmlFor="status-note">Note (optional)</label>
                    <textarea
                      id="status-note"
                      className="form-textarea"
                      rows={3}
                      value={statusNote}
                      onChange={e => setStatusNote(e.target.value)}
                      placeholder="Add a note about this status change..."
                    />
                  </div>

                  <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
                    <button
                      className="btn btn-primary"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ status: nextStatus, note: statusNote || undefined })}
                    >
                      {statusMutation.isPending ? '...' : `Confirm: ${STATUS_LABELS[nextStatus]}`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
