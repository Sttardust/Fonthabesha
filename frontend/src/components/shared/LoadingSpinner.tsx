interface LoadingSpinnerProps {
  /** Optional label shown beneath the spinner (defaults to "በመጫን ላይ…") */
  label?: string;
  /** Full-page centered variant */
  fullPage?: boolean;
}

export default function LoadingSpinner({ label, fullPage = false }: LoadingSpinnerProps) {
  const inner = (
    <div className="loading-spinner" role="status" aria-live="polite">
      <span className="loading-spinner__ring" aria-hidden="true" />
      {label !== null && (
        <span className="loading-spinner__label">{label ?? 'በመጫን ላይ…'}</span>
      )}
    </div>
  );

  if (fullPage) {
    return <div className="loading-spinner-page">{inner}</div>;
  }

  return inner;
}
