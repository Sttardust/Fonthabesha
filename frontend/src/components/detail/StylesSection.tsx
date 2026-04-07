/**
 * StylesSection  (#styles anchor)
 *
 * Lists every style in the family. Each row:
 * - Style name + weight label
 * - Giant specimen rendered in that specific style
 * - Individual per-row size slider
 *
 * Fonts are loaded on mount via fontLoader (not lazy — user is already on detail page).
 */

import { useEffect, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { useTranslation } from 'react-i18next';

import { loadFontStyle } from '@/lib/utils/fontLoader';
import { useSpecimenStore, SPECIMEN_PRESETS, type SpecimenPreset } from '@/lib/store/specimenStore';
import { bilingualValue } from '@/lib/utils/bilingualValue';
import type { FontStyleDetail, FontFamilyDetail } from '@/lib/types';

interface StylesRowProps {
  familyId: string;
  style: FontStyleDetail;
  specimenText: string;
  fontSize: number;
  darkMode: boolean;
}

function StyleRow({ familyId, style, specimenText, fontSize, darkMode }: StylesRowProps) {
  const [cssFamily, setCssFamily] = useState<string | null>(null);
  const [rowSize, setRowSize] = useState(fontSize);

  // Keep in sync when global size changes
  useEffect(() => { setRowSize(fontSize); }, [fontSize]);

  useEffect(() => {
    loadFontStyle(familyId, style.id, style.assetUrl).then(setCssFamily);
  }, [familyId, style.id, style.assetUrl]);

  // style.name is a plain string (not BilingualString)
  const styleName = style.name;
  const weightDesc = style.weightLabel ?? (style.weightClass ? String(style.weightClass) : '');

  return (
    <div className="style-row">
      {/* Row header */}
      <div className="style-row__header">
        <span className="style-row__name">{styleName}</span>
        <span className="style-row__weight">
          {weightDesc}{style.isItalic ? ' Italic' : ''}
        </span>

        {/* Per-row size slider */}
        <div className="style-row__slider-wrap" aria-label={`Size for ${styleName}`}>
          <span className="style-row__size-label">{rowSize}px</span>
          <Slider.Root
            className="slider-root slider-root--compact"
            min={16}
            max={160}
            step={2}
            value={[rowSize]}
            onValueChange={([v]) => setRowSize(v)}
          >
            <Slider.Track className="slider-track">
              <Slider.Range className="slider-range" />
            </Slider.Track>
            <Slider.Thumb className="slider-thumb" aria-label="Font size" />
          </Slider.Root>
        </div>
      </div>

      {/* Specimen */}
      <div className={`specimen-area${darkMode ? '' : ' specimen-area--light'}`}>
        <span
          className="style-row__specimen"
          style={{
            fontFamily: cssFamily
              ? `"${cssFamily}", "Noto Sans Ethiopic", sans-serif`
              : '"Noto Sans Ethiopic", sans-serif',
            fontSize: `${rowSize}px`,
            lineHeight: 1.15,
          }}
          aria-label={`${styleName} specimen`}
        >
          {specimenText}
        </span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface StylesSectionProps {
  family: FontFamilyDetail;
}

const PRESETS: Array<{ key: SpecimenPreset; label: string }> = [
  { key: 'alphabet', label: 'አቢሲ' },
  { key: 'pangram',  label: 'ሐረግ' },
  { key: 'numerals', label: '123' },
];

export default function StylesSection({ family }: StylesSectionProps) {
  const { t } = useTranslation();
  const { text, setText, preset, setPreset, fontSize, setFontSize, darkMode, toggleDarkMode } =
    useSpecimenStore();

  const familyName = bilingualValue(family.name);

  return (
    <section id="styles" className="detail-section">
      <div className="detail-section__header">
        <h2 className="detail-section__title">
          {family.styles.length} {t('fontDetail.styles')}
        </h2>

        {/* Specimen controls bar */}
        <div className="styles-controls">
          {/* Your Text */}
          <div className="styles-controls__text-wrap">
            <span aria-hidden="true">✏</span>
            <input
              type="text"
              className="styles-controls__text-input"
              placeholder={t('catalog.yourText')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label={t('catalog.yourText')}
            />
          </div>

          {/* Presets */}
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`filter-item filter-item--preset${preset === key ? ' filter-item--active' : ''}`}
              onClick={() => setPreset(key)}
            >
              {label}
            </button>
          ))}

          {/* Global size slider */}
          <div className="filter-bar__size-slider" style={{ minWidth: 120 }}>
            <span className="filter-bar__size-label">{fontSize}px</span>
            <Slider.Root
              className="slider-root"
              min={16}
              max={160}
              step={2}
              value={[fontSize]}
              onValueChange={([v]) => setFontSize(v)}
            >
              <Slider.Track className="slider-track">
                <Slider.Range className="slider-range" />
              </Slider.Track>
              <Slider.Thumb className="slider-thumb" aria-label="Global font size" />
            </Slider.Root>
          </div>

          {/* Dark/light toggle */}
          <button
            type="button"
            className={`filter-item filter-item--icon${darkMode ? ' filter-item--active' : ''}`}
            onClick={toggleDarkMode}
            aria-pressed={darkMode}
            aria-label={darkMode ? 'Switch to light' : 'Switch to dark'}
          >
            {darkMode ? '☾' : '☀'}
          </button>
        </div>
      </div>

      {/* Style rows */}
      <div className="style-rows">
        {family.styles.map((style) => (
          <StyleRow
            key={style.id}
            familyId={family.id}
            style={style}
            specimenText={text || familyName}
            fontSize={fontSize}
            darkMode={darkMode}
          />
        ))}
      </div>

      {family.styles.some((s) => s.isVariable) && (
        <div className="style-rows__variable-badge">
          <span className="badge badge--variable">Variable font</span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            — all weights in a single file
          </span>
        </div>
      )}
    </section>
  );
}
