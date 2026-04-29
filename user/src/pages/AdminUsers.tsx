import { useEffect, useState, type CSSProperties } from 'react';
import AdminLayout from './AdminLayout';
import { useAuth } from '../hooks/useAuth';
import {
  createAdminUser,
  getUsers,
  updateUserBlock,
  updateUserRole,
  type AdminUser,
} from '../services/admin.service';

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  role: 'user',
};

export default function AdminUsers() {
  const { user: currentUser, session, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadUsers = async (query = '') => {
    setLoading(true);
    setErrorMessage('');

    try {
      const payload = await getUsers(query);
      setUsers(payload.users || []);
      setRoleDrafts(
        Object.fromEntries((payload.users || []).map((item) => [item.id, item.role || 'user']))
      );
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the tai danh sach user.');
      console.error('[AdminUsers] Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && session) {
      loadUsers();
    }
  }, [authLoading, session]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadUsers(searchQuery);
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await createAdminUser({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        role: form.role,
      });
      setForm(emptyForm);
      setShowModal(false);
      setSuccessMessage('Da tao user moi thanh cong.');
      await loadUsers(searchQuery);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the tao user moi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveRole = async (targetUser: AdminUser) => {
    const nextRole = roleDrafts[targetUser.id] || targetUser.role || 'user';
    setBusyUserId(targetUser.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await updateUserRole(targetUser.id, nextRole);
      setSuccessMessage('Da cap nhat role cho user.');
      await loadUsers(searchQuery);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the cap nhat role.');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleBlockToggle = async (targetUser: AdminUser) => {
    setBusyUserId(targetUser.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await updateUserBlock(targetUser.id, !targetUser.is_blocked);
      setSuccessMessage(targetUser.is_blocked ? 'Da mo khoa tai khoan.' : 'Da khoa tai khoan.');
      await loadUsers(searchQuery);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the cap nhat trang thai user.');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <AdminLayout>
      <div style={pageStyle}>
        <div style={heroStyle}>
          <div>
            <div style={eyebrowStyle}>User administration</div>
            <h2 style={titleStyle}>Users management</h2>
            <p style={subtitleStyle}>
              List user, search theo email/ten, doi role, khoa/mo khoa va xem goi hien tai neu co.
            </p>
          </div>

          <button type="button" onClick={() => setShowModal(true)} style={primaryButtonStyle}>
            + Create user
          </button>
        </div>

        <form onSubmit={handleSearch} style={searchBarStyle}>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by email or full name"
            style={inputStyle}
          />
          <button type="submit" style={secondaryButtonStyle}>
            Search
          </button>
        </form>

        {errorMessage && <div style={errorStyle}>{errorMessage}</div>}
        {successMessage && <div style={successStyle}>{successMessage}</div>}

        <section style={panelStyle}>
          {loading ? (
            <p style={mutedTextStyle}>Dang tai users...</p>
          ) : users.length === 0 ? (
            <p style={mutedTextStyle}>Khong co user nao phu hop bo loc hien tai.</p>
          ) : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Activity</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => {
                    const isSelf = item.id === currentUser?.id;
                    const working = busyUserId === item.id;

                    return (
                      <tr key={item.id} style={rowStyle}>
                        <td style={tdStyle}>
                          <div style={cellPrimaryStyle}>{item.full_name || item.email || 'Unknown user'}</div>
                          <div style={cellSecondaryStyle}>{item.email || item.id}</div>
                        </td>
                        <td style={tdStyle}>
                          <div style={roleEditorStyle}>
                            <select
                              value={roleDrafts[item.id] || 'user'}
                              onChange={(event) =>
                                setRoleDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))
                              }
                              style={selectStyle}
                              disabled={isSelf}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleSaveRole(item)}
                              style={smallButtonStyle}
                              disabled={isSelf || working}
                            >
                              Save role
                            </button>
                          </div>
                          {isSelf && <div style={hintStyle}>Ban dang dang nhap tai khoan nay.</div>}
                        </td>
                        <td style={tdStyle}>
                          <div style={statusWrapStyle}>
                            <span style={item.is_blocked ? blockedBadgeStyle : activeBadgeStyle}>
                              {item.is_blocked ? 'Blocked' : 'Active'}
                            </span>
                            <span style={item.role === 'admin' ? adminBadgeStyle : userBadgeStyle}>
                              {item.role === 'admin' ? 'Admin' : 'User'}
                            </span>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={activityGridStyle}>
                            <span>{item.watch_count || 0} xem</span>
                            <span>{item.favorite_count || 0} yêu thích</span>
                            <span>{item.rating_count || 0} đánh giá</span>
                          </div>
                          <div style={hintStyle}>
                            {item.last_watched_at
                              ? `Xem gần nhất: ${new Date(item.last_watched_at).toLocaleString('vi-VN')}`
                              : 'Chưa có lịch sử xem'}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <button
                            type="button"
                            onClick={() => handleBlockToggle(item)}
                            style={item.is_blocked ? smallButtonStyle : dangerButtonStyle}
                            disabled={isSelf || working}
                          >
                            {item.is_blocked ? 'Unblock' : 'Block'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showModal && (
          <div style={modalOverlayStyle}>
            <div style={modalStyle}>
              <div style={panelHeaderStyle}>
                <h3 style={panelTitleStyle}>Create user</h3>
                <button type="button" onClick={() => setShowModal(false)} style={secondaryButtonStyle}>
                  Close
                </button>
              </div>

              <form onSubmit={handleCreateUser} style={formStyle}>
                <input
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  placeholder="Full name"
                  style={inputStyle}
                />
                <input
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Email"
                  type="email"
                  style={inputStyle}
                  required
                />
                <input
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="Password"
                  type="password"
                  style={inputStyle}
                  required
                />
                <select
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                  style={selectStyle}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>

                <button type="submit" disabled={submitting} style={primaryButtonStyle}>
                  {submitting ? 'Creating...' : 'Create user'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

const heroStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'flex-start',
  padding: 24,
  borderRadius: 22,
  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 41, 59, 0.84) 100%)',
  border: '1px solid rgba(148, 163, 184, 0.14)',
};

const eyebrowStyle: CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: '#94a3b8',
};

const titleStyle: CSSProperties = {
  margin: '10px 0 0',
  fontSize: 28,
};

const subtitleStyle: CSSProperties = {
  margin: '10px 0 0',
  color: '#cbd5e1',
  maxWidth: 760,
};

const searchBarStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
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
  marginBottom: 18,
};

const panelTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 14,
  border: '1px solid rgba(148, 163, 184, 0.18)',
  background: '#020617',
  color: '#f8fafc',
};

const selectStyle: CSSProperties = {
  ...inputStyle,
};

const primaryButtonStyle: CSSProperties = {
  border: '1px solid rgba(59, 130, 246, 0.26)',
  background: 'rgba(59, 130, 246, 0.16)',
  color: '#dbeafe',
  borderRadius: 14,
  padding: '12px 18px',
  cursor: 'pointer',
  fontWeight: 700,
};

const secondaryButtonStyle: CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.2)',
  background: '#111827',
  color: '#e2e8f0',
  borderRadius: 12,
  padding: '10px 14px',
  cursor: 'pointer',
  fontWeight: 600,
};

const smallButtonStyle: CSSProperties = {
  border: '1px solid rgba(59, 130, 246, 0.22)',
  background: 'rgba(59, 130, 246, 0.12)',
  color: '#dbeafe',
  borderRadius: 10,
  padding: '8px 12px',
  cursor: 'pointer',
};

const dangerButtonStyle: CSSProperties = {
  border: '1px solid rgba(239, 68, 68, 0.22)',
  background: 'rgba(239, 68, 68, 0.12)',
  color: '#fecaca',
  borderRadius: 10,
  padding: '8px 12px',
  cursor: 'pointer',
};

const errorStyle: CSSProperties = {
  padding: '14px 16px',
  borderRadius: 14,
  background: 'rgba(127, 29, 29, 0.28)',
  border: '1px solid rgba(248, 113, 113, 0.2)',
  color: '#fecaca',
};

const successStyle: CSSProperties = {
  padding: '14px 16px',
  borderRadius: 14,
  background: 'rgba(21, 128, 61, 0.28)',
  border: '1px solid rgba(74, 222, 128, 0.2)',
  color: '#bbf7d0',
};

const mutedTextStyle: CSSProperties = {
  margin: 0,
  color: '#94a3b8',
};

const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  color: '#94a3b8',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const tdStyle: CSSProperties = {
  padding: '14px',
  borderTop: '1px solid rgba(148, 163, 184, 0.1)',
  verticalAlign: 'top',
};

const rowStyle: CSSProperties = {
  background: 'rgba(15, 23, 42, 0.56)',
};

const cellPrimaryStyle: CSSProperties = {
  fontWeight: 600,
};

const cellSecondaryStyle: CSSProperties = {
  marginTop: 6,
  color: '#94a3b8',
  fontSize: 13,
};

const roleEditorStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const statusWrapStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
};

const activityGridStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  color: '#e2e8f0',
  fontSize: 13,
  fontWeight: 600,
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

const activeBadgeStyle: CSSProperties = {
  ...badgeBaseStyle,
  background: 'rgba(34, 197, 94, 0.16)',
  color: '#86efac',
};

const blockedBadgeStyle: CSSProperties = {
  ...badgeBaseStyle,
  background: 'rgba(239, 68, 68, 0.18)',
  color: '#fecaca',
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

const hintStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: 12,
};

const modalOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(2, 6, 23, 0.72)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
};

const modalStyle: CSSProperties = {
  width: '100%',
  maxWidth: 480,
  borderRadius: 20,
  background: '#0f172a',
  border: '1px solid rgba(148, 163, 184, 0.14)',
  padding: 20,
};

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};
