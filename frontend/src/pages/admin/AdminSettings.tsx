import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Sidebar from '../../components/layout/Sidebar';
import { adminApi } from '../../services/api';
import { useToast } from '../../components/ui/Toaster';
import type { Settings } from '../../types';

const NAV_ITEMS = [
  { to: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/admin/complaints', icon: '📋', label: 'All Complaints' },
  { to: '/admin/notices', icon: '📢', label: 'Notices' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings' },
];

export default function AdminSettings() {
  const [overdueDays, setOverdueDays] = useState('3');
  const qc = useQueryClient();
  const toast = useToast();

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: adminApi.getSettings,
  });

  useEffect(() => {
    if (settings) setOverdueDays(String(settings.overdue_days));
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (days: number) => adminApi.updateSettings(days),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast('Settings updated successfully!', 'success');
    },
    onError: (err: Error) => toast(err.message || 'Failed to update settings', 'error'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const days = parseInt(overdueDays);
    if (isNaN(days) || days < 1 || days > 365) {
      toast('Overdue days must be between 1 and 365', 'error');
      return;
    }
    mutation.mutate(days);
  };

  return (
    <div className="app-layout">
      <Sidebar navItems={NAV_ITEMS} role="ADMIN" />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Configure system parameters</p>
          </div>
        </div>

        {isLoading ? (
          <div className="empty-state"><div className="spinner" /></div>
        ) : (
          <div style={{ maxWidth: 500 }}>
            <div className="card">
              <h3 style={{ marginBottom: 8 }}>Overdue Threshold</h3>
              <p style={{ marginBottom: 20, fontSize: '0.875rem' }}>
                Complaints that remain unresolved beyond this many days will be flagged as overdue
                and surfaced prominently in the complaints list.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="overdue-days">
                    Overdue after (days) <span className="required">*</span>
                  </label>
                  <input
                    id="overdue-days"
                    type="number"
                    className="form-input"
                    value={overdueDays}
                    onChange={e => setOverdueDays(e.target.value)}
                    min={1}
                    max={365}
                    required
                    style={{ maxWidth: 120 }}
                  />
                  <div className="form-hint">Minimum 1 day, maximum 365 days</div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Saving...' : 'Save Settings'}
                </button>
              </form>

              {settings && (
                <div style={{ marginTop: 20, padding: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Current threshold: <strong style={{ color: 'var(--text-secondary)' }}>{settings.overdue_days} days</strong>
                  {settings.updated_at && (
                    <> · Last updated: {new Date(settings.updated_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</>
                  )}
                </div>
              )}
            </div>

            <div className="card" style={{ marginTop: 20 }}>
              <h3 style={{ marginBottom: 8 }}>API Documentation</h3>
              <p style={{ marginBottom: 12, fontSize: '0.875rem' }}>
                The backend REST API is fully documented via Swagger/OpenAPI.
              </p>
              <a
                href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/docs`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                🔗 Open API Docs
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
