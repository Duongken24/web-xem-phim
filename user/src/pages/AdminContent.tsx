import { useEffect, useState, type CSSProperties } from 'react';
import AdminLayout from './AdminLayout';
import {
  getContentControls,
  upsertContentControl,
  type ContentControl,
} from '../services/admin.service';

const emptyForm = {
  movieId: '',
  isHidden: false,
  isFeatured: false,
  isPremium: false,
  isBlocked: false,
  note: '',
};

export default function AdminContent() {
  const [items, setItems] = useState<ContentControl[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMovieId, setEditingMovieId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadContent = async (query = '') => {
    setLoading(true);
    setErrorMessage('');

    try {
      const payload = await getContentControls(query);
      setItems(payload.content || []);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the tai content controls.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const resetForm = () => {
    setEditingMovieId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    try {
      await upsertContentControl({
        movieId: Number(form.movieId),
        isHidden: form.isHidden,
        isFeatured: form.isFeatured,
        isPremium: form.isPremium,
        isBlocked: form.isBlocked,
        note: form.note.trim(),
      });

      resetForm();
      await loadContent(searchQuery);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the luu content control.');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (item: ContentControl) => {
    setEditingMovieId(item.movie_id);
    setForm({
      movieId: String(item.movie_id),
      isHidden: item.is_hidden,
      isFeatured: item.is_featured,
      isPremium: item.is_premium,
      isBlocked: item.is_blocked,
      note: item.note || '',
    });
  };

  const quickToggle = async (
    item: ContentControl,
    field: 'is_hidden' | 'is_featured' | 'is_premium' | 'is_blocked'
  ) => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      await upsertContentControl({
        movieId: item.movie_id,
        isHidden: field === 'is_hidden' ? !item.is_hidden : item.is_hidden,
        isFeatured: field === 'is_featured' ? !item.is_featured : item.is_featured,
        isPremium: field === 'is_premium' ? !item.is_premium : item.is_premium,
        isBlocked: field === 'is_blocked' ? !item.is_blocked : item.is_blocked,
        note: item.note || '',
      });
      await loadContent(searchQuery);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the cap nhat content control.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    await loadContent(searchQuery);
  };

  return (
    <AdminLayout>
      <div style={pageStyle}>
        <div style={heroStyle}>
          <div>
            <div style={eyebrowStyle}>Internal content control</div>
            <h2 style={titleStyle}>Content management</h2>
            <p style={subtitleStyle}>
              Khong CRUD movie metadata. Page nay chi quan ly hidden, featured, blocked va note noi bo.
            </p>
          </div>

          <div style={adminActionStackStyle}>
            <form onSubmit={handleSearch} style={searchFormStyle}>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by movie id or title"
                style={inputStyle}
              />
              <button type="submit" style={secondaryButtonStyle}>
                Search
              </button>
            </form>
          </div>
        </div>

        {errorMessage && <div style={errorStyle}>{errorMessage}</div>}

        <div style={gridStyle}>
          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <h3 style={panelTitleStyle}>
                {editingMovieId ? `Edit movie ${editingMovieId}` : 'Create / update control'}
              </h3>
              {editingMovieId && (
                <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
                  Cancel edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} style={formStyle}>
              <input
                value={form.movieId}
                onChange={(event) => setForm((prev) => ({ ...prev, movieId: event.target.value }))}
                placeholder="Internal movie id"
                type="number"
                min="1"
                style={inputStyle}
                required
              />

              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={form.isHidden}
                  onChange={(event) => setForm((prev) => ({ ...prev, isHidden: event.target.checked }))}
                />
                <span>Hide content</span>
              </label>
              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isFeatured: event.target.checked }))
                  }
                />
                <span>Mark as featured</span>
              </label>
              <label style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={form.isBlocked}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isBlocked: event.target.checked }))
                  }
                />
                <span>Block content</span>
              </label>

              <textarea
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Internal note"
                style={textareaStyle}
              />

              <button type="submit" disabled={submitting} style={primaryButtonStyle}>
                {submitting ? 'Saving...' : editingMovieId ? 'Save control' : 'Create control'}
              </button>
            </form>
          </section>

          <section style={panelStyle}>
            <div style={panelHeaderStyle}>
              <h3 style={panelTitleStyle}>Current content controls</h3>
              <button type="button" onClick={() => loadContent(searchQuery)} style={secondaryButtonStyle}>
                Refresh
              </button>
            </div>

            {loading ? (
              <p style={mutedTextStyle}>Dang tai content controls...</p>
            ) : items.length === 0 ? (
              <p style={mutedTextStyle}>Chua co movie control nao. Tao movie_id dau tien de bat dau.</p>
            ) : (
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Movie</th>
                      <th style={thStyle}>Flags</th>
                      <th style={thStyle}>Note</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} style={rowStyle}>
                        <td style={tdStyle}>
                          <div style={cellPrimaryStyle}>{item.movie_title || `Movie #${item.movie_id}`}</div>
                          <div style={cellSecondaryStyle}>movie_id: {item.movie_id}</div>
                        </td>
                        <td style={tdStyle}>
                          <div style={flagWrapStyle}>
                            <span style={item.is_hidden ? activeFlagStyle : mutedFlagStyle}>Hidden</span>
                            <span style={item.is_featured ? activeFlagStyle : mutedFlagStyle}>Featured</span>
                            <span style={item.is_blocked ? blockedFlagStyle : mutedFlagStyle}>Blocked</span>
                          </div>
                        </td>
                        <td style={tdStyle}>{item.note || '-'}</td>
                        <td style={tdStyle}>
                          <div style={actionGridStyle}>
                            <button type="button" onClick={() => startEdit(item)} style={smallButtonStyle}>
                              Edit
                            </button>
                            <button type="button" onClick={() => quickToggle(item, 'is_hidden')} style={smallButtonStyle}>
                              Toggle hidden
                            </button>
                            <button type="button" onClick={() => quickToggle(item, 'is_featured')} style={smallButtonStyle}>
                              Toggle featured
                            </button>
                            <button type="button" onClick={() => quickToggle(item, 'is_blocked')} style={dangerButtonStyle}>
                              Toggle blocked
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
  maxWidth: 760,
};

const searchFormStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
};

const adminActionStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  alignItems: 'flex-end',
  minWidth: 360,
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
  background: '#111827',
  color: '#e2e8f0',
  borderRadius: 12,
  padding: '10px 14px',
  cursor: 'pointer',
  fontWeight: 600,
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

const flagWrapStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
};

const flagBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 700,
};

const activeFlagStyle: CSSProperties = {
  ...flagBaseStyle,
  background: 'rgba(34, 197, 94, 0.16)',
  color: '#86efac',
};

const blockedFlagStyle: CSSProperties = {
  ...flagBaseStyle,
  background: 'rgba(239, 68, 68, 0.18)',
  color: '#fecaca',
};

const mutedFlagStyle: CSSProperties = {
  ...flagBaseStyle,
  background: 'rgba(148, 163, 184, 0.16)',
  color: '#e2e8f0',
};

const actionGridStyle: CSSProperties = {
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

const dangerButtonStyle: CSSProperties = {
  border: '1px solid rgba(239, 68, 68, 0.22)',
  background: 'rgba(239, 68, 68, 0.12)',
  color: '#fecaca',
  borderRadius: 10,
  padding: '8px 12px',
  cursor: 'pointer',
};
