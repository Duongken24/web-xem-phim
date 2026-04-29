import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import AdminLayout from './AdminLayout';
import {
  assignSubscription,
  getPlans,
  getSubscriptions,
  getUsers,
  updateSubscription,
  type AdminSubscription,
  type AdminUser,
  type SubscriptionPlan,
} from '../services/admin.service';

const today = new Date().toISOString().slice(0, 10);

const addDays = (dateString: string, days: number) => {
  const base = new Date(`${dateString}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
};

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [form, setForm] = useState({ userId: '', planId: '', startDate: today });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const assignableUsers = useMemo(() => users.filter((user) => !user.is_blocked), [users]);
  const activePlans = useMemo(() => plans.filter((plan) => plan.is_active), [plans]);

  const loadPage = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const [subscriptionsPayload, usersPayload, plansPayload] = await Promise.all([
        getSubscriptions(),
        getUsers(),
        getPlans(),
      ]);

      setSubscriptions(subscriptionsPayload.subscriptions || []);
      setUsers(usersPayload.users || []);
      setPlans(plansPayload.plans || []);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the tai subscription data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
  }, []);

  const handleAssign = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    try {
      await assignSubscription({
        userId: form.userId,
        planId: form.planId,
        startDate: form.startDate,
      });
      setForm({ userId: '', planId: '', startDate: today });
      await loadPage();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the assign subscription.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenew = async (subscription: AdminSubscription) => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const durationDays = subscription.plan_duration_days || 30;
      const baseDate = subscription.end_date && subscription.end_date > today ? subscription.end_date : today;
      const nextEndDate = addDays(baseDate, durationDays);
      await updateSubscription(subscription.id, {
        status: 'active',
        endDate: nextEndDate,
      });
      await loadPage();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the renew subscription.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (subscription: AdminSubscription) => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      await updateSubscription(subscription.id, { status: 'cancelled' });
      await loadPage();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the cancel subscription.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div style={pageStyle}>
        <div style={heroStyle}>
          <div>
            <div style={eyebrowStyle}>Manual subscription ops</div>
            <h2 style={titleStyle}>Subscriptions management</h2>
            <p style={subtitleStyle}>
              Gan goi thu cong cho user, theo doi trang thai va xu ly renew/cancel o muc MVP.
            </p>
          </div>

          <button type="button" onClick={loadPage} style={secondaryButtonStyle}>
            Refresh
          </button>
        </div>

        {errorMessage && <div style={errorStyle}>{errorMessage}</div>}

        <div style={gridStyle}>
          <section style={panelStyle}>
            <h3 style={panelTitleStyle}>Assign subscription</h3>
            <form onSubmit={handleAssign} style={formStyle}>
              <select
                value={form.userId}
                onChange={(event) => setForm((prev) => ({ ...prev, userId: event.target.value }))}
                style={inputStyle}
                required
              >
                <option value="">Select user</option>
                {assignableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email || user.id}
                  </option>
                ))}
              </select>

              <select
                value={form.planId}
                onChange={(event) => setForm((prev) => ({ ...prev, planId: event.target.value }))}
                style={inputStyle}
                required
              >
                <option value="">Select plan</option>
                {activePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.duration_days} days)
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                style={inputStyle}
                required
              />

              <button type="submit" disabled={submitting} style={primaryButtonStyle}>
                {submitting ? 'Assigning...' : 'Assign plan'}
              </button>
            </form>

            <div style={helperTextStyle}>
              Chi user khong bi block va plan dang active moi hien trong form de tranh thao tac sai.
            </div>
          </section>

          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <h3 style={panelTitleStyle}>Subscription list</h3>
              <span style={mutedTextStyle}>{subscriptions.length} rows</span>
            </div>

            {loading ? (
              <p style={mutedTextStyle}>Dang tai subscriptions...</p>
            ) : subscriptions.length === 0 ? (
              <p style={mutedTextStyle}>Chua co subscription nao. Tao plan va assign de bat dau.</p>
            ) : (
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>User</th>
                      <th style={thStyle}>Plan</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Start</th>
                      <th style={thStyle}>End</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((subscription) => (
                      <tr key={subscription.id} style={rowStyle}>
                        <td style={tdStyle}>
                          <div style={cellPrimaryStyle}>{subscription.user_email || 'Unknown user'}</div>
                          <div style={cellSecondaryStyle}>{subscription.user_name || subscription.user_id}</div>
                        </td>
                        <td style={tdStyle}>{subscription.plan_name || 'Unknown plan'}</td>
                        <td style={tdStyle}>
                          <span style={statusBadge(subscription.status)}>{subscription.status}</span>
                        </td>
                        <td style={tdStyle}>{subscription.start_date || '-'}</td>
                        <td style={tdStyle}>{subscription.end_date || '-'}</td>
                        <td style={tdStyle}>
                          <div style={actionRowStyle}>
                            <button type="button" onClick={() => handleRenew(subscription)} style={smallButtonStyle}>
                              Renew
                            </button>
                            <button type="button" onClick={() => handleCancel(subscription)} style={dangerButtonStyle}>
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
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
};

const errorStyle: CSSProperties = {
  padding: '14px 16px',
  borderRadius: 14,
  background: 'rgba(127, 29, 29, 0.28)',
  border: '1px solid rgba(248, 113, 113, 0.2)',
  color: '#fecaca',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(300px, 360px) minmax(0, 1fr)',
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
  marginBottom: 18,
};

const panelTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
};

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 14,
  border: '1px solid rgba(148, 163, 184, 0.18)',
  background: '#020617',
  color: '#f8fafc',
};

const primaryButtonStyle: CSSProperties = {
  border: '1px solid rgba(34, 197, 94, 0.26)',
  background: 'rgba(34, 197, 94, 0.16)',
  color: '#dcfce7',
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

const helperTextStyle: CSSProperties = {
  marginTop: 14,
  color: '#94a3b8',
  fontSize: 13,
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

const actionRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
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

const badgeBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'capitalize',
};

const statusBadge = (status: string): CSSProperties => ({
  ...badgeBaseStyle,
  background: status === 'active' ? 'rgba(34, 197, 94, 0.16)' : 'rgba(148, 163, 184, 0.16)',
  color: status === 'active' ? '#86efac' : '#e2e8f0',
});
