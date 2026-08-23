import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

interface SidebarProps {
  navItems: NavItem[];
  role: 'ADMIN' | 'RESIDENT';
}

export default function Sidebar({ navItems, role }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <a href="/" className="brand">
          <div className="brand-icon">🏢</div>
          <span className="brand-text" style={{ lineHeight: 1.2, fontSize: '0.85rem' }}>
            Society<br /><span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Maintenance</span>
          </span>
        </a>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">{role === 'ADMIN' ? 'Administration' : 'My Portal'}</div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase() ?? '?'}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">⎋</button>
        </div>
      </div>
    </aside>
  );
}
