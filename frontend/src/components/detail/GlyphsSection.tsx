/**
 * GlyphsSection  (#glyphs anchor)
 *
 * Left panel:  Large single glyph preview + Unicode codepoint
 * Right panel: Scrollable glyph grid organized by block
 *   - Uppercase Latin (A-Z)
 *   - Lowercase Latin (a-z)
 *   - Numerals (0-9)
 *   - Ethiopic syllables (U+1200–U+137F)
 *   - Ethiopic Extended (U+2D80–U+2DDF)
 *
 * Clicking any glyph updates the left panel.
 * Style selector at the top switches which loaded font renders the glyphs.
 */

import { useState, useEffect } from 'react';
import { bilingualValue } from '@/lib/utils/bilingualValue';
import { loadFontStyle } from '@/lib/utils/fontLoader';
import type { FontFamilyDetail } from '@/lib/types';

// ── Glyph ranges ───────────────────────────────────────────────────────────────

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

const GLYPH_BLOCKS = [
  {
    label: 'Ethiopic — Basic (U+1200–U+137F)',
    codepoints: range(0x1200, 0x137f),
    primary: true,
  },
  {
    label: 'Ethiopic — Extended (U+2D80–U+2DDF)',
    codepoints: range(0x2d80, 0x2ddf),
    primary: false,
  },
  {
    label: 'Uppercase',
    codepoints: range(0x0041, 0x005a), // A-Z
    primary: false,
  },
  {
    label: 'Lowercase',
    codepoints: range(0x0061, 0x007a), // a-z
    primary: false,
  },
  {
    label: 'Numerals',
    codepoints: range(0x0030, 0x0039), // 0-9
    primary: false,
  },
  {
    label: 'Ethiopic Numerals',
    codepoints: range(0x1369, 0x137c),
    primary: false,
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

interface GlyphCellProps {
  codepoint: number;
  cssFamily: string;
  isActive: boolean;
  onClick: (cp: number) => void;
}

function GlyphCell({ codepoint, cssFamily, isActive, onClick }: GlyphCellProps) {
  const char = String.fromCodePoint(codepoint);
  return (
    <button
      type="button"
      className={`glyph-cell${isActive ? ' glyph-cell--active' : ''}`}
      style={{ fontFamily: `"${cssFamily}", "Noto Sans Ethiopic", sans-serif` }}
      onClick={() => onClick(codepoint)}
      aria-label={`U+${codepoint.toString(16).toUpperCase().padStart(4, '0')} ${char}`}
      aria-pressed={isActive}
      title={`U+${codepoint.toString(16).toUpperCase().padStart(4, '0')}`}
    >
      {char}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface GlyphsSectionProps {
  family: FontFamilyDetail;
}

export default function GlyphsSection({ family }: GlyphsSectionProps) {
  const [selectedStyleId, setSelectedStyleId] = useState(family.styles[0]?.id ?? '');
  const [cssFamily, setCssFamily] = useState<string>('Noto Sans Ethiopic');
  const [activeBlock, setActiveBlock] = useState(0); // index into GLYPH_BLOCKS
  const [activeCodepoint, setActiveCodepoint] = useState(0x1200); // ሀ
  const [customInput, setCustomInput] = useState('');
  const [showFull, setShowFull] = useState(false);

  const selectedStyle = family.styles.find((s) => s.id === selectedStyleId) ?? family.styles[0];

  // Load font whenever selected style changes
  useEffect(() => {
    if (!selectedStyle) return;
    loadFontStyle(family.id, selectedStyle.id, selectedStyle.assetUrl).then((cf) => {
      if (cf) setCssFamily(cf);
    });
  }, [family.id, selectedStyle]);

  const activeChar = String.fromCodePoint(activeCodepoint);
  const unicodeLabel = `U+${activeCodepoint.toString(16).toUpperCase().padStart(4, '0')}`;

  const currentBlock = GLYPH_BLOCKS[activeBlock];
  const displayCodepoints = showFull
    ? currentBlock.codepoints
    : currentBlock.codepoints.slice(0, 96);

  return (
    <section id="glyphs" className="detail-section">
      <div className="detail-section__header">
        <h2 className="detail-section__title">Glyphs</h2>

        {/* Controls row */}
        <div className="glyphs-controls">
          {/* Style selector */}
          <select
            className="filter-item filter-item--select"
            value={selectedStyleId}
            onChange={(e) => setSelectedStyleId(e.target.value)}
            aria-label="Select style"
          >
            {family.styles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.weightLabel ?? (s.weightClass ? String(s.weightClass) : '')}
                {s.isItalic ? ' Italic' : ''}
              </option>
            ))}
          </select>

          {/* Block selector */}
          {GLYPH_BLOCKS.map((block, i) => (
            <button
              key={block.label}
              type="button"
              className={`filter-item${activeBlock === i ? ' filter-item--active' : ''}`}
              onClick={() => { setActiveBlock(i); setShowFull(false); }}
            >
              {block.label.split(' — ')[0].split(' ')[0]}
              {block.label.includes('Ethiopic') && !block.label.includes('Numeral') ? ' ethiopic' : ''}
            </button>
          ))}

          {/* Custom glyph input */}
          <input
            type="text"
            className="glyphs-controls__input"
            placeholder="Type a character…"
            value={customInput}
            onChange={(e) => {
              const val = e.target.value;
              setCustomInput(val);
              if (val.length > 0) {
                setActiveCodepoint(val.codePointAt(val.length - 1) ?? activeCodepoint);
              }
            }}
            aria-label="Type a character to inspect"
            maxLength={4}
          />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="glyphs-body">
        {/* ── Left: single glyph inspector ── */}
        <div className="glyph-inspector">
          <div
            className="glyph-inspector__preview"
            style={{ fontFamily: `"${cssFamily}", "Noto Sans Ethiopic", sans-serif` }}
            aria-label={`Glyph preview: ${activeChar}`}
          >
            {activeChar}
          </div>

          <div className="glyph-inspector__meta">
            <div className="glyph-inspector__unicode">{unicodeLabel}</div>
            <div className="glyph-inspector__char-name">
              {activeChar} &mdash; {currentBlock.label.split(' — ')[0]}
            </div>
          </div>

          {/* Metric guide lines (decorative) */}
          <div className="glyph-inspector__metrics" aria-hidden="true">
            <div className="glyph-metric glyph-metric--cap">Cap</div>
            <div className="glyph-metric glyph-metric--base">Base</div>
          </div>
        </div>

        {/* ── Right: glyph grid ── */}
        <div className="glyph-grid-wrap">
          <p className="glyph-block__label">{currentBlock.label}</p>
          <div className="glyph-grid" role="list" aria-label={`${currentBlock.label} glyphs`}>
            {displayCodepoints.map((cp) => (
              <GlyphCell
                key={cp}
                codepoint={cp}
                cssFamily={cssFamily}
                isActive={cp === activeCodepoint}
                onClick={setActiveCodepoint}
              />
            ))}
          </div>

          {currentBlock.codepoints.length > 96 && (
            <button
              type="button"
              className="glyph-grid__more"
              onClick={() => setShowFull((v) => !v)}
            >
              {showFull
                ? 'Show less'
                : `Show all ${currentBlock.codepoints.length} glyphs`}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
