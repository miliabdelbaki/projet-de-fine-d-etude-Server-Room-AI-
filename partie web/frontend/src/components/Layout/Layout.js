import './Layout.css';
import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../../services/api';

const DRAWER_WIDTH = 260;
const DRAWER_COLLAPSED = 64;

const NAV_ITEMS = [
  { text: 'Dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z', path: '/dashboard' },
  { text: 'Utilisateurs', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z', path: '/users' },
  { text: 'Salles', icon: 'M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z', path: '/rooms' },
  { text: 'Checklists', icon: 'M19 3H14.82C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-2 14l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z', path: '/checklists' },
  { text: 'Historique salles', icon: 'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z', path: '/history-salles' },
  { text: 'Analyse de risque', icon: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z', path: '/analyse-salles' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authAPI.getCurrentUser();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const accountMenuRef = React.useRef(null);

  // Track if we're in mobile mode (≤1024px)
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth <= 1024);

  React.useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };

  React.useEffect(() => {
    const onDocClick = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const isActive = (path) => location.pathname === path;

  // CSS classes driven by state
  const sidebarClass = [
    'sidebar',
    collapsed && !isMobile ? 'collapsed' : '',
    mobileOpen ? 'mobile-open' : '',
  ].filter(Boolean).join(' ');

  const layoutClass = [
    'layout-root',
    collapsed && !isMobile ? 'sidebar-collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <div className={layoutClass}>

        {/* Mobile backdrop */}
        <div
          className={`sidebar-backdrop ${mobileOpen ? 'visible' : ''}`}
          onClick={() => setMobileOpen(false)}
        />

        {/* ── SIDEBAR ── */}
        <aside className={sidebarClass}>
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="logo-hex">
                <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                  <path d="M11 2L20 7V15L11 20L2 15V7L11 2Z" fill="white" />
                  <path d="M11 7L16 10V14L11 17L6 14V10L11 7Z" fill="#ff6f00" />
                </svg>
              </div>
              {(!collapsed || isMobile) && (
                <div>
                  <div className="logo-name">SRGuardian</div>
                  <div className="logo-version">v1.0.0 · Industrial</div>
                </div>
              )}
            </div>
            {!isMobile && (
              <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  {collapsed
                    ? <path d="M8 5v14l11-7z"/>
                    : <path d="M16 5v14L5 12z"/>
                  }
                </svg>
              </button>
            )}
          </div>

          <nav className="sidebar-nav">
            {(!collapsed || isMobile) && <div className="nav-section-label">Navigation</div>}
            {NAV_ITEMS.map((item) => (
              <div
                key={item.path}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                data-tooltip={item.text}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
              >
                <span className="nav-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d={item.icon} />
                  </svg>
                </span>
                {(!collapsed || isMobile) && <span className="nav-text">{item.text}</span>}
              </div>
            ))}
          </nav>

        </aside>

        {/* ── TOPBAR ── */}
        <header className="topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>

          <div className="topbar-breadcrumb">
            <span className="breadcrumb-segment dim">SRGuardian</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-segment current">
              {NAV_ITEMS.find(i => i.path === location.pathname)?.text || 'Page'}
            </span>
          </div>

          <Clock />

          <div className="account-wrap" ref={accountMenuRef}>
            <button
              className="account-trigger"
              onClick={() => setAccountMenuOpen((v) => !v)}
              title="Compte"
            >
              <div className="trigger-avatar">
                {(user?.email?.charAt(0) || 'U').toUpperCase()}
              </div>
              <span className="trigger-name">
                {user?.displayName || user?.email?.split('@')[0] || 'Admin'}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.7, flexShrink: 0 }}>
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>

            {accountMenuOpen && (
              <div className="account-menu">
                <div className="account-menu-header">
                  <div className="account-menu-email">{user?.email || 'utilisateur@local'}</div>
                  <div className="account-menu-avatar">
                    {(user?.email?.charAt(0) || 'U').toUpperCase()}
                  </div>
                  <div className="account-menu-name">
                    Bonjour {user?.displayName || user?.email?.split('@')[0] || 'Utilisateur'} !
                  </div>
                </div>
                <div className="account-menu-list">
                  <button className="account-menu-item" onClick={() => { navigate('/settings'); setAccountMenuOpen(false); }}>
                    ⚙️ Paramètres
                  </button>
                  <button
                    className="account-menu-item"
                    onClick={() => { setAccountMenuOpen(false); handleLogout(); }}
                  >
                    🚪 Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── MAIN ── */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </>
  );
}

function Clock() {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="topbar-time">
      {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}
