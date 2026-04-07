export type HealthResponse = {
  status: string;
};

export type FontListItem = {
  id: string;
  slug: string;
  name: {
    en: string;
    am: string | null;
    native: string | null;
  };
  category: string | null;
  script: string;
  license: {
    code: string;
    name: string;
  } | null;
  publisher: {
    id: string;
    name: string;
  } | null;
  designers: Array<{
    id: string;
    name: string;
  }>;
  tags: string[];
  numberOfStyles: number;
  hasVariableStyles: boolean;
  defaultPreviewStyleId: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
};

export type FontListResponse = {
  items: FontListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
  };
};

export type FontStyle = {
  id: string;
  name: string;
  slug: string;
  assetUrl: string;
  weightClass: number | null;
  weightLabel: string | null;
  isItalic: boolean;
  isVariable: boolean;
  isDefault: boolean;
  format: string | null;
  fileSizeBytes: number;
  axes: unknown[];
  features: unknown[];
  metrics: {
    ascender?: number;
    descender?: number;
    glyphCount?: number;
    unitsPerEm?: number;
  };
};

export type FontFamilyDetail = {
  id: string;
  slug: string;
  name: {
    en: string;
    am: string | null;
    native: string | null;
  };
  description: {
    en: string | null;
    am: string | null;
  };
  category: string | null;
  script: string;
  primaryLanguage: string | null;
  license: {
    code: string;
    name: string;
    summary: {
      en: string | null;
      am: string | null;
    };
  } | null;
  publisher: {
    id: string;
    name: string;
    slug: string;
  } | null;
  designers: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: string;
    name: {
      en: string;
      am: string | null;
    };
    slug: string;
  }>;
  supports: {
    ethiopic: boolean;
    latin: boolean;
  };
  specimenDefaults: {
    am: string | null;
    en: string | null;
  };
  styles: FontStyle[];
  download: {
    familyPackageAvailable: boolean;
  };
  relatedFamilies: unknown[];
  coverImageUrl: string | null;
  publishedAt: string | null;
  version: string | null;
};
