import { useEffect, useState, type CSSProperties } from 'react';
import AdminLayout from './AdminLayout';
import { useAuth } from '../hooks/useAuth';
import { getStats, type AdminStatsSummary, getWatchStats, type WatchStat, type WatchStatsSummary } from '../services/admin.service';
import CatalogService, { type MovieRanking } from '../services/catalog.service';

const emptyStats: AdminStatsSummary = {
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
};

const emptyWatchSummary: WatchStatsSummary = {
  totalWatchEntries: 0,
  totalUsers: 0,
  totalMovies: 0,
  averageProgress: 0,
};

export default function AdminStats() {
  const { session, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStatsSummary>(emptyStats);
  const [watchStats, setWatchStats] = useState<WatchStat[]>([]);
  const [watchSummary, setWatchSummary] = useState<WatchStatsSummary>(emptyWatchSummary);
  const [movieRankings, setMovieRankings] = useState<MovieRanking[]>([]);
  const [rankingError, setRankingError] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadStats = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const [payloadStats, payloadWatch, payloadRankings] = await Promise.all([
        getStats(),
        getWatchStats(),
        CatalogService.getMovieRankings(10, 'month'),
      ]);
      setStats(payloadStats.stats);
      setWatchStats(payloadWatch.watchStats || []);
      setWatchSummary(payloadWatch.summary || emptyWatchSummary);
      setMovieRankings(payloadRankings.rankings || []);
      setRankingError(payloadRankings.error || '');
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Khong the tai so lieu thong ke.');
      console.error('[AdminStats] Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && session) {
      loadStats();
    }
  }, [authLoading, session]);

  return (
    <AdminLayout>
      <div style={pageStyle}>
        <div style={heroStyle}>
          <div>
            <div style={eyebrowStyle}>System stats</div>
            <h2 style={titleStyle}>Thong ke tong quan</h2>
            <p style={subtitleStyle}>
              Page nay thay cho Settings cu va tap trung vao chi so van hanh cua platform.
            </p>
          </div>

          <button type="button" onClick={loadStats} style={buttonStyle} disabled={authLoading || loading}>
            Refresh stats
          </button>
        </div>

        {errorMessage && <div style={errorStyle}>{errorMessage}</div>}

        {authLoading || loading ? (
          <div style={panelStyle}>{authLoading ? 'Dang tai auth...' : 'Dang tai thong ke...'}</div>
        ) : (
          <>
            <div style={metricGridStyle}>
              <section style={panelStyle}>
                <h3 style={sectionTitleStyle}>Users</h3>
                <div style={metricListStyle}>
                  <MetricRow label="Tong users" value={stats.totalUsers} />
                  <MetricRow label="Admins" value={stats.totalAdmins} />
                  <MetricRow label="Users thuong" value={stats.totalNormalUsers} />
                  <MetricRow label="Tai khoan bi khoa" value={stats.blockedUsers} />
                </div>
              </section>

              <section style={panelStyle}>
                <h3 style={sectionTitleStyle}>Content control</h3>
                <div style={metricListStyle}>
                  <MetricRow label="Content hidden" value={stats.hiddenContent} />
                  <MetricRow label="Content featured" value={stats.featuredContent} />
                  <MetricRow label="Content blocked" value={stats.blockedContent} />
                </div>
              </section>
            </div>

            <section style={panelStyle}>
              <div style={watchHeaderStyle}>
                <h3 style={sectionTitleStyle}>Top luot xem thang nay</h3>
                <span style={watchSummaryBadgeStyle}>Dữ liệu xếp hạng phim</span>
              </div>

              {rankingError ? (
                <p style={emptyTextStyle}>Khong the tai bang xep hang thang: {rankingError}</p>
              ) : movieRankings.length === 0 ? (
                <p style={emptyTextStyle}>Chua co du lieu luot xem trong thang.</p>
              ) : (
                <div style={rankingTableStyle}>
                  <div style={rankingTableHeaderStyle}>
                    <div style={watchTableCellStyle}>Title</div>
                    <div style={watchTableCellStyle}>Views</div>
                    <div style={watchTableCellStyle}>Favorites</div>
                    <div style={watchTableCellStyle}>Avg rating</div>
                    <div style={watchTableCellStyle}>Score</div>
                  </div>

                  {movieRankings.map((movie) => (
                    <div key={movie.movie_id} style={rankingTableRowStyle}>
                      <div style={watchTableCellStyle}>
                        <div>
                          <div style={watchUserNameStyle}>{movie.title}</div>
                          <div style={watchUserEmailStyle}>Mã phim: {movie.tmdb_id || '-'}</div>
                        </div>
                      </div>
                      <div style={watchTableCellStyle}>{movie.view_count}</div>
                      <div style={watchTableCellStyle}>{movie.favorite_count}</div>
                      <div style={watchTableCellStyle}>{movie.average_rating.toFixed(1)}</div>
                      <div style={watchTableCellStyle}>{movie.ranking_score.toFixed(1)}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section style={panelStyle}>
              <div style={watchHeaderStyle}>
                <h3 style={sectionTitleStyle}>Watch Statistics</h3>
                <span style={watchSummaryBadgeStyle}>
                  {watchSummary.totalWatchEntries} entries · {watchSummary.totalUsers} users · {watchSummary.totalMovies} movies
                </span>
              </div>
              {watchStats.length === 0 ? (
                <p style={emptyTextStyle}>No watch history data available.</p>
              ) : (
                <div style={watchTableStyle}>
                  <div style={watchTableHeaderStyle}>
                    <div style={watchTableCellStyle}>User</div>
                    <div style={watchTableCellStyle}>Movie</div>
                    <div style={watchTableCellStyle}>Watched Time</div>
                    <div style={watchTableCellStyle}>Progress</div>
                    <div style={watchTableCellStyle}>Last Watched</div>
                  </div>
                  {watchStats.slice(0, 20).map((watch) => (
                    <div key={watch.id} style={watchTableRowStyle}>
                      <div style={watchTableCellStyle}>
                        <div style={watchUserNameStyle}>{watch.user_name}</div>
                        <div style={watchUserEmailStyle}>{watch.user_email}</div>
                      </div>
                      <div style={watchTableCellStyle}>
                        <div>
                          <div style={watchUserNameStyle}>{watch.movie_title}</div>
                          <div style={watchUserEmailStyle}>TMDB: {watch.tmdb_id || '-'} · Movie ID: {watch.movie_id}</div>
                        </div>
                      </div>
                      <div style={watchTableCellStyle}>
                        {watch.watched_minutes} / {watch.total_minutes} min
                      </div>
                      <div style={watchTableCellStyle}>
                        <div style={progressBarContainerStyle}>
                          <div style={{...progressBarStyle, width: `${watch.progress_percent}%`}} />
                        </div>
                        <div style={progressTextStyle}>{watch.progress_percent}%</div>
                      </div>
                      <div style={watchTableCellStyle}>
                        {new Date(watch.last_watched_at).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div style={panelStyle}>
              <h3 style={sectionTitleStyle}>Notes</h3>
              <p style={noteStyle}>
                Trang thong ke demo chi hien thi user, content control va lich su xem.
              </p>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={metricRowStyle}>
      <span style={metricLabelStyle}>{label}</span>
      <strong style={metricValueStyle}>{value}</strong>
    </div>
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

const buttonStyle: CSSProperties = {
  border: '1px solid rgba(59, 130, 246, 0.26)',
  background: 'rgba(59, 130, 246, 0.14)',
  color: '#dbeafe',
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

const metricGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 16,
};

const panelStyle: CSSProperties = {
  borderRadius: 20,
  background: '#0f172a',
  border: '1px solid rgba(148, 163, 184, 0.14)',
  padding: 20,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
};

const metricListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  marginTop: 18,
};

const metricRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 14,
  background: 'rgba(15, 23, 42, 0.7)',
  border: '1px solid rgba(148, 163, 184, 0.1)',
};

const metricLabelStyle: CSSProperties = {
  color: '#cbd5e1',
};

const metricValueStyle: CSSProperties = {
  fontSize: 24,
};

const noteStyle: CSSProperties = {
  margin: '12px 0 0',
  color: '#cbd5e1',
};

const watchHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  marginBottom: 16,
};

const watchSummaryBadgeStyle: CSSProperties = {
  fontSize: 12,
  color: '#94a3b8',
  padding: '6px 10px',
  borderRadius: 8,
  background: 'rgba(148, 163, 184, 0.1)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
};

const watchTableStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginTop: 12,
};

const rankingTableStyle: CSSProperties = {
  ...watchTableStyle,
};

const rankingTableHeaderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 12,
  background: 'rgba(15, 23, 42, 0.8)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  fontWeight: 700,
  fontSize: 12,
  color: '#cbd5e1',
  textTransform: 'uppercase',
};

const rankingTableRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 10,
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid rgba(148, 163, 184, 0.1)',
  fontSize: 13,
};

const watchTableHeaderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2fr 2fr 1.3fr 1.4fr 1.2fr',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 12,
  background: 'rgba(15, 23, 42, 0.8)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  fontWeight: 700,
  fontSize: 12,
  color: '#cbd5e1',
  textTransform: 'uppercase',
};

const watchTableRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2fr 2fr 1.3fr 1.4fr 1.2fr',
  gap: 12,
  padding: '12px 14px',
  borderRadius: 10,
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid rgba(148, 163, 184, 0.1)',
  fontSize: 13,
};

const watchTableCellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  color: '#e2e8f0',
};

const watchUserNameStyle: CSSProperties = {
  fontWeight: 600,
};

const watchUserEmailStyle: CSSProperties = {
  fontSize: 12,
  color: '#94a3b8',
  marginTop: 2,
};

const progressBarContainerStyle: CSSProperties = {
  width: '100%',
  height: 6,
  borderRadius: 3,
  background: 'rgba(148, 163, 184, 0.2)',
  overflow: 'hidden',
  marginBottom: 4,
};

const progressBarStyle: CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #38bdf8, #06b6d4)',
  borderRadius: 3,
  transition: 'width 0.3s ease',
};

const progressTextStyle: CSSProperties = {
  fontSize: 11,
  color: '#94a3b8',
};

const emptyTextStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: 14,
};
