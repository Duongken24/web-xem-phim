import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import AdminLayout from './AdminLayout';
import { useAuth } from '../hooks/useAuth';
import { getDashboard, type DashboardPayload } from '../services/admin.service';

const emptyDashboard: DashboardPayload = {
  stats: {
    totalUsers: 0,
    totalAdmins: 0,
    totalNormalUsers: 0,
    blockedUsers: 0,
    totalPlans: 0,
    activePlans: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    hiddenContent: 0,
    premiumContent: 0,
    featuredContent: 0,
    blockedContent: 0,
  },
  recentUsers: [],
  recentSubscriptions: [],
};

export default function AdminDashboard() {
  const { session, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardPayload>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const cards = useMemo(() => {
    return [
      { label: 'Tong users', value: dashboard.stats.totalUsers, accent: '#38bdf8' },
      { label: 'Admins', value: dashboard.stats.totalAdmins, accent: '#f59e0b' },
      { label: 'Users thuong', value: dashboard.stats.totalNormalUsers, accent: '#34d399' },
      { label: 'Content hidden', value: dashboard.stats.hiddenContent, accent: '#f87171' },
      { label: 'Content featured', value: dashboard.stats.featuredContent, accent: '#60a5fa' },
    ];
  }, [dashboard]);

  const loadDashboard = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const payload = await getDashboard();
      setDashboard({
        stats: payload.stats,
        recentUsers: payload.recentUsers || [],
        recentSubscriptions: payload.recentSubscriptions || [],
      });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the tai dashboard admin.');
      console.error('[AdminDashboard] Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && session) {
      loadDashboard();
    }
  }, [authLoading, session]);

  return (
    <AdminLayout>
      <div style={pageStyle}>
        <div style={heroStyle}>
          <div>
            <div style={eyebrowStyle}>Admin overview</div>
            <h2 style={titleStyle}>Dashboard quản trị phim</h2>
            <p style={subtitleStyle}>
              So lieu tap trung vao user, phim, noi dung noi bat va lich su xem de demo gon hon.
            </p>
          </div>

          <button type="button" onClick={loadDashboard} style={primaryButtonStyle} disabled={authLoading || loading}>
            Refresh data
          </button>
        </div>

        {errorMessage && <div style={errorStyle}>{errorMessage}</div>}

        {authLoading || loading ? (
          <div style={panelStyle}>{authLoading ? 'Dang tai auth...' : 'Dang tai dashboard...'}</div>
        ) : (
          <>
            <div style={cardGridStyle}>
              {cards.map((card) => (
                <div key={card.label} style={statCardStyle}>
                  <div style={{ ...statAccentStyle, background: card.accent }} />
                  <div style={statLabelStyle}>{card.label}</div>
                  <div style={statValueStyle}>{card.value}</div>
                </div>
              ))}
            </div>

            <div style={twoColumnGridStyle}>
              <section style={panelStyle}>
                <div style={panelHeaderStyle}>
                  <h3 style={panelTitleStyle}>Recent users</h3>
                  <span style={panelHintStyle}>Top 5 user gan day</span>
                </div>

                {dashboard.recentUsers.length === 0 ? (
                  <p style={emptyTextStyle}>Chua co du lieu user de hien thi.</p>
                ) : (
                  <div style={listStyle}>
                    {dashboard.recentUsers.map((user) => (
                      <div key={user.id} style={listItemStyle}>
                        <div>
                          <div style={listPrimaryStyle}>{user.full_name || user.email || 'Unknown user'}</div>
                          <div style={listSecondaryStyle}>{user.email || 'No email'}</div>
                        </div>
                        <div style={badgeRowStyle}>
                          <span style={user.role === 'admin' ? adminBadgeStyle : userBadgeStyle}>
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                          {user.is_blocked && <span style={blockedBadgeStyle}>Blocked</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
};

const heroStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
  padding: 24,
  borderRadius: 24,
  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.88) 100%)',
  border: '1px solid rgba(148, 163, 184, 0.14)',
};

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#94a3b8',
};

const titleStyle: CSSProperties = {
  margin: '10px 0 0',
  fontSize: 30,
  lineHeight: 1.2,
};

const subtitleStyle: CSSProperties = {
  margin: '10px 0 0',
  color: '#cbd5e1',
  maxWidth: 720,
};

const primaryButtonStyle: CSSProperties = {
  border: '1px solid rgba(249, 115, 22, 0.28)',
  background: 'rgba(249, 115, 22, 0.14)',
  color: '#fff7ed',
  borderRadius: 14,
  padding: '12px 18px',
  cursor: 'pointer',
  fontWeight: 700,
};

const errorStyle: CSSProperties = {
  padding: '14px 16px',
  borderRadius: 14,
  background: 'rgba(127, 29, 29, 0.28)',
  border: '1px solid rgba(248, 113, 113, 0.2)',
  color: '#fecaca',
};

const cardGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
};

const statCardStyle: CSSProperties = {
  position: 'relative',
  padding: 20,
  borderRadius: 20,
  background: '#0f172a',
  border: '1px solid rgba(148, 163, 184, 0.14)',
  overflow: 'hidden',
};

const statAccentStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 4,
};

const statLabelStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: 14,
};

const statValueStyle: CSSProperties = {
  marginTop: 14,
  fontSize: 34,
  fontWeight: 700,
};

const twoColumnGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 16,
};

const panelStyle: CSSProperties = {
  borderRadius: 20,
  background: '#0f172a',
  border: '1px solid rgba(148, 163, 184, 0.14)',
  padding: 20,
};

const panelHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  marginBottom: 16,
};

const panelTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
};

const panelHintStyle: CSSProperties = {
  fontSize: 12,
  color: '#94a3b8',
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const listItemStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  padding: '14px 16px',
  borderRadius: 14,
  background: 'rgba(15, 23, 42, 0.72)',
  border: '1px solid rgba(148, 163, 184, 0.1)',
};

const listPrimaryStyle: CSSProperties = {
  fontWeight: 600,
};

const listSecondaryStyle: CSSProperties = {
  marginTop: 4,
  color: '#94a3b8',
  fontSize: 13,
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

const badgeBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 700,
};

const adminBadgeStyle: CSSProperties = {
  ...badgeBaseStyle,
  background: 'rgba(245, 158, 11, 0.16)',
  color: '#fde68a',
};

const userBadgeStyle: CSSProperties = {
  ...badgeBaseStyle,
  background: 'rgba(59, 130, 246, 0.14)',
  color: '#bfdbfe',
};

const blockedBadgeStyle: CSSProperties = {
  ...badgeBaseStyle,
  background: 'rgba(239, 68, 68, 0.18)',
  color: '#fecaca',
};

const emptyTextStyle: CSSProperties = {
  margin: 0,
  color: '#94a3b8',
};
