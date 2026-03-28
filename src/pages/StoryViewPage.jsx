import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IoArrowBack, IoVolumeHighOutline, IoVolumeMuteOutline, IoHeart, IoPaperPlaneOutline, IoEllipsisVertical, IoChevronBackOutline, IoChevronForwardOutline } from 'react-icons/io5';
import './StoryViewPage.css';
import { logMessage } from '../utils/errorLogger';
import { api } from '../services/api';

const StoryViewPage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stories, setStories] = useState([]);
  const videoRef = useRef(null);
  const progressInterval = useRef(null);

  const isStoryExpired = (story) => {
    const expiresAt = story?.expiresAt || story?.expires_at;
    if (!expiresAt) return false;
    const expiresMs = typeof expiresAt === 'number'
      ? (expiresAt < 1e12 ? expiresAt * 1000 : expiresAt)
      : Date.parse(expiresAt);
    if (Number.isNaN(expiresMs)) return false;
    return expiresMs <= Date.now();
  };

  const loadStories = useCallback(async () => {
    try {
      const result = await api.getUserStories(username);
      const items = (result.stories || []).map((s) => ({
        id: s.id,
        user: {
          name: s.actor_name || result.user?.name || username,
          username: s.username || result.user?.username || username,
          avatar: s.avatar_url || result.user?.avatarUrl || null,
        },
        media: s.media_url,
        type: s.media_type || 'image',
        timestamp: s.created_at ? new Date(s.created_at * 1000).toLocaleString() : '',
        expiresAt: s.expires_at,
        viewedByMe: s.viewed_by_me > 0,
      }));
      setStories(items.filter((s) => !isStoryExpired(s)));
      setCurrentIndex(0);
      setProgress(0);
    } catch (err) {
      setStories([]);
    }
  }, [username]);

  // Track story view when current story changes
  const viewedStoriesRef = useRef(new Set());

  useEffect(() => {
    if (!stories.length) return;
    const currentStory = stories[currentIndex];
    if (!currentStory || viewedStoriesRef.current.has(currentStory.id)) return;

    // Mark story as viewed
    viewedStoriesRef.current.add(currentStory.id);
    api.viewStory(currentStory.id).catch((err) => {
      logMessage('Failed to mark story as viewed', 'warning', { error: String(err) });
    });
  }, [currentIndex, stories]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  useEffect(() => {
    if (!stories.length) return;
    const interval = setInterval(() => {
      setStories((prev) => prev.filter((s) => !isStoryExpired(s)));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [stories.length]);

  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      navigate(-1);
    }
  }, [currentIndex, stories.length, navigate]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!stories.length) return;
    if (currentIndex >= stories.length) {
      setCurrentIndex(0);
      setProgress(0);
    }
    const currentStory = stories[currentIndex];

    if (currentStory.type === 'video' && videoRef.current) {
      videoRef.current.play().catch(err => {
        logMessage('Autoplay prevented', 'warning', { error: String(err) });
      });

      videoRef.current.ontimeupdate = () => {
        const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(progress);
      };

      videoRef.current.onended = () => {
        goToNext();
      };
    } else if (currentStory.type === 'image') {
      // Auto-progress image stories after 8 seconds
      setProgress(0);
      progressInterval.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval.current);
            goToNext();
            return 100;
          }
          return prev + 1.25; // 100% / 80 intervals = 1.25% per 100ms = 8 seconds total
        });
      }, 100);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentIndex, goToNext, stories]);

  const handleMediaClick = () => {
    if (!stories.length) return;
    if (stories[currentIndex].type === 'video' && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  if (!stories.length) {
    return (
      <div className="story-view-page">
        <div className="story-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <IoArrowBack />
          </button>
          <div className="story-user-info">
            <span className="story-username">{username}</span>
            <span className="story-timestamp">No stories available</span>
          </div>
        </div>
      </div>
    );
  }

  const currentStory = stories[currentIndex];

  return (
    <div className="story-view-page">
      {/* Progress bars */}
      <div className="story-progress-bars">
        {stories.map((_, index) => (
          <div key={index} className="progress-bar-container">
            <div 
              className="progress-bar" 
              style={{ 
                width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%' 
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="story-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <div className="story-user-info">
          <div className="story-avatar">
            {currentStory.user?.avatar ? (
              <img src={currentStory.user.avatar} alt={currentStory.user?.name || 'User'} />
            ) : (
              <div className="avatar-placeholder">
                {currentStory.user?.name?.[0] || '?'}
              </div>
            )}
          </div>
          <div>
            <span className="story-username">{currentStory.user?.name || 'Unknown'}</span>
            <span className="story-timestamp">{currentStory.timestamp}</span>
          </div>
        </div>
        <div className="story-actions-header">
          <button className="story-action-btn" onClick={() => setMuted(!muted)}>
            {muted ? <IoVolumeMuteOutline /> : <IoVolumeHighOutline />}
          </button>
          <button className="story-action-btn">
            <IoEllipsisVertical />
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button className="story-nav-arrow story-nav-left" onClick={goToPrevious}>
          <IoChevronBackOutline />
        </button>
      )}
      {currentIndex < stories.length - 1 && (
        <button className="story-nav-arrow story-nav-right" onClick={goToNext}>
          <IoChevronForwardOutline />
        </button>
      )}

      {/* Story media */}
      <div className="story-media-container" onClick={handleMediaClick}>
        {currentStory.type === 'video' ? (
          <video
            ref={videoRef}
            src={currentStory.media}
            muted={muted}
            playsInline
            className="story-media"
          />
        ) : (
          <img src={currentStory.media} alt="Story" className="story-media" />
        )}
      </div>

      {/* Reply input */}
      <div className="story-reply-container">
        <input
          type="text"
          id="story-reply"
          name="story-reply"
          className="story-reply-input"
          placeholder="Send message"
        />
        <button className="story-reply-btn">
          <IoHeart />
        </button>
        <button className="story-reply-btn">
          <IoPaperPlaneOutline />
        </button>
      </div>
    </div>
  );
};

export default StoryViewPage;





