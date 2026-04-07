/**
 * FilterBar — two sticky rows sitting below the nav
 *
 * Row 1 (filters):  Search | Script | Category | Variable toggle | Size slider
 * Row 2 (specimen): Your Text input | Presets | View toggle | Dark toggle | Reset
 */

import * as Slider from '@radix-ui/react-slider';
import { useTranslation } from 'react-i18next';
import { useSpecimenStore, SPECIMEN_PRESETS, type SpecimenPreset } from '@/lib/store/specimenStore';
import type { SearchFilters, FontCategory, ScriptSupport } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────────
interface FilterBarProps {
  filters: SearchFilters;
  totalCount?: number;
  onFiltersChange: (patch: Partial<SearchFilters>) => void;
  onReset: () => void;
}

const CATEGORIES: Array<{ value: FontCategory; labelKey: string }> = [
  { value: 'serif',       labelKey: 'catalog.filters.serif' },
  { value: 'sans_serif',  labelKey: 'catalog.filters.sans_serif' },
  { value: 'display',     labelKey: 'catalog.filters.display' },
  { value: 'handwriting', labelKey: 'catalog.filters.handwriting' },
  { value: 'monospace',   labelKey: 'catalog.filters.monospace' },
  { value: 'decorative',  labelKey: 'catalog.filters.decorative' },
];

const SCRIPTS: Array<{ value: ScriptSupport; labelKey: string }> = [
  { value: 'ethiopic', labelKey: 'catalog.filters.ethiopic' },
  { value: 'latin',    labelKey: 'catalog.filters.latin' },
  { value: 'both',     labelKey: 'catalog.filters.both' },
];

const PRESETS: Array<{ key: SpecimenPreset; label: string }> = [
  { key: 'alphabet', label: 'አቢሲ' },
  { key: 'pangram',  label: 'ሐረግ' },
  { key: 'numerals', label: '123' },
];

