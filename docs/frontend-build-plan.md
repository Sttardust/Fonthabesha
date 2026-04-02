# Fonthabesha — Frontend Build Plan

> **Revision 3:** Updated with direct Fontshare design analysis. Fontshare (fontshare.com) is the primary UX and visual reference. All key UI patterns observed live and incorporated below. Monorepo structure and Vite React stack remain as per Revision 2.

---

## 1. Purpose

This document defines the complete frontend build plan for the Fonthabesha platform — a font discovery, review, and download platform focused on Ethiopic/Amharic script fonts.

It covers only the frontend layer. It does not touch backend code, database schemas, or API contracts. All API shapes are derived from `api-contracts.md` and treated as read-only.

---

## 2. Monorepo Context

```
fonthabesha/                   ← workspace root
├── backend/                   ← NestJS API (do not touch)
├── frontend/                  ← Vite React SPA  ← THIS DOCUMENT
├── shared/                    ← shared TypeScript types
├── docs/                      ← planning docs
└── package.json               ← workspace root with concurrently scripts
```

### Commands (from repo root)
```bash
npm install                    # install all workspaces
npm run dev                    # backend + frontend together
npm run dev:frontend           # frontend only → http://localhost:5173
npm run build:frontend         # production build
```

### Environment
```
VITE_API_URL=http://localhost:3000/api/v1   # already in frontend/.env.example
```

---

## 3. GitHub Workflow

- `main` — production only. Never commit directly.
- `dev` — integration branch. All PRs merge here.
- `feature/*` — branch from `dev`, PR back to `dev`.

### Suggested Branch Names
- `feature/frontend-setup`
- `feature/frontend-catalog`
- `feature/frontend-font-detail`
- `feature/frontend-auth`
- `feature/frontend-contributor`
- `feature/frontend-admin-review`
- `feature/frontend-admin-vocab`
- `feature/frontend-analytics`
- `feature/frontend-collections`
- `feature/frontend-i18n`
- `feature/frontend-polish`

---

## 4. Fontshare Design Analysis

The following observations come from a direct live review of fontshare.com and drive all design decisions in this plan.

### 4.1 Visual Identity

Fontshare uses a full dark theme: near-black background (`~#0d0c09`), warm cream text (`~#f0ead6`). The cream color doubles as both the primary text color and the selected nav item background fill. There are no images — the fonts themselves are the visual content.

**Fonthabesha's direction:** The existing `styles.css` starter already has the inverse palette — warm cream backgrounds with dark text. This is a deliberate differentiation. Keep the light warm cream as the base, but take every UX pattern from Fontshare directly. The platform feels editorial and premium regardless of whether the background is dark or light.

### 4.2 Navigation Bar

Fontshare's nav is a single full-width horizontal bar divided into equal-width grid cells:

```
[Logo] | [Fonts  100] | [Pairs  59] | [Licenses] | [☰] | [No styles selected]
```

- The active section gets a filled background on its cell (cream on dark, or the inverse)
- Item count displayed as small text beneath the nav label
- Hamburger `☰` reveals: FAQs, About
- "No styles selected" is the shortlist/download cart — empty state text, fills with selected styles

**Fonthabesha's nav cells:**
```
[Fonthabesha] | [Fonts  N] | [Collections  N] | [Licenses] | [☰] | [No styles selected]
```
The "Pairs" concept does not exist in V1. Collections replace it.

### 4.3 Catalog Filter Bar (Two Rows, Sticky)

This is the most important UI system. Fontshare uses two sticky rows above the font list:

**Row 1 — Filters:**
```
🔍 Search  |  Categories ▼  |  Properties ▼  |  Personality ▼  |  [210px] ◀ ——●  |
```

**Row 2 — Specimen controls:**
```
✏ Your Text  |  Cities  |  Excerpts  |  Names  |  [≡ ≡≡ ≡≡≡]  |  [☀/☾]  |  Reset All
```

**Row 3 — Sorting/view bar:**
```
100  |  List view  Grid view  |  Top 20  Hot 20  Variable  |  Fontshare Originals  Shortlisted  |  Sort by: New  Popular  Hot  Alphabetical
```

**"Your Text" is the single most critical UX element.** When the user types into it, every font card updates its specimen in real time. We confirmed it accepts Amharic input — `ሰላም ዓለም` rendered across all cards live. This is the highest-priority interactive feature for Fonthabesha.

**Categories dropdown:** Sans, Serif, Slab, Display, Handwritten, Script — dot-list with bullet indicators.

**Properties dropdown:** Very sophisticated typographic sliders:
- No. of Styles (range slider, 1–20+)
- Weight (range slider, 50–1000)
- Width (slider with visual letterform icons)
- Contrast (slider with visual icons)
- Edges (slider with visual icons)
- x-Height (slider with visual icons)

