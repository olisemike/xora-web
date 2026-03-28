import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoArrowBack, IoHeartOutline, IoChatbubbleOutline, IoShareOutline, IoBookmarkOutline, IoVolumeHighOutline, IoVolumeMuteOutline, IoPlayOutline } from 'react-icons/io5';
import { api } from '../services/api';
import AvatarPlaceholder from '../assets/avatar-placeholder.svg';

const ReelsAppOverlay = ({ show, onClose }) => {
  if (!show) return null;

  return (
    <div
      className="reels-app-overlay"
      onClick={onClose}
    >
      <div
        className="reels-app-overlay-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Watch Reels in the Xora app</h3>
        <p>Install the mobile app to watch and interact with Reels.</p>
        <div className="reels-app-buttons">
          <a
            href="https://apps.apple.com/"
            target="_blank"
            rel="noreferrer"
            className="store-button ios"
          >
            Get on App Store
          </a>
          <a
            href="https://play.google.com/store"
            target="_blank"
            rel="noreferrer"
            className="store-button android"
          >
            Get on Google Play
          </a>
        </div>
      </div>
    </div>
  );
};

const Reels = () => {
  const [reels, setReels] = useState([]);
  const [showAppPrompt, setShowAppPrompt] = useState(false);
  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = React.useRef(null);

  // Get postId from URL if provided
  const searchParams = new URLSearchParams(location.search);
  const startPostId = searchParams.get('postId');

  useEffect(() => {
    const loadReels = async () => {
      setLoading(true);
      try {
        const feed = await api.getReelsFeed();
        const mapped = feed.map((r) => ({
          id: r.id,
          userId: r.user?.id,
          userName: r.user?.name || r.user?.username || 'User',
          userAvatar: r.user?.avatar || null,
          type: 'video',
          url: r.video,
          thumbnail: null,
          likes: r.likes ?? 0,
          comments: r.comments ?? 0,
          shares: 0,
          timestamp: '',
          description: r.caption || '',
        }));
        setReels(mapped);

        // If startPostId provided, find and set current index
        if (startPostId && mapped.length > 0) {
          const startIndex = mapped.findIndex(r => r.id === startPostId);
          if (startIndex !== -1) {
            setCurrentIndex(startIndex);
          }
        }
      } catch (err) {
        setReels([]);
      } finally {
        setLoading(false);
      }
    };

    loadReels();
  }, [startPostId]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % reels.length);
    setShowComments(false);
    setPlaying(true);
  };

  const _handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + reels.length) % reels.length);
    setShowComments(false);
    setPlaying(true);
  };

  const togglePlayPause = (e) => {
    e.stopPropagation();
    if (isMobile) {
      setShowAppPrompt(true);
      return;
    }
    setPlaying(!playing);
  };

  useEffect(() => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.play().catch(() => {
        setPlaying(false);
      });
      return;
    }
    videoRef.current.pause();
  }, [playing, currentIndex]);

  if (loading) {
    return (
      <div className="reels-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="reels-container">
        <div className="empty-state">
          <h3>No reels available</h3>
        </div>
      </div>
    );
  }

  const currentReel = reels[currentIndex];

  return (
    <div className="reels-container">
      <button className="back-btn-reels" onClick={() => navigate(-1)}>
        <IoArrowBack />
      </button>

      <div className="reel-content" onClick={handleNext}>
        {/* Video Player */}
        <video
          ref={videoRef}
          src={currentReel.url}
          className="reel-video"
          autoPlay={!isMobile}
          loop
          muted={muted}
          playsInline
          poster={currentReel.thumbnail}
          onClick={togglePlayPause}
        />

        {/* Play/Pause Overlay */}
        {!playing && (
          <div className="play-pause-overlay" onClick={togglePlayPause}>
            <IoPlayOutline />
          </div>
        )}

        {/* Progress Bars */}
        <div className="progress-bars">
          {reels.map((_, index) => (
            <div key={index} className={`progress-bar ${index === currentIndex ? 'active' : ''} ${index < currentIndex ? 'completed' : ''}`} />
          ))}
        </div>

        {/* User Info */}
        <div className="reel-user-info">
          {currentReel.userAvatar ? (
            <img src={currentReel.userAvatar} alt={currentReel.userName} className="reel-user-avatar" />
          ) : (
            <img src={AvatarPlaceholder} alt="Default avatar" className="reel-user-avatar" />
          )}
          <div className="reel-user-details">
            <span className="reel-user-name">{currentReel.userName}</span>
            <span className="reel-timestamp">{currentReel.timestamp}</span>
          </div>
        </div>

        {/* Description */}
        {currentReel.description ? <div className="reel-description">
            <p>{currentReel.description}</p>
          </div> : null}

        {/* Actions */}
        <div className="reel-actions">
          <button className="reel-action-btn">
            <IoHeartOutline />
            <span>{currentReel.likes.toLocaleString()}</span>
          </button>
          <button 
            className="reel-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(!showComments);
            }}
          >
            <IoChatbubbleOutline />
            <span>{currentReel.comments}</span>
          </button>
          <button className="reel-action-btn">
            <IoShareOutline />
            <span>{currentReel.shares}</span>
          </button>
          <button className="reel-action-btn">
            <IoBookmarkOutline />
          </button>
        </div>

        {/* Volume Control */}
        <button 
          className="volume-btn"
          onClick={(e) => {
            e.stopPropagation();
            setMuted(!muted);
          }}
        >
          {muted ? <IoVolumeMuteOutline /> : <IoVolumeHighOutline />}
        </button>
      </div>

      {/* Comments Panel - currently no backend wiring, so just show an empty state */}
      {showComments ? <div className="comments-panel" onClick={(e) => e.stopPropagation()}>
          <div className="comments-header">
            <h3>Comments</h3>
            <button onClick={() => setShowComments(false)}>×</button>
          </div>
          <div className="comments-list empty">
            <p>No comments yet.</p>
          </div>
        </div> : null}

      {/* Mobile app prompt overlay for Reels */}
      <ReelsAppOverlay
        show={isMobile ? showAppPrompt : null}
        onClose={() => setShowAppPrompt(false)}
      />
    </div>
  );
};

export default Reels;





