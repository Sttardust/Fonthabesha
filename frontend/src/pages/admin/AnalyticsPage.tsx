/**
 * AnalyticsPage — download trends, top fonts, and activity summary.
 *
 * Uses pure CSS/SVG charts (no external chart library needed).
 * Data from GET /api/v1/admin/analytics?months=N
 */
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api/admin';
import { bilingualValue } from '@/lib/utils/bilingualValue';

const PERIOD_OPTIONS = [
  { label: '3 months',  value: 3  },
  { label: '6 months',  value: 6  },
  { label: '12 months', value: 12 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMonth(period: string): string {
  const [year, month] = period.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleDateString(undefined, {
    month: 'short', year: '2-digit',
  });
}

function shortNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ── Inline SVG sparkline (downloads over time) ────────────────────────────────

function DownloadSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max  = Math.max(...values, 1);
  const W    = 600;
  const H    = 120;
  const pad  = 4;
  const step = (W - pad * 2) / (values.length - 1);

  const pts = values.map((v, i) => ({
    x: pad + i * step,
    y: H - pad - ((v / max) * (H - pad * 2)),
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${H} L${pad},${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="analytics-sparkline"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--color-accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-grad)" />
      <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--color-accent)" />
      ))}
    </svg>
  );
}

// ── CSS bar chart (top fonts) ─────────────────────────────────────────────────

function TopFontsBars({ fonts, maxDownloads }: { fonts: { name: string; downloads: number; slug: string }[]; maxDownloads: number }) {
  return (
    <ol className="analytics-bars" aria-label="Top fonts by downloads">
      {fonts.map((font, i) => {
        const pct = maxDownloads > 0 ? (font.downloads / maxDownloads) * 100 : 0;
        return (
          <li key={i} className="analytics-bar-row">
            <span className="analytics-bar-row__rank">{i + 1}</span>
            <Link
              to={`/fonts/${font.slug}`}
              className="analytics-bar-row__name"
              target="_blank"
              rel="noopener noreferrer"
            >
              {font.name}
            </Link>
            <div className="analytics-bar-row__bar-wrap" aria-label={`${font.downloads} downloads`}>
              <div
                className="analytics-bar-row__bar"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="analytics-bar-row__count">
              {shortNum(font.downloads)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [months, setMonths] = useState(12);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'analytics', months],
    queryFn: () => adminApi.analytics(months),
    staleTime: 5 * 60_000,
  });

  const downloadValues = data?.periods.map((p) => p.downloads) ?? [];
  const topFonts = (data?.topFonts ?? []).slice(0, 10).map((f) => ({
    name:      bilingualValue(f.name),
    slug:      f.slug,
    downloads: f.downloads,
  }));
  const maxTopDownloads = Math.max(...topFonts.map((f) => f.downloads), 1);

  return (
    <>
      <Helmet><title>{t('admin.analytics.title')} — Fonthabesha</title></Helmet>

      <div className="portal-page-header">
        <h1 className="portal-page-title">{t('admin.analytics.title')}</h1>
        <div className="analytics-period-select">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`filter-item${months === opt.value ? ' filter-item--active' : ''}`}
              onClick={() => setMonths(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p>{t('common.loading')}</p>}
      {isError   && <p className="form-error">{t('common.error')}</p>}

      {data && (
        <>
          {/* ── KPI cards ── */}
          <div className="stat-grid stat-grid--analytics">
            <div className="stat-card">
              <span className="stat-card__value">
                {shortNum(data.totalDownloads)}
              </span>
              <span className="stat-card__label">{t('admin.analytics.totalDownloads')}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{data.totalFamilies}</span>
              <span className="stat-card__label">{t('admin.analytics.publishedFamilies')}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card__value">{data.totalContributors}</span>
              <span className="stat-card__label">{t('admin.analytics.contributors')}</span>
            </div>
            {data.periods.length > 0 && (
              <div className="stat-card">
                <span className="stat-card__value">
                  {shortNum(
                    data.periods.reduce((sum, p) => sum + p.downloads, 0),
                  )}
                </span>
                <span className="stat-card__label">
                  Downloads (last {months} mo.)
                </span>
              </div>
            )}
          </div>

          {/* ── Download trend ── */}
          {data.periods.length > 1 && (
            <section className="analytics-section">
              <h2 className="analytics-section__title">
                {t('admin.analytics.downloadTrend')}
              </h2>
              <div className="analytics-chart-card">
                <div className="analytics-chart-card__labels">
                  {data.periods.map((p, i) => (
                    <span key={i} className="analytics-chart-card__label">
                      {formatMonth(p.period)}
                    </span>
                  ))}
                </div>
                <DownloadSparkline values={downloadValues} />
                <div className="analytics-chart-card__meta">
                  {data.periods.map((p, i) => (
                    <span key={i} className="analytics-chart-card__val" title={String(p.downloads)}>
                      {shortNum(p.downloads)}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── Two-column: top fonts + monthly activity ── */}
          <div className="analytics-bottom-grid">
            {/* Top fonts */}
            {topFonts.length > 0 && (
              <section className="analytics-section">
                <h2 className="analytics-section__title">
                  {t('admin.analytics.topFonts')}
                </h2>
                <div className="analytics-card">
                  <TopFontsBars fonts={topFonts} maxDownloads={maxTopDownloads} />
                </div>
              </section>
            )}

            {/* Monthly breakdown table */}
            {data.periods.length > 0 && (
              <section className="analytics-section">
                <h2 className="analytics-section__title">
                  {t('admin.analytics.monthlyBreakdown')}
                </h2>
                <div className="analytics-card">
                  <table className="data-table data-table--compact analytics-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Downloads</th>
                        <th>New Fonts</th>
                        <th>Submissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data.periods].reverse().map((p) => (
                        <tr key={p.period}>
                          <td>{formatMonth(p.period)}</td>
                          <td>{p.downloads.toLocaleString()}</td>
                          <td>{p.newFamilies}</td>
                          <td>{p.newSubmissions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </>
  );
}
