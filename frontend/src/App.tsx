import { useState } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';

import { getApiBaseUrl } from './lib/api';
import { CatalogPage } from './pages/CatalogPage';
import { FamilyDetailPage } from './pages/FamilyDetailPage';

function App() {
  const [health, setHealth] = useState('checking');

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="topbar">
          <Link className="brand-mark" to="/">
            Fonthabesha
          </Link>
          <nav className="topbar-nav">
            <Link className="text-link" to="/">
              Catalog
            </Link>
            <span className={`status-pill status-${health}`}>Backend: {health}</span>
            <span className="api-url">{getApiBaseUrl()}</span>
          </nav>
        </header>

        <main className="page-shell">
          <Routes>
            <Route path="/" element={<CatalogPage onHealthChange={setHealth} />} />
            <Route path="/fonts/:slug" element={<FamilyDetailPage onHealthChange={setHealth} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
