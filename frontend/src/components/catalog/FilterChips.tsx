import { useTranslation } from 'react-i18next';
import type { FontCategory, ScriptSupport } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ActiveFilters {
  q?: string;
  category?: FontCategory;
  script?: ScriptSupport;
  isVariable?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  sort?: 'newest' | 'popular' | 'name';
}

interface FilterChipsProps {
  filters: ActiveFilters;
  onRemove: (key: keyof ActiveFilters, value?: string) => void;
  onClearAll: () => void;
}

// ── Chip ──────────────────────────────────────────────────────────────────────

function Chip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      className="filter-chip"
      onClick={onRemove}
      aria-label={`Remove filter: ${label}`}
    >
      <span className="filter-chip__label">{label}</span>
      <span className="filter-chip__remove" aria-hidden="true">×</span>
    </button>
  );
}

// ── FilterChips ───────────────────────────────────────────────────────────────

export default function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  const { t } = useTranslation();

  const chips: { key: keyof ActiveFilters; label: string; value?: string }[] = [];

  if (filters.q) {
    chips.push({ key: 'q', label: `"${filters.q}"` });
  }
  if (filters.category) {
    chips.push({
      key: 'category',
      label: t(`catalog.filters.${filters.category}`),
    });
  }
  if (filters.script) {
    chips.push({
      key: 'script',
      label: t(`catalog.filters.${filters.script}`),
    });
  }
  if (filters.isVariable) {
    chips.push({ key: 'isVariable', label: t('catalog.filters.variable') });
  }
  if (filters.isFeatured) {
    chips.push({ key: 'isFeatured', label: t('catalog.filters.featured') });
  }
  if (filters.tags?.length) {
    filters.tags.forEach((tag) => {
      chips.push({ key: 'tags', label: `#${tag}`, value: tag });
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="filter-chips" role="group" aria-label="Active filters">
      {chips.map((chip) => (
        <Chip
          key={`${chip.key}-${chip.value ?? ''}`}
          label={chip.label}
          onRemove={() => onRemove(chip.key, chip.value)}
        />
      ))}
      <button
        type="button"
        className="filter-chips__clear"
        onClick={onClearAll}
      >
        {t('catalog.clearAll')}
      </button>
    </div>
  );
}
