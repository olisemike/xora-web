import React, { useState, useRef, useEffect } from 'react';
import { 
  IoPlay, 
  IoPause, 
  IoVolumeHigh, 
  IoVolumeMute, 
  IoExpand, 
  IoContract 
} from 'react-icons/io5';
import './VideoPlayer.css';

const VideoPlayer = ({ src, poster, autoPlay = false, loop = false, onEnded }) => {
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const hideControlsTimeout = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [onEnded]);

  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [autoPlay]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;

    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleProgressClick = (e) => {
    const video = videoRef.current;
    const progressBar = progressBarRef.current;
    if (!video || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleFullscreen = async () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    try {
      if (!isFullscreen) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      // Ignore fullscreen errors
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }

    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="video-player-container" 
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="video-player"
        src={src}
        poster={poster}
        loop={loop}
        playsInline
        onClick={togglePlayPause}
      />

      {/* Loading Spinner */}
      {isLoading ? <div className="video-loading">
          <div className="spinner"></div>
        </div> : null}

      {/* Play/Pause Overlay */}
      {!isPlaying && !isLoading && (
        <div className="video-play-overlay" onClick={togglePlayPause}>
          <div className="video-play-button">
            <IoPlay />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={`video-controls ${showControls || !isPlaying ? 'visible' : 'hidden'}`}>
        {/* Progress Bar */}
        <div 
          className="video-progress-container" 
          ref={progressBarRef}
          onClick={handleProgressClick}
        >
          <div className="video-progress-bar">
            <div 
              className="video-progress-filled" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="video-bottom-controls">
          {/* Left Side */}
          <div className="video-controls-left">
            <button 
              className="video-control-btn" 
              onClick={togglePlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <IoPause /> : <IoPlay />}
            </button>

            <div className="video-volume-control">
              <button 
                className="video-control-btn" 
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <IoVolumeMute /> : <IoVolumeHigh />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="video-volume-slider"
              />
            </div>

            <div className="video-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Right Side */}
          <div className="video-controls-right">
            <button 
              className="video-control-btn" 
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <IoContract /> : <IoExpand />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;





