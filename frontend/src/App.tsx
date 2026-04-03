import { useEffect, useState } from 'react';

type HealthResponse = {
  status: string;
};

type FontListResponse = {
  items: Array<{
    id: string;
    slug: string;
    name: {
      en: string;
      am: string | null;
      native: string | null;
    };
    numberOfStyles: number;
    hasVariableStyles: boolean;
    coverImageUrl: string | null;
  }>;
};

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

function App() {
  const [health, setHealth] = useState<string>('checking');
  const [fonts, setFonts] = useState<FontListResponse['items']>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [healthResponse, fontsResponse] = await Promise.all([
          fetch(`${apiUrl}/health/live`),
          fetch(`${apiUrl}/fonts?page=1&pageSize=8`),
        ]);

        if (!healthResponse.ok) {
          throw new Error(`Health check failed with status ${healthResponse.status}`);
        }

        if (!fontsResponse.ok) {
          throw new Error(`Font catalog failed with status ${fontsResponse.status}`);
        }

        const healthData = (await healthResponse.json()) as HealthResponse;
        const fontData = (await fontsResponse.json()) as FontListResponse;

        if (!cancelled) {
          setHealth(healthData.status);
          setFonts(fontData.items);
        }
      } catch (loadError) {
        if (!cancelled) {
          setHealth('down');
          setError(loadError instanceof Error ? loadError.message : 'Unknown error');
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Fonthabesha</p>
          <h1>Amharic font platform workspace</h1>
          <p className="lede">
            Frontend and backend now run independently in one monorepo. This starter app
            reads the public API and gives you a clean base to build the real interface.
          </p>
          <div className="status-row">
            <span className={`status-pill status-${health}`}>Backend: {health}</span>
            <span className="api-url">{apiUrl}</span>
          </div>
          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </section>

      <section className="catalog">
        <div className="section-header">
          <div>
            <p className="eyebrow">Catalog Preview</p>
            <h2>Approved font families</h2>
          </div>
        </div>

        {fonts.length === 0 ? (
          <div className="empty-state">
            <p>No published families yet.</p>
            <p>Approve a family in the backend and it will show up here.</p>
          </div>
        ) : (
          <div className="font-grid">
            {fonts.map((font) => (
              <article className="font-card" key={font.id}>
                <div className="font-card-body">
                  <p className="font-name">{font.name.native ?? font.name.am ?? font.name.en}</p>
                  <p className="font-slug">{font.slug}</p>
                </div>
                <div className="font-meta">
                  <span>{font.numberOfStyles} styles</span>
                  <span>{font.hasVariableStyles ? 'Variable' : 'Static'}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
