import React, { useState, useRef, useEffect, useCallback } from 'react';
import './LazyMedia.css';

/**
 * LazyImage - Lazy-loaded image with skeleton placeholder and error handling
 * Uses IntersectionObserver to only load images when they enter the viewport
 */
const LazyImage = ({
  src,
  alt = '',
  className = '',
  placeholder = null,
  onLoad,
  onError,
  threshold = 0.1,
  rootMargin = '100px',
  onClick,
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Set up IntersectionObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !src) return;

    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      // Fallback: load immediately
      setIsInView(true);
      setImageSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setImageSrc(src);
            observer.unobserve(container);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(container);

    return () => {
      observer.unobserve(container);
    };
  }, [src, threshold, rootMargin]);

  // Reset state when src changes
  useEffect(() => {
    if (src !== imageSrc && isInView) {
      setImageSrc(src);
      setIsLoaded(false);
      setHasError(false);
    }
  }, [src, imageSrc, isInView]);

  const handleLoad = useCallback((e) => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.(e);
  }, [onLoad]);

  const handleError = useCallback((e) => {
    setHasError(true);
    setIsLoaded(true);
    onError?.(e);
  }, [onError]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoaded(false);
    // Force reload by appending timestamp
    setImageSrc(`${src}${src.includes('?') ? '&' : '?'}retry=${Date.now()}`);
  }, [src]);

  return (
    <div
      ref={containerRef}
      className={`lazy-image-container ${className} ${isLoaded ? 'loaded' : 'loading'} ${hasError ? 'error' : ''}`}
      style={style}
      onClick={onClick}
    >
      {/* Skeleton placeholder while loading */}
      {!isLoaded && !hasError && (
        <div className="lazy-image-skeleton">
          {placeholder || <div className="skeleton-shimmer" />}
        </div>
      )}

      {/* Error state */}
      {hasError ? <div className="lazy-image-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>Failed to load</span>
          <button onClick={handleRetry} className="retry-button">
            Retry
          </button>
        </div> : null}

      {/* Actual image */}
      {isInView && imageSrc && !hasError ? <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`lazy-image ${isLoaded ? 'visible' : 'hidden'}`}
          {...props}
        /> : null}
    </div>
  );
};

export default LazyImage;
