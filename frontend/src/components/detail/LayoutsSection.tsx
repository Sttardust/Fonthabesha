/**
 * LayoutsSection  (#layouts anchor)
 *
 * Two stacked preview blocks — headline and body copy — each with:
 * - Individual style selector
 * - Individual size slider
 * - Editable text (defaults to Amharic sample)
 *
 * Mirrors the Fontshare "Layouts" section design.
 */

import { useEffect, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { loadFontStyle } from '@/lib/utils/fontLoader';
import type { FontFamilyDetail, FontStyleDetail } from '@/lib/types';

const DEFAULT_HEADLINE =
  'ሰማይ አይታወሰ ሰሚ አይፈልግ';

const DEFAULT_BODY =
  'ሰማዕታት ደሞዝ ተደምሮ ሲወዳደሩ — ፈጣሪ ብርሃን ይሰጣቸዋል። ' +
  'ሐዘን ተሸልሞ ደስታ ይሆናል፣ ምናልባት ሰው ሁሉ ፍቅር ያስፈልገዋል።';

// ── Layout block ───────────────────────────────────────────────────────────────

interface LayoutBlockProps {
  label: string;
  familyId: string;
  styles: FontStyleDetail[];
  defaultSize: number;
  defaultText: string;
  darkMode?: boolean;
}

function LayoutBlock({
  label,
  familyId,
  styles,
  defaultSize,
  defaultText,
  darkMode = false,
}: LayoutBlockProps) {
  const [styleId, setStyleId] = useState(styles[0]?.id ?? '');
  const [fontSize, setFontSize] = useState(defaultSize);
  const [text, setText] = useState(defaultText);
  const [cssFamily, setCssFamily] = useState<string | null>(null);

  const selectedStyle = styles.find((s) => s.id === styleId) ?? styles[0];

  useEffect(() => {
    if (!selectedStyle) return;
    loadFontStyle(familyId, selectedStyle.id, selectedStyle.assetUrl).then(setCssFamily);
  }, [familyId, selectedStyle]);

  return (
    <div className={`layout-block${darkMode ? ' layout-block--dark' : ''}`}>
      {/* Block controls */}
      <div className="layout-block__controls">
        <span className="layout-block__label">{label}</span>

        <select
          className="filter-item filter-item--select layout-block__style-select"
          value={styleId}
          onChange={(e) => setStyleId(e.target.value)}
          aria-label={`Style for ${label}`}
        >
          {styles.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.weightLabel ?? (s.weightClass ? String(s.weightClass) : '')}
              {s.isItalic ? ' Italic' : ''}
            </option>
          ))}
        </select>

        <div className="layout-block__slider-wrap">
          <span className="filter-bar__size-label">{fontSize}px</span>
          <Slider.Root
            className="slider-root"
            min={12}
            max={defaultSize === 72 ? 200 : 48}
            step={1}
            value={[fontSize]}
            onValueChange={([v]) => setFontSize(v)}
            aria-label={`Font size for ${label}`}
          >
            <Slider.Track className="slider-track">
              <Slider.Range className="slider-range" />
            </Slider.Track>
            <Slider.Thumb className="slider-thumb" />
          </Slider.Root>
        </div>
      </div>

      {/* Editable specimen */}
      <div
        className="layout-block__specimen"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => setText((e.target as HTMLElement).innerText)}
        style={{
          fontFamily: cssFamily
            ? `"${cssFamily}", "Noto Sans Ethiopic", sans-serif`
            : '"Noto Sans Ethiopic", sans-serif',
          fontSize: `${fontSize}px`,
          lineHeight: label === 'Headline' ? 1.1 : 1.6,
        }}
        aria-label={`${label} specimen (editable)`}
        role="textbox"
        aria-multiline={label !== 'Headline'}
      >
        {text}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface LayoutsSectionProps {
  family: FontFamilyDetail;
}

export default function LayoutsSection({ family }: LayoutsSectionProps) {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <section id="layouts" className="detail-section">
      <div className="detail-section__header">
        <h2 className="detail-section__title">Layouts</h2>

        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button
            type="button"
            className={`filter-item filter-item--icon${darkMode ? ' filter-item--active' : ''}`}
            onClick={() => setDarkMode((v) => !v)}
            aria-pressed={darkMode}
            aria-label={darkMode ? 'Light background' : 'Dark background'}
          >
            {darkMode ? '☾' : '☀'}
          </button>
        </div>
      </div>

      <div className="layouts-body">
        <LayoutBlock
          label="Headline"
          familyId={family.id}
          styles={family.styles}
          defaultSize={72}
          defaultText={DEFAULT_HEADLINE}
          darkMode={darkMode}
        />
        <LayoutBlock
          label="Body"
          familyId={family.id}
          styles={family.styles}
          defaultSize={18}
          defaultText={DEFAULT_BODY}
          darkMode={darkMode}
        />
      </div>
    </section>
  );
}
