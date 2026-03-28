import React, { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { IoPlay, IoVolumeHigh, IoVolumeMute } from 'react-icons/io5';
import './LazyMedia.css';

/**
 * LazyVideo - Lazy-loaded video with thumbnail/poster and error handling
 * Uses IntersectionObserver to only load videos when they enter the viewport
 * Supports auto-generated thumbnails from video frames
 */
const LazyVideo = ({
  src,
  poster,
  alt = 'Video',
  className = '',
  autoPlay = false,
  loop = false,
  muted = true,
  controls = false,
  onLoad,
  onError,
  onPlay,
  onEnded,
  threshold = 0.1,
  rootMargin = '50px',
  onClick,
  style,
  showPlayButton = true,
  generateThumbnail = true,
  stopPropagationOnClick = true,
  disableInlinePlayback = false,
  pauseOnHidden = true,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [thumbnail, setThumbnail] = useState(poster);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const thumbnailVideoRef = useRef(null);
  const pausedByVisibilityRef = useRef(false);
  const hlsRef = useRef(null);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setIsPlaying(false);
    setShowVideo(false);
    setThumbnail(poster || null);
    pausedByVisibilityRef.current = false;
  }, [src, poster]);
  // Set up IntersectionObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !src) return;

    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const inView = entry.isIntersecting;
          setIsInView(inView);
          if (inView) {
            setHasEnteredView(true);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(container);

    return () => observer.unobserve(container);
  }, [src, threshold, rootMargin]);

  // Generate thumbnail from video frame if no poster provided
  useEffect(() => {
    if (poster || !generateThumbnail || !hasEnteredView || !src || thumbnail) return;

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'metadata';

    const handleLoadedData = () => {
      // Seek to 1 second or 10% of duration
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    const handleSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setThumbnail(dataUrl);
      } catch (e) {
        // CORS or other error - use default
      }
      video.remove();
    };

    const handleError = () => {
      video.remove();
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);
    video.src = src;

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      video.remove();
    };
  }, [poster, generateThumbnail, isInView, src, thumbnail]);

  const handleVideoLoad = useCallback((e) => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.(e);
  }, [onLoad]);

  const handleVideoError = useCallback((e) => {
    setHasError(true);
    setIsLoaded(true);
    onError?.(e);
  }, [onError]);

  const handlePlay = useCallback(() => {
    setShowVideo(true);
    // Wait for video element to mount
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          onPlay?.();
          return undefined;
        }).catch(() => {
          setIsPlaying(false);
          return undefined;
        });
      }
    }, 50);
  }, [onPlay]);

  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    if (!loop) {
      setShowVideo(false);
    }
    onEnded?.();
  }, [loop, onEnded]);

  const toggleMute = useCallback((e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoaded(false);
    setShowVideo(false);
    setThumbnail(poster);
  }, [poster]);

  useEffect(() => {
    if (!autoPlay || disableInlinePlayback || !hasEnteredView || hasError) return;
    setShowVideo(true);
  }, [autoPlay, disableInlinePlayback, hasEnteredView, hasError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !showVideo || !src) return undefined;

    const isHls = src.includes('.m3u8') || src.includes('manifest/');

    if (!isHls) {
      video.src = src;
      return undefined;
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return undefined;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data?.fatal) {
          setHasError(true);
        }
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.removeAttribute('src');
        try {
          video.load();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [src, showVideo]);

  const handleContainerClick = useCallback((e) => {
    if (stopPropagationOnClick) {
      e.stopPropagation();
    }
    onClick?.(e);
    if (disableInlinePlayback) {
      return;
    }
    if (!showVideo && !hasError) {
      handlePlay();
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  }, [onClick, showVideo, hasError, handlePlay, isPlaying, stopPropagationOnClick, disableInlinePlayback]);

  useEffect(() => {
    if (!pauseOnHidden) return undefined;

    const handleVisibilityChange = () => {
      const shouldPause = document.hidden;
      if (shouldPause && videoRef.current && isPlaying) {
        pausedByVisibilityRef.current = true;
        videoRef.current.pause();
        setIsPlaying(false);
      } else if (!shouldPause && pausedByVisibilityRef.current && videoRef.current) {
        pausedByVisibilityRef.current = false;
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          return undefined;
        }).catch(() => {
          setIsPlaying(false);
          return undefined;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, pauseOnHidden]);

  useEffect(() => {
    if (!showVideo || !videoRef.current) return;
    if (!isInView) {
      if (isPlaying) {
        pausedByVisibilityRef.current = true;
      }
      videoRef.current.pause();
      setIsPlaying(false);
      return;
    }
    if (autoPlay && !pausedByVisibilityRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        return undefined;
      }).catch(() => {
        setIsPlaying(false);
        return undefined;
      });
      return;
    }
    if (pausedByVisibilityRef.current) {
      pausedByVisibilityRef.current = false;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        return undefined;
      }).catch(() => {
        setIsPlaying(false);
        return undefined;
      });
    }
  }, [autoPlay, isInView, showVideo, isPlaying]);

  return (
    <div
      ref={containerRef}
      className={`lazy-video-container ${className} ${isLoaded ? 'loaded' : 'loading'} ${hasError ? 'error' : ''}`}
      style={style}
      onClick={handleContainerClick}
    >
      {/* Skeleton placeholder while not in view */}
      {!hasEnteredView && (
        <div className="lazy-video-skeleton">
          <div className="skeleton-shimmer" />
        </div>
      )}

      {/* Error state */}
      {hasError ? <div className="lazy-video-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <span>Failed to load video</span>
          <button onClick={handleRetry} className="retry-button">
            Retry
          </button>
        </div> : null}

            {/* Thumbnail/Poster with play button */}
      {hasEnteredView && !showVideo && !hasError ? <div className="lazy-video-thumbnail">
          {thumbnail ? (
            <img src={thumbnail} alt={alt} className="video-poster" />
          ) : (
            <div className="video-poster-placeholder">
              <div className="skeleton-shimmer" />
            </div>
          )}
          <div className="video-type-badge">Video</div>
          {showPlayButton ? <div className="video-play-overlay">
              <div className="video-play-button">
                <IoPlay />
              </div>
            </div> : null}
          <div className="video-play-hint">
            <IoPlay />
            <span>Play video</span>
          </div>
        </div> : null}

      {/* Actual video */}
      {hasEnteredView && showVideo && !hasError ? <div className="lazy-video-wrapper">
          <video
            ref={videoRef}
            poster={thumbnail}
            loop={loop}
            muted={isMuted}
            playsInline
            controls={controls}
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
            onEnded={handleVideoEnded}
            className="lazy-video"
            {...props}
          />
          {/* Mute toggle button */}
          <button className="video-mute-button" onClick={toggleMute}>
            {isMuted ? <IoVolumeMute /> : <IoVolumeHigh />}
          </button>
        </div> : null}
    </div>
  );
};

export default LazyVideo;