Note: The Properties panel beyond style count and variable flag is **beyond V1 backend support**. Defer to Phase 2. For V1, include: script, license, publisher, designer, tag, variable toggle.

**Specimen presets:** Cities / Excerpts / Names — quick-switch text presets. For Fonthabesha: **Amharic / English / Names** as the three presets.

**Column count toggle:** Icons for 1-column / 2-column / 3-column text layout within list view cards.

**Light/dark specimen toggle:** Half-circle icon toggles the specimen card background between light and dark. Implement as a simple toggle on the specimen area.

### 4.4 Font Cards

**List view:** Each card is full-width with a thin border. Layout:
```
[Font Name ☆]                     [N styles]  [Variable]  [License type]
[GIANT SPECIMEN TEXT rendered in the actual font — fills the card height]
[Designed by Foundry Name]
```

**Grid view:** 4-column grid. Each card:
```
[Font Name ☆]   [N styles]  [Variable]
[SPECIMEN TEXT — rendered in the font, ~60px]
[By Foundry Name]
```

The giant specimen text IS the font file loaded and rendered live in the browser via CSS `@font-face`. The card height adjusts to the specimen content.

**Fonthabesha adaptation:** Cards render both Amharic and English name. Default specimen text should be Amharic (`specimenDefaults.am` from the API) for Ethiopic fonts.

### 4.5 Font Detail Page

Fontshare uses a secondary sticky nav on the detail page:

```
← Back to Fonts  |  Styles  |  Glyphs  |  Layouts  |  Details  |  License  |  [↓ Download Family]
```

Each section is a full-page scroll region, not a tab panel — clicking a nav item smooth-scrolls to the section anchor.

**Hero section:** Giant font name specimen + family metadata beneath.

**Styles section:** Lists all styles vertically. Each style row has:
- Style name label (Extralight, Light, Regular, Medium, Semibold, Bold…)
- Individual size slider per style
- `+ Add Style` button (shortlist/download)
- The "Your Text" input and preset buttons repeat in this section

**Glyphs section:** Two-column layout:
- Left: Large single glyph preview + metric annotations (Cap Height, X Height, Baseline, Descender values) + Solid/Outlines toggle + Unicode code point
- Right: Glyph grid (Basic Set / Full Set) — Uppercase, Lowercase, Numerals sections + clickable glyph cells + "Type your letters" input to jump to a glyph
- Style selector dropdown at top

This section is especially important for Fonthabesha's Ethiopic focus — showing Ethiopic Unicode coverage (U+1200–U+137F range) is a key reviewer and user feature. The backend already extracts `glyph_coverage_json`.

**Layouts section:** Editorial multi-block preview:
- "New Layout" + "Default Layout" + Reset controls
- Multiple text blocks stacked: each block has font selector, style selector, size slider, + Add Block / Remove Block
- Shows the font in realistic use: headline block + body paragraph block + caption block
- V1 scope: include a simplified 2-block layout (headline + body) with hardcoded Amharic + English presets

**Details section:** Two-column:
- Left: Specifications table (Family Name, Designed By, Category, Available Styles, Supported Languages, Version, Debut date, Tags/Keywords, License)
- Right: Story / Description paragraph

**License section:** License name, summary, and link to full license text.

**Download Family button:** Fixed top-right. One click → triggers `POST /downloads/families/:familyId` → downloads zip.

### 4.6 Pairs Page → Collections Page

Fontshare's Pairs page (`/pairs`) shows 59 curated font pairings in a 4-column grid. Each card renders a headline + body text block using two complementary fonts. The filter bar has "Headline" and "Body" custom text inputs.

**Fonthabesha maps this to Collections.** The `/collections` page shows editorial collections curated by admins. No pairing mechanic in V1. Each collection card shows: cover image (or font specimen), title (bilingual), description, item count.

### 4.7 Licenses Page

Fontshare has a dedicated Licenses section at `/licenses/:slug` explaining each license type in plain language. Fonthabesha should have a similar `/licenses` page listing each approved license (OFL, Apache, etc.) with summaries from the API.

### 4.8 Shortlist / Download Cart

"No styles selected" in the top-right nav is Fontshare's download cart. Users add individual styles via `+ Add Style` buttons. The cart collects them for a bulk download.

