import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { useToast } from '../components/ui/Toaster';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      login(data.access_token, data.user);
      toast('Welcome back! Logged in successfully.', 'success');
      navigate(data.user.role === 'ADMIN' ? '/admin/dashboard' : '/resident/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🏢</div>
          <div className="auth-logo-text">
            Society Maintenance Tracker
            <span>Resident & Admin Portal</span>
          </div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email address <span className="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password <span className="required">*</span>
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? <><span className="spinner spinner-sm" /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">Create one</Link>
        </div>

        <div style={{ marginTop: 20, padding: 14, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>Demo Accounts</div>
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            Admin: <strong>admin@example.com</strong> / Admin@123<br />
            Resident: <strong>priya@example.com</strong> / Resident@123
          </div>
        </div>
      </div>
    </div>
  );
}