// ── Component ──────────────────────────────────────────────────────────────────
export default function FilterBar({
  filters,
  totalCount,
  onFiltersChange,
  onReset,
}: FilterBarProps) {
  const { t } = useTranslation();
  const {
    text,
    setText,
    preset,
    setPreset,
    fontSize,
    setFontSize,
    darkMode,
    toggleDarkMode,
    viewMode,
    setViewMode,
  } = useSpecimenStore();

  return (
    <div className="filter-bar" role="search" aria-label="Font filters">
      {/* ── Row 1: Filters ── */}
      <div className="filter-bar__row filter-bar__row--filters">
        {/* Search */}
        <div className="filter-bar__search-wrap">
          <span className="filter-bar__search-icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            className="filter-bar__search"
            placeholder={t('catalog.searchPlaceholder')}
            value={filters.q ?? ''}
            onChange={(e) => onFiltersChange({ q: e.target.value || undefined, page: 1 })}
            aria-label={t('catalog.searchPlaceholder')}
          />
        </div>

        {/* Script filter */}
        <div className="filter-bar__group">
          <button
            type="button"
            className={`filter-item${!filters.script ? ' filter-item--active' : ''}`}
            onClick={() => onFiltersChange({ script: undefined, page: 1 })}
          >
            {t('catalog.filters.all')}
          </button>
          {SCRIPTS.map(({ value, labelKey }) => (
            <button
              key={value}
              type="button"
              className={`filter-item${filters.script === value ? ' filter-item--active' : ''}`}
              onClick={() =>
                onFiltersChange({
                  script: filters.script === value ? undefined : value,
                  page: 1,
                })
              }
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="filter-bar__group filter-bar__group--scroll">
          <button
            type="button"
            className={`filter-item${!filters.category ? ' filter-item--active' : ''}`}
            onClick={() => onFiltersChange({ category: undefined, page: 1 })}
          >
            {t('catalog.filters.all')}
          </button>
          {CATEGORIES.map(({ value, labelKey }) => (
            <button
              key={value}
              type="button"
              className={`filter-item${filters.category === value ? ' filter-item--active' : ''}`}
              onClick={() =>
                onFiltersChange({
                  category: filters.category === value ? undefined : value,
                  page: 1,
                })
              }
            >
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Variable toggle */}
        <button
          type="button"
          className={`filter-item filter-item--variable${filters.isVariable ? ' filter-item--active' : ''}`}
          onClick={() =>
            onFiltersChange({ isVariable: filters.isVariable ? undefined : true, page: 1 })
          }
          aria-pressed={!!filters.isVariable}
        >
          Variable
        </button>

        {/* Size slider */}
        <div className="filter-bar__size-slider" aria-label={`Font size: ${fontSize}px`}>
          <span className="filter-bar__size-label">{fontSize}px</span>
          <Slider.Root
            className="slider-root"
            min={16}
            max={120}
            step={2}
            value={[fontSize]}
            onValueChange={([val]) => setFontSize(val)}
            aria-label="Specimen font size"
          >
            <Slider.Track className="slider-track">
              <Slider.Range className="slider-range" />
            </Slider.Track>
            <Slider.Thumb className="slider-thumb" />
          </Slider.Root>
        </div>
      </div>

      {/* ── Row 2: Specimen controls ── */}
      <div className="filter-bar__row filter-bar__row--specimen">
        {/* Your Text input */}
        <div className="filter-bar__your-text-wrap">
          <span className="filter-bar__pencil" aria-hidden="true">✏</span>
          <input
            type="text"
            className="filter-bar__your-text"
            placeholder={t('catalog.yourText')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={t('catalog.yourText')}
          />
        </div>

        {/* Preset buttons */}
        <div className="filter-bar__presets">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`filter-item filter-item--preset${preset === key ? ' filter-item--active' : ''}`}
              onClick={() => setPreset(key)}
              aria-pressed={preset === key}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="filter-bar__spacer" />

        {/* View toggle: list / grid */}
        <div className="filter-bar__view-toggle" role="group" aria-label="View mode">
          <button
            type="button"
            className={`filter-item filter-item--icon${viewMode === 'list' ? ' filter-item--active' : ''}`}
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
            aria-label={t('catalog.view.list')}
            title={t('catalog.view.list')}
          >
            ≡
          </button>
          <button
            type="button"
            className={`filter-item filter-item--icon${viewMode === 'grid' ? ' filter-item--active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-pressed={viewMode === 'grid'}
            aria-label={t('catalog.view.grid')}
            title={t('catalog.view.grid')}
          >
            ⊞
          </button>
        </div>

        {/* Dark / light specimen toggle */}
        <button
          type="button"
          className={`filter-item filter-item--icon${darkMode ? ' filter-item--active' : ''}`}
          onClick={toggleDarkMode}
          aria-pressed={darkMode}
          aria-label={darkMode ? 'Switch to light specimen' : 'Switch to dark specimen'}
          title={darkMode ? 'Light specimen' : 'Dark specimen'}
        >
          {darkMode ? '☾' : '☀'}
        </button>

        {/* Sort */}
        <select
          className="filter-item filter-item--select"
          value={filters.sort ?? 'newest'}
          onChange={(e) =>
            onFiltersChange({ sort: e.target.value as SearchFilters['sort'], page: 1 })
          }
          aria-label="Sort fonts"
        >
          <option value="newest">{t('catalog.sort.newest')}</option>
          <option value="popular">{t('catalog.sort.popular')}</option>
          <option value="name">{t('catalog.sort.name')}</option>
        </select>

        {/* Reset */}
        <button
          type="button"
          className="filter-item filter-item--reset"
          onClick={onReset}
          aria-label="Reset all filters"
        >
          Reset
        </button>

        {/* Font count */}
        {totalCount !== undefined && (
          <span className="filter-bar__count" aria-live="polite">
            {totalCount.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
