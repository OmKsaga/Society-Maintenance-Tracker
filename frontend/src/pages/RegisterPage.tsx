import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { useToast } from '../components/ui/Toaster';

export default function RegisterPage() {
  const [name, setName] = useState('');
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
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const data = await authApi.register(name.trim(), email, password);
      login(data.access_token, data.user);
      toast('Account created! Welcome to Society Maintenance Tracker.', 'success');
      navigate('/resident/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
            <span>Create your account</span>
          </div>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Join your society's maintenance portal</p>

        {error && (
          <div className="alert alert-error">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full name <span className="required">*</span></label>
            <input id="name" type="text" className="form-input" value={name}
              onChange={e => setName(e.target.value)} placeholder="Priya Sharma" required autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address <span className="required">*</span></label>
            <input id="email" type="email" className="form-input" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="priya@example.com" required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password <span className="required">*</span></label>
            <input id="password" type="password" className="form-input" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} />
            <div className="form-hint">Minimum 8 characters</div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <><span className="spinner spinner-sm" /> Creating account...</> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
