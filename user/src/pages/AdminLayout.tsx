import { useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface AdminLayoutProps {
  children: ReactNode;
}

type MenuItem = {
  label: string;
  to: string;
  matches: (pathname: string) => boolean;
};

const menuItems: MenuItem[] = [
  {
    label: 'Tổng quan',
    to: '/admin',
    matches: (pathname) => pathname === '/admin',
  },
  {
    label: 'Quản lý phim',
    to: '/admin/movies',
    matches: (pathname) => pathname.startsWith('/admin/movies') || pathname.startsWith('/admin/content'),
  },
  {
    label: 'Quản lý người dùng',
    to: '/admin/users',
    matches: (pathname) => pathname.startsWith('/admin/users'),
  },
  {
    label: 'Thống kê',
    to: '/admin/stats',
    matches: (pathname) => pathname.startsWith('/admin/stats') || pathname.startsWith('/admin/settings'),
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();

  const currentSection = useMemo(() => {
    return menuItems.find((item) => item.matches(location.pathname))?.label || 'Quản trị';
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div style={shellStyle}>
      <aside
        style={{
          ...sidebarStyle,
          width: open ? 260 : 88,
        }}
      >
        <div style={brandStyle}>
          <div style={brandBadgeStyle}>TP</div>
          {open && (
            <div>
              <div style={brandTitleStyle}>Thèm Phim Admin</div>
              <div style={brandSubtitleStyle}>Quản lý phim và nguồn phát</div>
            </div>
          )}
        </div>

        <nav style={menuListStyle}>
          {menuItems.map((item) => {
            const active = item.matches(location.pathname);

            return (
              <button
                key={item.to}
                type="button"
                onClick={() => navigate(item.to)}
                style={{
                  ...menuButtonStyle,
                  ...(active ? activeMenuButtonStyle : null),
                  justifyContent: open ? 'flex-start' : 'center',
                }}
                title={item.label}
              >
                <span style={menuInitialStyle}>{item.label.charAt(0)}</span>
                {open && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div style={sidebarFooterStyle}>
          {open && (
            <div style={accountBlockStyle}>
              <div style={accountLabelStyle}>Admin đang đăng nhập</div>
              <div style={accountEmailStyle}>{user?.email || 'admin@themphim.local'}</div>
            </div>
          )}

          <button type="button" onClick={handleLogout} style={logoutButtonStyle}>
            {open ? 'Đăng xuất' : 'Ra'}
          </button>
        </div>
      </aside>

      <section style={mainAreaStyle}>
        <header style={topbarStyle}>
          <div>
            <div style={topbarEyebrowStyle}>Bảng điều khiển quản trị</div>
            <h1 style={topbarTitleStyle}>{currentSection}</h1>
          </div>

          <button type="button" onClick={() => setOpen((prev) => !prev)} style={toggleButtonStyle}>
            {open ? 'Thu gọn' : 'Mở rộng'}
          </button>
        </header>

        <main style={contentAreaStyle}>{children}</main>
      </section>
    </div>
  );
}

const shellStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  background: '#020617',
  color: '#f8fafc',
};

const sidebarStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
  borderRight: '1px solid rgba(148, 163, 184, 0.14)',
  transition: 'width 0.2s ease',
};

const brandStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '22px 20px 18px',
  borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
};

const brandBadgeStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
  fontWeight: 700,
};

const brandTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
};

const brandSubtitleStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: '#94a3b8',
};

const menuListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: 16,
};

const menuButtonStyle: React.CSSProperties = {
  border: '1px solid transparent',
  background: 'transparent',
  color: '#cbd5e1',
  borderRadius: 14,
  padding: '12px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontSize: 14,
  fontWeight: 600,
};

const activeMenuButtonStyle: React.CSSProperties = {
  background: 'rgba(249, 115, 22, 0.16)',
  borderColor: 'rgba(249, 115, 22, 0.28)',
  color: '#fff7ed',
};

const menuInitialStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(148, 163, 184, 0.12)',
  fontSize: 12,
  fontWeight: 700,
};

const sidebarFooterStyle: React.CSSProperties = {
  marginTop: 'auto',
  padding: 16,
  borderTop: '1px solid rgba(148, 163, 184, 0.12)',
};

const accountBlockStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 14,
  background: 'rgba(15, 23, 42, 0.55)',
  border: '1px solid rgba(148, 163, 184, 0.12)',
  marginBottom: 12,
};

const accountLabelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: '#94a3b8',
};

const accountEmailStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 14,
  fontWeight: 600,
  wordBreak: 'break-word',
};

const logoutButtonStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid rgba(239, 68, 68, 0.26)',
  background: 'rgba(127, 29, 29, 0.25)',
  color: '#fecaca',
  borderRadius: 12,
  padding: '10px 14px',
  cursor: 'pointer',
  fontWeight: 600,
};

const mainAreaStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

const topbarStyle: React.CSSProperties = {
  height: 88,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 28px',
  borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
  background: 'rgba(2, 6, 23, 0.92)',
  backdropFilter: 'blur(12px)',
};

const topbarEyebrowStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  color: '#94a3b8',
};

const topbarTitleStyle: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: 28,
  fontWeight: 700,
};

const toggleButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.2)',
  background: '#111827',
  color: '#e2e8f0',
  borderRadius: 12,
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 600,
};

const contentAreaStyle: React.CSSProperties = {
  padding: 28,
};
