import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { fetchFamilyDetail } from '../lib/api';
import type { FontFamilyDetail } from '../types/catalog';

type FamilyDetailPageProps = {
  onHealthChange(status: string): void;
};

export function FamilyDetailPage({ onHealthChange }: FamilyDetailPageProps) {
  const { slug } = useParams();
  const [family, setFamily] = useState<FontFamilyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!slug) {
        setError('Missing family slug');
        setLoading(false);
        return;
      }

      try {
        const detail = await fetchFamilyDetail(slug);

        if (!cancelled) {
          onHealthChange('ok');
          setFamily(detail);
        }
      } catch (loadError) {
        if (!cancelled) {
          onHealthChange('down');
          setError(loadError instanceof Error ? loadError.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [onHealthChange, slug]);

  if (loading) {
    return (
      <section className="catalog">
        <div className="empty-state">
          <p>Loading family details...</p>
        </div>
      </section>
    );
  }

  if (error || !family) {
    return (
      <section className="catalog">
        <div className="section-header">
          <div>
            <p className="eyebrow">Family Detail</p>
            <h2>Unable to load family</h2>
          </div>
          <Link className="text-link" to="/">
            Back to catalog
          </Link>
        </div>
        <p className="error-text">{error ?? 'Family not found'}</p>
      </section>
    );
  }

  const specimenText =
    family.specimenDefaults.am ??
    family.specimenDefaults.en ??
    family.name.native ??
    family.name.am ??
    family.name.en;

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Family Detail</p>
          <h1>{family.name.native ?? family.name.am ?? family.name.en}</h1>
          <p className="lede">
            {family.description.am ?? family.description.en ?? 'No public description yet.'}
          </p>
          <div className="status-row">
            <Link className="text-link" to="/">
              Back to catalog
            </Link>
            {family.license ? (
              <span className="soft-note">
                {family.license.name} ({family.license.code})
              </span>
            ) : null}
            {family.version ? <span className="soft-note">Version {family.version}</span> : null}
          </div>
        </div>
      </section>

      <section className="catalog">
        <div className="section-header">
          <div>
            <p className="eyebrow">Specimen</p>
            <h2>Preview text</h2>
          </div>
        </div>

        <div className="specimen-panel">
          <p className="specimen-text">{specimenText}</p>
          <div className="detail-grid">
            <div className="detail-card">
              <span className="detail-label">Script</span>
              <strong>{family.script}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Category</span>
              <strong>{family.category ?? 'Uncategorized'}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Supports</span>
              <strong>
                {family.supports.ethiopic ? 'Ethiopic' : ''}
                {family.supports.ethiopic && family.supports.latin ? ' + ' : ''}
                {family.supports.latin ? 'Latin' : ''}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="catalog">
        <div className="section-header">
          <div>
            <p className="eyebrow">Styles</p>
            <h2>{family.styles.length} approved styles</h2>
          </div>
        </div>

        <div className="style-list">
          {family.styles.map((style) => (
            <article className="style-card" key={style.id}>
              <div className="style-card-copy">
                <p className="font-name">{style.name}</p>
                <p className="font-card-subtle">
                  {style.weightLabel ?? style.weightClass ?? 'Unknown weight'}
                  {style.isItalic ? ' · Italic' : ''}
                  {style.isVariable ? ' · Variable' : ''}
                </p>
                <p className="metric-line">
                  {style.metrics.glyphCount ?? 0} glyphs · {formatBytes(style.fileSizeBytes)}
                </p>
              </div>
              <a className="action-button action-button-link" href={style.assetUrl} target="_blank" rel="noreferrer">
                Open font file
              </a>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
