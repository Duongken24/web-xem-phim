import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import AdminLayout from './AdminLayout';
import {
  createPlan,
  getPlans,
  updatePlan,
  type SubscriptionPlan,
} from '../services/admin.service';

const emptyForm = {
  name: '',
  code: '',
  price: '49000',
  durationDays: '30',
  description: '',
  isActive: true,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function AdminPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const activePlans = useMemo(() => plans.filter((plan) => plan.is_active).length, [plans]);

  const loadPlans = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const payload = await getPlans();
      setPlans(payload.plans || []);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the tai danh sach plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const resetForm = () => {
    setEditingPlanId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toLowerCase(),
        price: Number(form.price),
        durationDays: Number(form.durationDays),
        description: form.description.trim(),
        isActive: form.isActive,
      };

      if (editingPlanId) {
        await updatePlan(editingPlanId, payload);
      } else {
        await createPlan(payload);
      }

      resetForm();
      await loadPlans();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the luu plan.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (plan: SubscriptionPlan) => {
    setEditingPlanId(plan.id);
    setForm({
      name: plan.name,
      code: plan.code,
      price: String(plan.price),
      durationDays: String(plan.duration_days),
      description: plan.description || '',
      isActive: plan.is_active,
    });
  };

  const togglePlanActive = async (plan: SubscriptionPlan) => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      await updatePlan(plan.id, { isActive: !plan.is_active });
      await loadPlans();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the cap nhat plan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div style={pageStyle}>
        <div style={headerStyle}>
          <div>
            <div style={eyebrowStyle}>Subscription plans</div>
            <h2 style={titleStyle}>Plans management</h2>
            <p style={subtitleStyle}>
              Quan ly bang subscription_plans va giu 3 goi mau Silver, Gold, Diamond neu da
              migrate.
            </p>
          </div>

          <div style={summaryCardStyle}>
            <div style={summaryLabelStyle}>Plans active</div>
            <div style={summaryValueStyle}>{activePlans}</div>
          </div>
        </div>

        {errorMessage && <div style={errorStyle}>{errorMessage}</div>}

        <div style={layoutStyle}>
          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <h3 style={panelTitleStyle}>{editingPlanId ? 'Edit plan' : 'Create plan'}</h3>
              {editingPlanId && (
                <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
                  Cancel edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} style={formStyle}>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Plan name"
                style={inputStyle}
                required
              />
              <input
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="Code (silver, gold...)"
                style={inputStyle}
                required
              />
              <input
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                placeholder="Price"
                type="number"
                min="0"
                style={inputStyle}
                required
              />
              <input
                value={form.durationDays}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, durationDays: event.target.value }))
                }
                placeholder="Duration days"
                type="number"
                min="1"
                style={inputStyle}
                required
              />
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Description / benefits"
                style={textareaStyle}
              />

              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
                <span>Plan is active</span>
              </label>

              <button type="submit" disabled={submitting} style={primaryButtonStyle}>
                {submitting ? 'Saving...' : editingPlanId ? 'Save changes' : 'Create plan'}
              </button>
            </form>
          </section>

          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <h3 style={panelTitleStyle}>Current plans</h3>
              <button type="button" onClick={loadPlans} style={secondaryButtonStyle}>
                Refresh
              </button>
            </div>

            {loading ? (
              <p style={emptyTextStyle}>Dang tai plans...</p>
            ) : plans.length === 0 ? (
              <p style={emptyTextStyle}>
                Chua co plan nao. Chay migration de seed 3 plan mau hoac tao thu cong.
              </p>
            ) : (
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Name</th>
                      <th style={thStyle}>Code</th>
                      <th style={thStyle}>Price</th>
                      <th style={thStyle}>Duration</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => (
                      <tr key={plan.id} style={rowStyle}>
                        <td style={tdStyle}>
                          <div style={cellPrimaryStyle}>{plan.name}</div>
                          <div style={cellSecondaryStyle}>{plan.description || 'No description'}</div>
                        </td>
                        <td style={tdStyle}>{plan.code}</td>
                        <td style={tdStyle}>{formatCurrency(plan.price)}</td>
                        <td style={tdStyle}>{plan.duration_days} days</td>
                        <td style={tdStyle}>
                          <span style={plan.is_active ? activeBadgeStyle : mutedBadgeStyle}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={actionRowStyle}>
                            <button type="button" onClick={() => startEdit(plan)} style={smallButtonStyle}>
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => togglePlanActive(plan)}
                              style={smallButtonStyle}
                            >
                              {plan.is_active ? 'Disable' : 'Enable'}
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

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  alignItems: 'stretch',
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

const summaryCardStyle: CSSProperties = {
  minWidth: 180,
  padding: 20,
  borderRadius: 20,
  background: '#0f172a',
  border: '1px solid rgba(148, 163, 184, 0.14)',
};

const summaryLabelStyle: CSSProperties = {
  color: '#94a3b8',
};

const summaryValueStyle: CSSProperties = {
  marginTop: 10,
  fontSize: 34,
  fontWeight: 700,
};

const errorStyle: CSSProperties = {
  padding: '14px 16px',
  borderRadius: 14,
  background: 'rgba(127, 29, 29, 0.28)',
  border: '1px solid rgba(248, 113, 113, 0.2)',
  color: '#fecaca',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(320px, 380px) minmax(0, 1fr)',
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

const textareaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 120,
  resize: 'vertical',
};

const checkboxRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  color: '#e2e8f0',
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
  background: 'rgba(15, 23, 42, 0.72)',
  color: '#e2e8f0',
  borderRadius: 12,
  padding: '10px 14px',
  cursor: 'pointer',
  fontWeight: 600,
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

const activeBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  padding: '6px 10px',
  background: 'rgba(34, 197, 94, 0.16)',
  color: '#86efac',
  fontSize: 12,
  fontWeight: 700,
};

const mutedBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  padding: '6px 10px',
  background: 'rgba(148, 163, 184, 0.16)',
  color: '#e2e8f0',
  fontSize: 12,
  fontWeight: 700,
};

const actionRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const smallButtonStyle: CSSProperties = {
  border: '1px solid rgba(148, 163, 184, 0.2)',
  background: '#111827',
  color: '#f8fafc',
  borderRadius: 10,
  padding: '8px 12px',
  cursor: 'pointer',
};

const emptyTextStyle: CSSProperties = {
  margin: 0,
  color: '#94a3b8',
};
