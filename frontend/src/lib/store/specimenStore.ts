import { create } from 'zustand';

export type ViewMode = 'list' | 'grid';
export type SpecimenPreset = 'alphabet' | 'pangram' | 'numerals' | 'custom';

/** Default specimen text in Amharic (covers a wide Unicode range for font testing) */
const DEFAULT_TEXT =
  'ሰላም ዓለም — ፊደሎች ያምራሉ።';

const DEFAULT_PANGRAM_AM =
  'ሀ ለ ሐ መ ሠ ረ ሰ ሸ ቀ ቈ ቐ በ ቨ ተ ቸ ኀ ነ ኘ አ ከ ኸ ወ ዐ ዘ ዠ የ ደ ጀ ገ ጠ ጨ ጰ ጸ ፀ ፈ ፐ';

export const SPECIMEN_PRESETS: Record<SpecimenPreset, string> = {
  alphabet: DEFAULT_PANGRAM_AM,
  pangram: DEFAULT_TEXT,
  numerals: '0 1 2 3 4 5 6 7 8 9  ፩ ፪ ፫ ፬ ፭ ፮ ፯ ፰ ፱ ፲',
  custom: '',
};

interface SpecimenState {
  /** The live specimen text shown across all font cards */
  text: string;
  /** Which preset is active (custom = user-typed) */
  preset: SpecimenPreset;
  /** Font size in px for specimen rendering */
  fontSize: number;
  /** Dark (true) or light (false) specimen background */
  darkMode: boolean;
  /** Card layout: 'list' = full-width rows, 'grid' = multi-column grid */
  viewMode: ViewMode;
  /** Number of grid columns (2 | 3 | 4) — only used when viewMode = 'grid' */
  columnCount: 2 | 3 | 4;

  // ── Actions ──────────────────────────────────────────────────────────────────
  setText: (text: string) => void;
  setPreset: (preset: SpecimenPreset) => void;
  setFontSize: (size: number) => void;
  toggleDarkMode: () => void;
  setDarkMode: (dark: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setColumnCount: (count: 2 | 3 | 4) => void;
}

export const useSpecimenStore = create<SpecimenState>((set) => ({
  text: DEFAULT_TEXT,
  preset: 'pangram',
  fontSize: 40,
  darkMode: true,
  viewMode: 'list',
  columnCount: 3,

  setText: (text) => set({ text, preset: 'custom' }),

  setPreset: (preset) =>
    set({
      preset,
      text: preset === 'custom' ? '' : SPECIMEN_PRESETS[preset],
    }),

  setFontSize: (size) => set({ fontSize: Math.min(120, Math.max(12, size)) }),

  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

  setDarkMode: (dark) => set({ darkMode: dark }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setColumnCount: (count) => set({ columnCount: count }),
}));
