interface ErrorStateProps {
  /** Heading — defaults to "ስህተት ተከስቷል" */
  title?: string;
  /** Descriptive message shown beneath the title */
  message?: string;
  /** Optional retry callback — renders a "Try again" button when provided */
  onRetry?: () => void;
  /** Compact inline variant (no full-page padding) */
  inline?: boolean;
}

export default function ErrorState({
  title,
  message,
  onRetry,
  inline = false,
}: ErrorStateProps) {
  return (
    <div className={`error-state${inline ? ' error-state--inline' : ''}`} role="alert">
      <p className="error-state__title">{title ?? 'ስህተት ተከስቷል።'}</p>
      {message && <p className="error-state__message">{message}</p>}
      {onRetry && (
        <button type="button" className="btn btn--outline" onClick={onRetry}>
          እንደገና ሞክር
        </button>
      )}
    </div>
  );
}
