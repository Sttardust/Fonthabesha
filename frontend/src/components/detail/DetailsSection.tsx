/**
 * DetailsSection  (#details anchor)
 *
 * Two-column layout:
 *   Left  — spec table (name, designer, category, styles, scripts, tags, license)
 *   Right — bilingual description text
 */

import { useTranslation } from 'react-i18next';
import { bilingualValue } from '@/lib/utils/bilingualValue';
import type { FontFamilyDetail } from '@/lib/types';

interface DetailsSectionProps {
  family: FontFamilyDetail;
}

function Check({ ok }: { ok: boolean }) {
  return (
    <span
      className={ok ? 'spec-check spec-check--yes' : 'spec-check spec-check--no'}
      aria-label={ok ? 'Yes' : 'No'}
    >
      {ok ? '✓' : '✗'}
    </span>
  );
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="spec-row">
      <th className="spec-row__label">{label}</th>
      <td className="spec-row__value">{children}</td>
    </tr>
  );
}

export default function DetailsSection({ family }: DetailsSectionProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'am' ? 'am' : 'en';

  const amName = family.name.am;
  const enName = family.name.en;
  const description = family.description ? bilingualValue(family.description, lang as 'am' | 'en') : null;
  const designer = family.designer ? bilingualValue(family.designer) : null;

  return (
    <section id="details" className="detail-section">
      <div className="detail-section__header">
        <h2 className="detail-section__title">Details</h2>
      </div>

      <div className="details-body">
        {/* ── Spec table ── */}
        <div className="details-spec">
          <table className="spec-table">
            <tbody>
              {amName && <SpecRow label="ስም (አማርኛ)">{amName}</SpecRow>}
              {enName && <SpecRow label="Name (English)">{enName}</SpecRow>}

              {designer && (
                <SpecRow label={t('fontDetail.designer')}>{designer}</SpecRow>
              )}

              <SpecRow label="Category">
                <span className="badge">
                  {t(`catalog.filters.${family.category}`)}
                </span>
              </SpecRow>

              <SpecRow label="Styles">
                {family.styles.length}
                {family.isVariable && (
                  <span className="badge badge--variable" style={{ marginLeft: 8 }}>
                    Variable
                  </span>
                )}
              </SpecRow>

              <SpecRow label="Script support">
                <span style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span>
                    Ethiopic <Check ok={family.scriptSupport === 'ethiopic' || family.scriptSupport === 'both'} />
                  </span>
                  <span>
                    Latin <Check ok={family.scriptSupport === 'latin' || family.scriptSupport === 'both'} />
                  </span>
                </span>
              </SpecRow>

              <SpecRow label={t('fontDetail.license')}>
                {family.licenseUrl ? (
                  <a
                    href={family.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="spec-link"
                  >
                    {family.license}
                  </a>
                ) : (
                  family.license
                )}
              </SpecRow>

              {family.tags.length > 0 && (
                <SpecRow label="Tags">
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {family.tags.map((tag) => (
                      <span key={tag} className="badge">
                        {tag}
                      </span>
                    ))}
                  </div>
                </SpecRow>
              )}

              <SpecRow label="Added">
                {new Date(family.createdAt).toLocaleDateString('en-GB', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </SpecRow>

              <SpecRow label="Downloads">
                {family.downloadCount.toLocaleString()}
              </SpecRow>
            </tbody>
          </table>
        </div>

        {/* ── Description ── */}
        {description && (
          <div className="details-description">
            <p className="details-description__text">{description}</p>

            {/* Show both languages if available */}
            {family.description?.am && family.description?.en && lang === 'en' && (
              <p className="details-description__alt" lang="am">
                {family.description.am}
              </p>
            )}
            {family.description?.am && family.description?.en && lang === 'am' && (
              <p className="details-description__alt" lang="en">
                {family.description.en}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
