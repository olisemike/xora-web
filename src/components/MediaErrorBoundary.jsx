import React, { Component } from 'react';
import './LazyMedia.css';

/**
 * MediaErrorBoundary - React Error Boundary for media components
 * Catches rendering errors and displays a fallback UI instead of crashing
 */
class MediaErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Log error for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      console.error('MediaErrorBoundary caught an error:', error, errorInfo);
    }

    // Call optional error callback
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError } = this.state;
    const { children, fallback, className = '', showRetry = true } = this.props;

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return typeof fallback === 'function'
          ? fallback({ error: this.state.error, retry: this.handleRetry })
          : fallback;
      }

      // Default fallback UI
      return (
        <div className={`media-error-boundary ${className}`}>
          <div className="media-error-content">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Something went wrong</span>
            {showRetry ? <button onClick={this.handleRetry} className="retry-button">
                Try again
              </button> : null}
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * withMediaErrorBoundary - HOC to wrap components with MediaErrorBoundary
 */
export const withMediaErrorBoundary = (WrappedComponent, boundaryProps = {}) => {
  const WithMediaErrorBoundary = (props) => (
    <MediaErrorBoundary {...boundaryProps}>
      <WrappedComponent {...props} />
    </MediaErrorBoundary>
  );

  WithMediaErrorBoundary.displayName = `withMediaErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithMediaErrorBoundary;
};

export default MediaErrorBoundary;
