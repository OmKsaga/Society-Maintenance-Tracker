import { useQuery } from '@tanstack/react-query';
import Sidebar from '../../components/layout/Sidebar';
import { noticesApi } from '../../services/api';

const NAV_ITEMS = [
  { to: '/resident/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/resident/complaints', icon: '📋', label: 'My Complaints' },
  { to: '/resident/complaints/new', icon: '➕', label: 'New Complaint' },
  { to: '/resident/notices', icon: '📢', label: 'Notices' },
];

export default function ResidentNotices() {
  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: noticesApi.getNotices,
  });

  return (
    <div className="app-layout">
      <Sidebar navItems={NAV_ITEMS} role="RESIDENT" />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Society Notices</h1>
            <p className="page-subtitle">Announcements from the management</p>
          </div>
        </div>

        {isLoading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : notices.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">📢</div>
              <div className="empty-state-title">No notices yet</div>
              <div className="empty-state-desc">Check back later for society announcements</div>
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
                </div>
                <div className="notice-content">{notice.content}</div>
                <div className="notice-meta">
                  Posted by {notice.creator_name ?? 'Admin'} · {new Date(notice.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