**Fonthabesha V1:** Simplify — no persistent cart. The Download Family and per-style download buttons issue signed URLs directly. The shortlist feature (matching Fontshare's ☆ star and cart) is **deferred to Phase 2**.

---

## 5. Tech Stack

### What Is Already Scaffolded
- **React 19** + **TypeScript** (strict, ES2022)
- **Vite 7** — dev server on port 5173
- Working `App.tsx` already fetching `/health/live` and `/fonts` from backend
- Custom CSS in `src/styles.css` — warm cream editorial palette established

### What Needs to Be Added

| Concern | Decision | Notes |
|---|---|---|
| **Routing** | React Router v7 | Nested layouts, loader-based guards, scroll restoration |
| **Server state** | TanStack Query v5 | All API calls, cache, pagination |
| **Global state** | Zustand | Auth session, specimen text, preview settings |
| **Forms** | React Hook Form + Zod | Login, submission metadata, vocabulary CRUD, profile |
| **File upload** | Custom fetch client | Signed S3 URL flow; SHA-256 via Web Crypto API |
| **Font rendering** | opentype.js | In-browser font file loading for live specimen preview |
| **Accessibility primitives** | Radix UI | Dialogs, dropdowns, sliders, tabs — unstyled, CSS-controlled |
| **i18n** | i18next + react-i18next | `en` and `am` namespaces, locale persisted in localStorage |
| **CSS approach** | Extend existing `styles.css` | Do not introduce Tailwind — conflicts with the established design |
| **Path aliases** | `@/` → `src/` | Configure in `vite.config.ts` and `tsconfig.app.json` |

### Shared Types (`fonthabesha/shared/`)
Move all TypeScript types shared between backend and frontend to `shared/src/types/`. Both workspaces import from `@fonthabesha/shared`. Until the shared package is initialized, define locally in `frontend/src/lib/types/` and migrate later.

---

## 6. CSS Design System (Extending the Starter)

The existing `styles.css` establishes:
- Background: warm cream gradient (`#f8f1e5` → `#efe3d2`)
- Text: `#201a17` (near-black warm)
- Accent: `#8c5b2f` (amber/amber-brown)
- Font: Iowan Old Style / Palatino (serif stack)
- Cards: `rgba(255,250,243,0.76)` with backdrop blur and `rgba(77,52,32,0.1)` border

Extend this with CSS custom properties for the full design system:

```css
:root {
  /* Core palette */
  --color-bg:          #f4ece0;
  --color-bg-card:     rgba(255, 250, 243, 0.82);
  --color-text:        #201a17;
  --color-text-muted:  #7a6555;
  --color-accent:      #8c5b2f;
  --color-border:      rgba(77, 52, 32, 0.12);

  /* Specimen area — can invert for dark preview mode */
  --color-specimen-bg: #1a1410;
  --color-specimen-text: #f0ead6;

  /* Nav */
  --color-nav-bg:      #1a1410;
  --color-nav-text:    #f0ead6;
  --color-nav-active:  #f0ead6;       /* active cell bg */
  --color-nav-active-text: #1a1410;

  /* Spacing */
  --nav-height: 72px;
  --filter-bar-height: 100px;         /* two filter rows */
}
```

The **navigation bar** flips the palette: dark background, cream text — matching Fontshare's nav bar aesthetic while keeping the rest of the page warm and light.

The **specimen cards** use a dark background by default (cream text on dark, like Fontshare) so the font rendering is prominent. A light/dark toggle flips the specimen area only.

---

## 7. Project Structure

```
frontend/
├── .env.example
├── index.html
├── vite.config.ts             ← add: resolve alias @ → src/
├── tsconfig.app.json          ← add: paths alias
├── package.json
└── src/
    ├── main.tsx               ← React root, router, query client, i18n, Zustand
    ├── styles.css             ← global CSS (extend, do not replace)
    ├── vite-env.d.ts
    │
    ├── router/
    │   └── index.tsx          ← all route definitions
    │
    ├── pages/
    │   ├── public/
    │   │   ├── HomePage.tsx
    │   │   ├── CatalogPage.tsx
    │   │   ├── FontDetailPage.tsx
    │   │   ├── CollectionsPage.tsx
    │   │   ├── CollectionDetailPage.tsx
    │   │   ├── SearchPage.tsx
    │   │   ├── LicensesPage.tsx
    │   │   ├── AboutPage.tsx
    │   │   └── FaqPage.tsx
    │   ├── auth/
    │   │   └── LoginPage.tsx
    │   ├── contributor/
    │   │   ├── SubmissionsListPage.tsx
    │   │   ├── NewSubmissionPage.tsx
    │   │   ├── SubmissionDetailPage.tsx
    │   │   ├── UploadPage.tsx
    │   │   └── ProfilePage.tsx
    │   └── admin/
    │       ├── DashboardPage.tsx
    │       ├── ReviewQueuePage.tsx
    │       ├── ReviewDetailPage.tsx
    │       ├── FailuresPage.tsx
    │       ├── PublishersPage.tsx
    │       ├── DesignersPage.tsx
    │       ├── LicensesAdminPage.tsx
    │       ├── CategoriesPage.tsx
    │       ├── TagsPage.tsx
    │       ├── CollectionsAdminPage.tsx
    │       └── AnalyticsPage.tsx
    │
    ├── components/
    │   ├── layout/
    │   │   ├── SiteNav.tsx            ← Fontshare-style full-width grid nav
    │   │   ├── PublicLayout.tsx
    │   │   ├── ContributorLayout.tsx
    │   │   └── AdminLayout.tsx
    │   ├── catalog/
    │   │   ├── FilterBar.tsx          ← sticky two-row filter bar
    │   │   ├── SpecimenControls.tsx   ← "Your Text", presets, size slider, toggles
    │   │   ├── CatalogToolbar.tsx     ← count, list/grid toggle, sort, quick filters
    │   │   ├── CategoryDropdown.tsx
    │   │   ├── FilterDropdown.tsx     ← reusable for script, license, etc.
    │   │   ├── FontCard.tsx           ← list view card (full-width, huge specimen)
    │   │   ├── FontCardGrid.tsx       ← grid view card (4-col, smaller specimen)
    │   │   ├── FontGrid.tsx           ← renders list or grid based on view mode
    │   │   └── FilterChips.tsx        ← active filter pills
    │   ├── font-detail/
    │   │   ├── DetailNav.tsx          ← sticky secondary nav: Styles|Glyphs|Layouts|Details|License
    │   │   ├── StylesSection.tsx      ← all styles listed with per-style specimen + size slider
    │   │   ├── GlyphsSection.tsx      ← glyph grid + single glyph preview + metrics
    │   │   ├── LayoutsSection.tsx     ← multi-block editorial preview
    │   │   ├── DetailsSection.tsx     ← spec table + story
    │   │   ├── LicenseSection.tsx     ← license summary + full text link
    │   │   ├── DownloadButton.tsx     ← "↓ Download Family" fixed top-right
    │   │   └── RelatedFonts.tsx
    │   ├── specimen/
    │   │   └── FontPreviewer.tsx      ← core: loads font via opentype.js, renders specimen
    │   ├── contributor/
    │   │   ├── SubmissionCard.tsx
    │   │   ├── SubmissionStatusBadge.tsx
    │   │   ├── UploadDropzone.tsx
    │   │   ├── UploadProgressItem.tsx
    │   │   ├── ProcessingFeedback.tsx
    │   │   ├── ComplianceChecklist.tsx
    │   │   └── DeclarationAcceptance.tsx
    │   ├── admin/
    │   │   ├── DashboardCounters.tsx
    │   │   ├── ReviewQueue.tsx
    │   │   ├── ReviewQueueFilters.tsx
    │   │   ├── ReviewDetail.tsx
    │   │   ├── ReviewActionPanel.tsx
    │   │   ├── ProcessingWarnings.tsx
    │   │   ├── ReviewHistory.tsx
    │   │   ├── VocabTable.tsx
    │   │   ├── VocabForm.tsx
    │   │   ├── FailuresList.tsx
    │   │   └── AnalyticsOverview.tsx
    │   └── shared/
    │       ├── BilingualText.tsx
    │       ├── LanguageSwitcher.tsx
    │       ├── Pagination.tsx
    │       ├── StatusBadge.tsx
    │       ├── ConfirmDialog.tsx
    │       ├── Slider.tsx             ← Radix UI slider, CSS-styled
    │       ├── LoadingSpinner.tsx
    │       └── ErrorState.tsx
    │
    ├── lib/
    │   ├── api/
    │   │   ├── client.ts
    │   │   ├── catalog.ts
    │   │   ├── search.ts
    │   │   ├── downloads.ts
    │   │   ├── collections.ts
    │   │   ├── auth.ts
    │   │   ├── contributor.ts
    │   │   ├── uploads.ts
    │   │   └── admin.ts
    │   ├── hooks/
    │   │   ├── useFonts.ts
    │   │   ├── useFontDetail.ts
    │   │   ├── useFontStyles.ts
    │   │   ├── useFilters.ts
    │   │   ├── useSearch.ts
    │   │   ├── useDownload.ts
    │   │   ├── useCollections.ts
    │   │   ├── useSubmissions.ts
    │   │   ├── useUpload.ts
    │   │   ├── useReviewQueue.ts
    │   │   ├── useReviewDetail.ts
    │   │   └── useAnalytics.ts
    │   ├── store/
    │   │   ├── authStore.ts           ← accessToken, user, role
    │   │   └── specimenStore.ts       ← specimenText, fontSize, viewMode, darkMode
    │   ├── i18n/
    │   │   ├── index.ts
    │   │   ├── en.json
    │   │   └── am.json
    │   └── utils/
    │       ├── bilingualValue.ts
    │       ├── formatDate.ts
    │       ├── formatFileSize.ts
    │       ├── sha256.ts
    │       ├── fontLoader.ts          ← loads font binary via URL, injects @font-face
    │       └── submissionStatus.ts
```

---

## 8. Routing

```
/                           → HomePage
/fonts                      → CatalogPage
/fonts/:slug                → FontDetailPage
/collections                → CollectionsPage
/collections/:slug          → CollectionDetailPage
/search                     → SearchPage  (unified with CatalogPage via ?q=)
/licenses                   → LicensesPage
/about                      → AboutPage
/faq                        → FaqPage

/login                      → LoginPage

/contributor/profile        → ProfilePage       (role: contributor)
/contributor/submissions    → SubmissionsListPage
/contributor/submissions/new           → NewSubmissionPage
/contributor/submissions/:id           → SubmissionDetailPage
/contributor/submissions/:id/upload    → UploadPage

/admin/dashboard            → DashboardPage     (role: reviewer | admin)
/admin/review               → ReviewQueuePage
/admin/review/:submissionId → ReviewDetailPage
/admin/failures             → FailuresPage
/admin/publishers           → PublishersPage    (role: admin)
/admin/designers            → DesignersPage
/admin/licenses             → LicensesAdminPage
/admin/categories           → CategoriesPage
/admin/tags                 → TagsPage
/admin/collections          → CollectionsAdminPage
/admin/analytics            → AnalyticsPage
```

Route guards via React Router v7 `loader` functions on layout routes.

---

## 9. Key Page Designs (Fontshare-informed)

### 9.1 Catalog Page `/fonts`

**Filter bar (sticky, two rows):**

Row 1 — Filters and size:
- `🔍 Search` — inline text input, updates `?q=` URL param
- `Script ▼` — dropdown: Ethiopic (the primary script; extensible)
- `Categories ▼` — dropdown: Sans, Serif, Slab, Display, Handwritten, Script
- `License ▼` — dropdown: OFL, Apache, etc. (from `GET /fonts/filters`)
- `Variable` — toggle chip
- `[Nপx] ◀ ——●` — global font size slider (controls specimen preview size)

Row 2 — Specimen controls:
- `✏ [Your Text input]` — Amharic/English custom text, updates all cards live
- `አማርኛ` / `English` / `Names` — specimen text presets
- `[≡] [≡≡] [≡≡≡]` — column count for list view text blocks
- `[☀/☾]` — specimen light/dark toggle
- `Reset All`

Toolbar row:
- Font count | `List view` / `Grid view` | `Newest` / `Popular` / `Alphabetical` | `Variable` quick filter

**Font cards:**

List view — full-width card:
```
[Awaze ☆]                          [8 styles]  [Variable]  [OFL]
[HUGE SPECIMEN TEXT — rendered live in Awaze font]
[Fonthabesha  ·  ሳንስ]
```

Grid view — 4-column:
```
[Awaze ☆]   [8 styles]  [Variable]
[ሰላም ዓለም — rendered live]
[By Fonthabesha]
```

Card interactions:
- Hover: subtle lift / border highlight
- ☆ star: shortlisted state (Phase 2)
- Click anywhere → `/fonts/:slug`

**Specimen rendering:** Each card dynamically loads the font via CSS `@font-face` injection using a CDN URL derived from the backend's `defaultPreviewStyleId`. The `fontLoader.ts` utility handles this: fetch the font URL, inject a unique `@font-face` rule, apply the font-family to the specimen element.

**URL state:** All filter + view state lives in URL search params (`useSearchParams`). Shareable, bookmarkable, back-button safe.

---

### 9.2 Font Detail Page `/fonts/:slug`

**Secondary sticky nav (replaces the filter bar on scroll past hero):**
```
← Back to Fonts  |  Styles  |  Glyphs  |  Layouts  |  Details  |  License  |  [↓ Download Family]
```

Clicking nav items smooth-scrolls to section anchors. The active section highlights in the nav.

**Hero section:**
- Font name (Amharic native name large, English name below)
- Publisher, designers, license badge
- GIANT specimen: the font name itself rendered in the font at ~200px+

**Styles section** (`#styles`):
- "N Styles" heading
- `✏ [Your Text]` + preset buttons + px slider + controls (same as catalog bar)
- Each style listed:
  ```
  [Extralight]                             [Size ——●]     [↓ Download style]
  [HUGE specimen in Extralight weight]
  ---
  [Light]
  ...
  ```
- For variable fonts: a section "N Variable" below static styles, with weight axis slider

**Glyphs section** (`#glyphs`):
- Top controls: Style selector | Basic Set / Full Set | "Type your letters" input
- Two-column layout:
  - Left: Large single glyph + metric lines (Cap Height, X Height, Baseline, Descender with px values) + Unicode code point + Solid/Outlines toggle
  - Right: Clickable glyph grid — Uppercase, Lowercase, Numerals, then Ethiopic range (U+1200–U+137F)
- Clicking a glyph updates the left panel preview

**Layouts section** (`#layouts`):
- "Default Layout" + Reset
- Two stacked blocks: Headline block (large text) + Body block (smaller paragraph)
- Each block: font name | style selector | size slider
- Default specimen: Amharic headline + Amharic body paragraph

**Details section** (`#details`):
- Two-column: Spec table | Description/story text
- Spec table rows: Family Name, Designed By (link), Publisher (link), Category, Available Styles, Script Support (Ethiopic ✓, Latin ✓/✗), Version, Debut date, Tags, License

**License section** (`#license`):
- License name + bilingual summary
- Link to full license text (external)

---

### 9.3 Home Page `/`

Not a separate "marketing page" — the home IS the catalog, pre-populated with popular fonts. This matches Fontshare exactly: navigating to `/` lands directly on the full catalog with specimen cards visible immediately.

Additions above the catalog for context:
- A minimal hero band: `Fonthabesha` logotype + tagline in both Amharic and English + font count
- Featured collections row (horizontal scroll of `CollectionCard` items) above the filter bar

---

### 9.4 Collections Page `/collections` and `/collections/:slug`

Collections replace Fontshare's Pairs page in the nav. Each collection card:
```
[Cover image or specimen]
[Collection Title — Amharic / English]
[Short description]
[N fonts]
```

Detail page renders the collection's fonts using the same `FontGrid` component.

---

### 9.5 Licenses Page `/licenses`

A static-feeling page listing each approved license from `GET /fonts/filters` (licenses array). For each license:
- License code and name
- Bilingual summary
- Key permissions: redistributable ✓, commercial use ✓, attribution required
- Link to full text

---

## 10. Authentication

### Token Storage
- Access token → Zustand `authStore` (memory only)
- Refresh token → `localStorage` key `fh_refresh`

### Session Persistence
On app boot in `main.tsx`, before rendering: read `fh_refresh` from localStorage → call `POST /auth/refresh` → populate `authStore`. If refresh fails, clear localStorage and render unauthenticated.

### Token Flow
```
Login → POST /auth/login → store access token in authStore, refresh in localStorage
API call → inject Bearer token → on 401: refresh + retry once
Logout → POST /auth/logout → clear authStore + localStorage → navigate /login
```

### Route Guards
React Router v7 `loader` on `ContributorLayout` and `AdminLayout` routes:
```typescript
// Contributor guard
if (!user) throw redirect('/login');
if (user.role === 'reviewer' || user.role === 'admin') throw redirect('/admin/dashboard');

// Admin guard
if (!user) throw redirect('/login');
if (user.role === 'contributor') throw redirect('/contributor/submissions');
```

---

## 11. Specimen Store (Zustand)

The `specimenStore` holds global preview state shared between the catalog filter bar and all font cards:

```typescript
type SpecimenStore = {
  text: string;              // custom "Your Text" input
  preset: 'am' | 'en' | 'names';  // active preset
  fontSize: number;          // px value from slider (60–210)
  darkMode: boolean;         // specimen card background toggle
  viewMode: 'list' | 'grid';
  columnCount: 1 | 2 | 3;   // list view text column count
  setText: (text: string) => void;
  setPreset: (preset: 'am' | 'en' | 'names') => void;
  setFontSize: (px: number) => void;
  toggleDarkMode: () => void;
  setViewMode: (mode: 'list' | 'grid') => void;
};
```

Font cards subscribe to this store and re-render their specimen whenever `text`, `fontSize`, or `darkMode` changes.

---

## 12. Font Loading Strategy (`fontLoader.ts`)

Each font card needs to load and render its font in the browser. The approach:

1. The card receives the font's CDN URL from the API (`defaultPreviewStyleId` → font file URL)
2. `fontLoader.ts` builds a unique CSS `font-family` name per font (e.g., `fh-font-awaze-regular`)
3. Inject a `<style>` tag with `@font-face { font-family: 'fh-font-awaze-regular'; src: url(...); }` into `<head>`, if not already present
4. Apply `font-family: 'fh-font-awaze-regular'` to the specimen element
5. Cache injected fonts in a module-level `Set` to avoid duplicate injection

The font file URL is the CDN URL for the approved font binary. This is confirmed available via `coverImageUrl`-style CDN paths in the API. **Open question: confirm the font file CDN URL shape with the backend team (see Section 17).**

For the catalog grid with 20–100 cards, lazy-load fonts using `IntersectionObserver` — only inject the `@font-face` when the card is in or near the viewport.

---

## 13. Upload Flow (`useUpload.ts`)

Three-step sequence for each file:

1. `POST /uploads/init` → receive `{ uploadId, uploadUrl, headers }`
2. `PUT uploadUrl` with file binary and provided headers (direct to S3/R2)
3. Compute SHA-256 via `crypto.subtle.digest('SHA-256', fileBuffer)`
4. `POST /uploads/complete` with `{ uploadId, submissionId, sha256 }`

The `useUpload` hook manages this per-file state machine:
```
idle → initializing → uploading (0–100%) → hashing → completing → queued | failed
```

Multiple files upload in parallel. Each shows its own progress bar via `UploadProgressItem`.

---

## 14. Admin / Reviewer Dashboard

### Review Queue (`/admin/review`)
Status tab strip: `Needs Review` | `Changes Requested` | `Processing Failed` | `Approved` | `Rejected`

Table columns: Family name (en + am) | Publisher | Contributor | License | ⚠ count | Submitted at

### Review Detail (`/admin/review/:submissionId`)
Two-column layout:
- Left (2/3 width): `FontPreviewer` specimen + `StylesSection` (draft fonts) + `GlyphsSection` + `ProcessingWarnings`
- Right (1/3 width): Contributor info, compliance flags, ownership evidence, assent record, `ReviewHistory` timeline, notes input, action buttons

Action buttons (Approve / Request Changes / Reject / Archive) open a `ConfirmDialog` requiring notes input before calling the API.

### Vocabulary CRUD
All six entity pages (publishers, designers, licenses, categories, tags, collections) share `VocabTable` + `VocabForm`. The form renders as a Radix UI Dialog (modal). Fields configured per entity via a config object, not hardcoded per page.

---

## 15. Internationalization

Use **i18next + react-i18next**.

```typescript
// src/lib/i18n/index.ts
i18n.init({
  resources: { en: { translation: enMessages }, am: { translation: amMessages } },
  lng: localStorage.getItem('fh_lang') ?? 'am',  // default Amharic
  fallbackLng: 'en',
});
```

Default language is **Amharic** — this is an Ethiopic font platform first.

The `bilingualValue(field, locale)` utility picks `field.am ?? field.en` (Amharic first, English fallback) or `field.en ?? field.am` depending on locale.

Amharic-specific notes:
- Use **Noto Sans Ethiopic** loaded from Google Fonts as the UI body font for Amharic text in navigation, labels, and descriptions
- Specimen cards use whatever font is being previewed — no Ethiopic fallback needed there
- The "Your Text" input accepts Amharic keyboard input natively
- Default specimen preset is `am` — shows `specimenDefaults.am` from the API

---

## 16. Build Milestones

### Milestone 1 — Foundation (`feature/frontend-setup`)

- Install all new dependencies (see Section 18)
- Configure path alias `@/` in `vite.config.ts` and `tsconfig.app.json`
- Define all routes in `src/router/index.tsx`
- Extend `styles.css` with CSS custom properties system
- Build `SiteNav` component (Fontshare-style grid nav with dark bar + cream active cell)
- Build `PublicLayout`, `ContributorLayout`, `AdminLayout` shells
- Set up i18next with `en` and `am` skeleton files (default: `am`)
- Implement `authStore` (Zustand) and session persistence on app boot
- Implement base API client with token injection and 401 retry
- Build `LoginPage` wired to `POST /auth/login` with role-based redirect
- Implement route guard loaders
- Configure TanStack Query provider in `main.tsx`

**Done when:** Login works, protected routes redirect, SiteNav renders correctly, and dev server runs alongside backend.

---

### Milestone 2 — Catalog & Font Cards (`feature/frontend-catalog`)

Backend Milestone B required.

- Build `specimenStore` (Zustand)
- Build `FontPreviewer` / `fontLoader.ts` with IntersectionObserver lazy loading
- Build `FilterBar` with sticky two-row layout, `SpecimenControls`, `CatalogToolbar`
- Build `FontCard` (list view) and `FontCardGrid` (grid view) with live specimen rendering
- Build `FontGrid` toggling between views
- Build `CategoryDropdown`, `FilterDropdown`, `FilterChips`
- Build `CatalogPage` with URL-param-driven filter state
- Build `CollectionCard`, `CollectionsPage`, `CollectionDetailPage`
- Build `LicensesPage`, `AboutPage`, `FaqPage`
- Connect all public API hooks via TanStack Query
- Load Noto Sans Ethiopic in `index.html`

**Done when:** A visitor can browse, filter with all filter types, see live Amharic specimen text across all font cards, and navigate to any page.

---

### Milestone 3 — Font Detail (`feature/frontend-font-detail`)

At least one published font in staging required.

- Build `DetailNav` (sticky secondary nav with scroll-spy)
- Build `StylesSection` with per-style specimen + size slider + download button
- Build `GlyphsSection` with Ethiopic glyph grid and single-glyph metrics panel
- Build `LayoutsSection` (2-block headline + body preview)
- Build `DetailsSection` (spec table + description)
- Build `LicenseSection`
- Build `DownloadButton` wired to `POST /downloads/families/:familyId`
- Build `RelatedFonts` mini-grid
- Wire all `GET /fonts/:slug` and `GET /fonts/:slug/styles` data

**Done when:** A visitor can explore a font in full detail — see all styles, browse glyphs with Ethiopic coverage, preview in layouts, and download the family.

---

### Milestone 4 — Contributor Portal (`feature/frontend-contributor`)

Backend Milestone C required.

- Build `ProfilePage` (`PATCH /auth/me/profile`)
- Build `SubmissionsListPage` with `SubmissionCard` and `SubmissionStatusBadge`
- Build `NewSubmissionPage` with form, `ComplianceChecklist`, `DeclarationAcceptance`
- Build `UploadPage` with `UploadDropzone`, `UploadProgressItem`, SHA-256, and 3-step upload flow
- Build `SubmissionDetailPage` with `ProcessingFeedback` and submit-for-review gate
- Wire all contributor API hooks

**Done when:** A contributor can create a draft, upload font files, see processing feedback, and submit for review.

---

### Milestone 5 — Admin Review Dashboard (`feature/frontend-admin-review`)

Backend Milestone D required.

- Build admin sidebar navigation
- Build `DashboardPage` with `DashboardCounters`
- Build `ReviewQueuePage` with status tab strip and `ReviewQueue` table
- Build `ReviewDetailPage` — two-column layout with `FontPreviewer` loading draft font, `ProcessingWarnings`, `ReviewActionPanel`, `ReviewHistory`
- Wire all approve / reject / request-changes / archive actions with `ConfirmDialog`
- Build `FailuresPage` with retry

**Done when:** A reviewer can inspect a submission end-to-end and make a decision that updates public visibility.

---

### Milestone 6 — Vocabulary & Analytics (`feature/frontend-admin-vocab`, `feature/frontend-analytics`)

Backend Milestone E required.

- Build all six vocabulary CRUD pages using shared `VocabTable` + `VocabForm`
- Build `CollectionsAdminPage` with item ordering
- Build `AnalyticsPage` with `AnalyticsOverview`

**Done when:** An admin can manage all platform vocabulary from the dashboard.

---

### Milestone 7 — Polish & Hardening (`feature/frontend-i18n`, `feature/frontend-polish`)

Backend Milestone F.

- Complete all Amharic translations in `am.json`
- Full error and empty state coverage on every page
- Responsive layout QA (mobile, tablet, desktop — catalog collapses from 4 to 2 to 1 column)
- Accessibility: keyboard navigation for filter dropdowns, sliders, dialogs; ARIA labels; focus trapping in modals
- Performance: font lazy loading with IntersectionObserver, code splitting per route
- `react-helmet-async` for page meta titles and OG description
- E2E tests: browse → download, login → upload → submit, login → review → approve

---

## 17. Open Questions (Resolve Before Milestone 2)

1. **Font file CDN URL** — what URL shape do approved font files have for client-side `@font-face` loading? Is there a `fontFileUrl` or similar field in the styles response, or is it derived from `storageKey` + `CDN_BASE_URL`? Add `VITE_CDN_URL` to `frontend/.env.example` if needed.

2. **Cover image placeholder** — what should `FontCard` render when `coverImageUrl` is `null`? A CSS specimen rendered in the font itself (like Fontshare) is the correct fallback — confirm this is the intended approach.

3. **Contributor account creation** — how are contributor accounts provisioned in V1? If admin-only, the "get started" CTA should say "contact us" rather than link to a register page.

4. **CORS** — confirm the backend CORS allowlist includes `http://localhost:5173` for local dev and the production frontend domain.

5. **`shared/` package** — when will `@fonthabesha/shared` be initialized as a proper workspace package? Until then, types stay local in `frontend/src/lib/types/`.

6. **Amharic text presets** — what are the canonical preset specimen strings for the three presets (Amharic / English / Names)? These are currently `specimenDefaults.am` and `specimenDefaults.en` from the API — confirm these are reliable fields on every published family.

---

## 18. Packages to Add to `frontend/package.json`

```bash
# From the monorepo root
npm install react-router-dom @tanstack/react-query zustand \
  i18next react-i18next react-helmet-async \
  react-hook-form zod @hookform/resolvers \
  opentype.js \
  @radix-ui/react-dialog @radix-ui/react-slider \
  @radix-ui/react-tabs @radix-ui/react-checkbox \
  @radix-ui/react-select @radix-ui/react-dropdown-menu \
  @radix-ui/react-toggle-group \
  --workspace @fonthabesha/frontend

npm install --save-dev @types/opentype.js --workspace @fonthabesha/frontend
```

---

## 19. Explicit Non-Goals for V1

- No user shortlist / download cart (Fontshare's ☆ star + "+ Add Style" system) — deferred Phase 2
- No font pairing feature (Fontshare's Pairs page) — not in backend V1
- No self-registration
- No public contributor profile pages
- No payment or licensing enforcement UI
- No social features or comments
- No user-created collections
- No real-time notifications (polling or optimistic UI for submission status)
- No SSR (SPA limitation accepted for V1)
- No service worker / offline support
- No advanced typographic property filters (Weight range slider, Width, Contrast, Edges, x-Height) — backend does not index these in V1
