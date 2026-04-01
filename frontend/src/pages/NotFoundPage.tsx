import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFoundPage() {
  return (
    <>
      <Helmet><title>404 — Page Not Found — Fonthabesha</title></Helmet>
      <div className="not-found" role="main" aria-labelledby="not-found-title">
        <div className="not-found__glyph" aria-hidden="true">ፍ</div>
        <p className="eyebrow">404</p>
        <h1 id="not-found-title" className="not-found__title">Page not found</h1>
        <p className="not-found__desc">
          The page you're looking for doesn't exist, or may have moved.
        </p>
        <div className="not-found__actions">
          <Link to="/" className="btn btn--primary">Back to home</Link>
          <Link to="/fonts" className="btn btn--secondary">Browse fonts</Link>
        </div>
      </div>
    </>
  );
}
