import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '1.5rem',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <span style={{ fontSize: '4rem' }}>ፍ</span>
      <h1 style={{ fontSize: '1.5rem', color: 'var(--color-text)' }}>
        404 — Page Not Found
      </h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        The page you're looking for doesn't exist.
      </p>
      <Link to="/" className="btn btn--primary">
        Back to Home
      </Link>
    </div>
  );
}
