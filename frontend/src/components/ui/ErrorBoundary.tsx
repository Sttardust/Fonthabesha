/**
 * ErrorBoundary — catches unhandled React render errors and shows a
 * recovery UI instead of a white screen. Wraps <RouterProvider />.
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // In production you'd send this to an error tracking service
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  override render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="error-boundary" role="alert">
        <span className="error-boundary__icon" aria-hidden="true">ፍ</span>
        <h1 className="error-boundary__title">Something went wrong</h1>
        <p className="error-boundary__message">{this.state.message || 'An unexpected error occurred.'}</p>
        <div className="error-boundary__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => { this.handleReset(); window.location.assign('/'); }}
          >
            Go to home
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
