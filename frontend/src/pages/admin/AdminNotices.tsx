import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '../../components/layout/Sidebar';
import { noticesApi } from '../../services/api';
import { useToast } from '../../components/ui/Toaster';

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/admin/complaints', icon: '📋', label: 'All Complaints' },
  { to: '/admin/notices', icon: '📢', label: 'Notices' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

export default function AdminNotices() {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const qc = useQueryClient();
  const toast = useToast();

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: noticesApi.getNotices,
  });

  const createMutation = useMutation({
    mutationFn: () => noticesApi.createNotice(title.trim(), content.trim(), isImportant),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] });
      setShowModal(false);
      setTitle(''); setContent(''); setIsImportant(false);
      toast('Notice created successfully!', 'success');
    },
    onError: (err: any) => toast(err.message || 'Failed to create notice', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => noticesApi.deleteNotice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] });
      setDeleteConfirm(null);
      toast('Notice deleted.', 'success');
    },
    onError: (err: any) => toast(err.message || 'Failed to delete notice', 'error'),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast('Title is required', 'error'); return; }
    if (!content.trim()) { toast('Content is required', 'error'); return; }
    createMutation.mutate();
  };

  return (
    <div className="app-layout">
      <Sidebar navItems={NAV_ITEMS} role="ADMIN" />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Notices</h1>
            <p className="page-subtitle">Manage society announcements</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create Notice</button>
        </div>

        {isLoading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : notices.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📢</div>
              <div className="empty-state-title">No notices yet</div>
              <div className="empty-state-desc">Create your first notice for residents</div>
            </div>
          </div>
        ) : (
          <div>
            {notices.map(notice => (
              <div key={notice.id} className={`notice-card${notice.is_important ? ' important' : ''}`}>
                <div className="notice-card-header">
                  <div>
                    {notice.is_important && (
                      <span className="badge badge-important" style={{ marginBottom: 6, display: 'inline-flex' }}>
                        📌 Important
                      </span>
                    )}
                    <div className="notice-title">{notice.title}</div>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setDeleteConfirm(notice.id)}
                    style={{ flexShrink: 0 }}
                  >
                    Delete
                  </button>
                </div>
                <div className="notice-content">{notice.content}</div>
                <div className="notice-meta">
                  {new Date(notice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">Create Notice</span>
                <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label" htmlFor="notice-title">
                    Title <span className="required">*</span>
                  </label>
                  <input
                    id="notice-title"
                    className="form-input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Notice title..."
                    autoFocus
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="notice-content">
                    Content <span className="required">*</span>
                  </label>
                  <textarea
                    id="notice-content"
                    className="form-textarea"
                    rows={5}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Notice content..."
                    required
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    id="is-important"
                    type="checkbox"
                    checked={isImportant}
                    onChange={e => setIsImportant(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="is-important" style={{ fontSize: '0.9rem', cursor: 'pointer', marginBottom: 0 }}>
                    Mark as <strong>Important</strong> (pins to top and sends email to all residents)
                  </label>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Publishing...' : '📢 Publish Notice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirm Modal */}
        {deleteConfirm !== null && (
          <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">Delete Notice</span>
                <button className="modal-close" onClick={() => setDeleteConfirm(null)}>×</button>
              </div>
              <p>Are you sure you want to delete this notice? This action cannot be undone.</p>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button
                  className="btn btn-danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteConfirm)}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
