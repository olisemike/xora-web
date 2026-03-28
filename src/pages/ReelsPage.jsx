import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoArrowBack,
  IoVolumeHighOutline,
  IoVolumeMuteOutline,
  IoHeart,
  IoHeartOutline,
  IoChatbubbleOutline,
  IoShareOutline,
  IoChevronUpOutline,
  IoChevronDownOutline,
} from 'react-icons/io5';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { api } from '../services/api';
import { logMessage } from '../utils/errorLogger';
import './ReelsPage.css';

const formatViews = (views) => {
  const numViews = Number(views) || 0;
  if (numViews >= 1000000) return `${(numViews / 1000000).toFixed(1)}M`;
  if (numViews >= 1000) return `${(numViews / 1000).toFixed(1)}K`;
  return numViews.toString();
};

const ReelsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, getCurrentUserId } = useAuth();
  const { followingUsers, setFollowingUsers } = useAppData();

  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState({});
  const [loading, setLoading] = useState(true);
  const [hasPlayedNsfw, setHasPlayedNsfw] = useState(false);
  const [forceNonSensitive, setForceNonSensitive] = useState(false);

  const containerRef = useRef(null);
  const videoRefs = useRef([]);
  const reelRefs = useRef([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!isAuthenticated) {
          setReels([]);
          return;
        }
        const data = await api.getReelsFeed(forceNonSensitive);
        const normalized = Array.isArray(data)
          ? data.filter((item) => !item?.isAd && (item?.url || item?.video || item?.mediaUrl))
          : [];
        setReels(normalized);
        setCurrentIndex(0);
      } catch (err) {
        setReels([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAuthenticated, forceNonSensitive]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || reels.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;

        const nextIndex = Number(visible.target.getAttribute('data-index'));
        if (!Number.isNaN(nextIndex)) {
          setCurrentIndex(nextIndex);
        }
      },
      {
        root,
        threshold: [0.55, 0.7, 0.85],
      },
    );

    reelRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [reels]);

  useEffect(() => {
    const currentReel = reels[currentIndex];
    if (currentReel && (currentReel.is_sensitive === 1 || currentReel.is_sensitive === true)) {
      setHasPlayedNsfw(true);
    }
  }, [currentIndex, reels]);

  useEffect(() => {
    if (hasPlayedNsfw && !forceNonSensitive) {
      const currentReel = reels[currentIndex];
      if (currentReel && (currentReel.is_sensitive !== 1 && currentReel.is_sensitive !== true)) {
        setForceNonSensitive(true);
      }
    }
  }, [currentIndex, reels, hasPlayedNsfw, forceNonSensitive]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === currentIndex) {
        video.muted = muted;
        const playPromise = video.play();
        if (playPromise?.catch) {
          playPromise.catch((err) => {
            logMessage('Reel autoplay prevented', 'warning', { error: String(err) });
          });
        }
      } else {
        video.pause();
      }
    });
  }, [currentIndex, muted]);

  const scrollToIndex = useCallback((index) => {
    const target = reelRefs.current[index];
    if (!target || index < 0 || index >= reels.length) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [reels.length]);

  const goToNext = useCallback(() => scrollToIndex(currentIndex + 1), [currentIndex, scrollToIndex]);
  const goToPrevious = useCallback(() => scrollToIndex(currentIndex - 1), [currentIndex, scrollToIndex]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        goToNext();
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        goToPrevious();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goToNext, goToPrevious]);

  const reelCountLabel = useMemo(
    () => `${Math.min(currentIndex + 1, reels.length)} / ${reels.length}`,
    [currentIndex, reels.length],
  );

  const handleLike = async (reel) => {
    if (!isAuthenticated) {
      toast.info('Please log in to like reels');
      return;
    }

    const targetId = reel.postId || reel.id;
    const optimisticKey = reel.id;
    const wasLiked = liked[optimisticKey] ?? reel.likedByMe ?? false;
    setLiked((prev) => ({ ...prev, [optimisticKey]: !wasLiked }));

    try {
      await api.togglePostLike(targetId, !wasLiked, 'user', getCurrentUserId());
      toast.success(!wasLiked ? 'Reel liked!' : 'Removed like');
    } catch (error) {
      setLiked((prev) => ({ ...prev, [optimisticKey]: wasLiked }));
      toast.error('Failed to update like');
    }
  };

  const handleFollow = async (userId, username, event) => {
    event?.stopPropagation();
    if (!isAuthenticated || !userId) {
      toast.info('Please log in to follow users');
      return;
    }

    const isFollowing = followingUsers.has(userId);
    setFollowingUsers((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.delete(userId);
      else next.add(userId);
      return next;
    });

    try {
      if (isFollowing) {
        await api.unfollowUser('user', userId);
        toast.success(`Unfollowed @${username}`);
      } else {
        await api.followUser('user', userId);
        toast.success(`Following @${username}`);
      }
    } catch (error) {
      setFollowingUsers((prev) => {
        const next = new Set(prev);
        if (isFollowing) next.add(userId);
        else next.delete(userId);
        return next;
      });
      toast.error('Failed to update follow status');
    }
  };

  const goToProfile = (username) => {
    if (!username) return;
    navigate(`/profile/${username}`);
  };

  const handleCommentClick = (reel) => {
    const postId = reel.postId || reel.id;
    navigate(`/post/${postId}`);
  };

  const handleShareClick = async (reel) => {
    const postId = reel.postId || reel.id;
    const shareUrl = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Reel link copied');
    } catch {
      navigate(`/post/${postId}`);
    }
  };

  if (loading) {
    return (
      <div className="reels-page reels-page--state">
        <div className="reels-topbar">
          <button className="back-button" onClick={() => navigate(-1)}>
            <IoArrowBack />
          </button>
          <h2>Reels</h2>
        </div>
        <div className="loading-spinner"><div className="spinner" /></div>
      </div>
    );
  }

  if (!reels.length) {
    return (
      <div className="reels-page reels-page--state">
        <div className="reels-topbar">
          <button className="back-button" onClick={() => navigate(-1)}>
            <IoArrowBack />
          </button>
          <h2>Reels</h2>
        </div>
        <div className="empty-state reels-empty-state">
          <h3>No reels to show yet.</h3>
          <p>New video posts will appear here as soon as the feed refreshes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reels-page">
      <div className="reels-topbar">
        <button className="back-button" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <div className="reels-topbar-copy">
          <h2>Reels</h2>
          <span>{reelCountLabel}</span>
        </div>
        <button className="reels-mute-toggle" onClick={() => setMuted((value) => !value)}>
          {muted ? <IoVolumeMuteOutline /> : <IoVolumeHighOutline />}
        </button>
      </div>

      <div className="reels-stage">
        <div className="reels-container" ref={containerRef}>
          {reels.map((reel, index) => {
            const videoUrl = reel.url || reel.video || reel.mediaUrl;
            const isActive = index === currentIndex;
            const isFollowing = followingUsers.has(reel.user?.id);
            const likeCount = Number(reel.likes || 0) + (liked[reel.id] && !reel.likedByMe ? 1 : 0) - (!liked[reel.id] && reel.likedByMe ? 1 : 0);

            return (
              <section
                key={reel.id}
                ref={(element) => {
                  reelRefs.current[index] = element;
                }}
                data-index={index}
                className={`reel-item ${isActive ? 'is-active' : ''}`}
              >
                <video
                  ref={(element) => {
                    videoRefs.current[index] = element;
                  }}
                  src={videoUrl}
                  poster={reel.thumbnail || undefined}
                  loop
                  muted={muted}
                  playsInline
                  preload={Math.abs(index - currentIndex) <= 1 ? 'auto' : 'metadata'}
                  controls={false}
                  className="reel-video"
                  onClick={() => {
                    const currentVideo = videoRefs.current[index];
                    if (!currentVideo) return;
                    if (currentVideo.paused) currentVideo.play().catch(() => {});
                    else currentVideo.pause();
                  }}
                />

                <div className="reel-gradient reel-gradient-top" />
                <div className="reel-gradient reel-gradient-bottom" />

                <div className="reel-info">
                  <div className="reel-user-row">
                    <button className="reel-avatar" onClick={() => goToProfile(reel.user?.username)}>
                      {reel.user?.avatar ? (
                        <img src={reel.user.avatar} alt={reel.user?.name || 'User'} />
                      ) : (
                        <div className="avatar-placeholder">{reel.user?.name?.[0]?.toUpperCase() || '?'}</div>
                      )}
                    </button>
                    <div className="reel-user-copy" onClick={() => goToProfile(reel.user?.username)}>
                      <span className="reel-name">{reel.user?.name || 'Unknown'}</span>
                      <span className="reel-username">@{reel.user?.username || 'unknown'}</span>
                      <span className="reel-views">{formatViews(reel.views)} views</span>
                    </div>
                    {reel.user?.id ? (
                      <button className={`follow-button ${isFollowing ? 'is-following' : ''}`} onClick={(event) => handleFollow(reel.user?.id, reel.user?.username, event)}>
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    ) : null}
                  </div>
                  {reel.caption ? <p className="reel-caption">{reel.caption}</p> : null}
                </div>

                <div className="reel-actions">
                  <button className="reel-action-btn" onClick={() => handleLike(reel)}>
                    {liked[reel.id] || reel.likedByMe ? <IoHeart className="icon-liked" /> : <IoHeartOutline />}
                    <span>{Math.max(likeCount, 0)}</span>
                  </button>
                  <button className="reel-action-btn" onClick={() => handleCommentClick(reel)}>
                    <IoChatbubbleOutline />
                    <span>{reel.comments || 0}</span>
                  </button>
                  <button className="reel-action-btn" onClick={() => handleShareClick(reel)}>
                    <IoShareOutline />
                    <span>Share</span>
                  </button>
                  <button className="reel-action-btn" onClick={() => setMuted((value) => !value)}>
                    {muted ? <IoVolumeMuteOutline /> : <IoVolumeHighOutline />}
                    <span>{muted ? 'Muted' : 'Sound'}</span>
                  </button>
                </div>

                {index > 0 ? (
                  <button className="nav-arrow nav-up" onClick={goToPrevious} aria-label="Previous reel">
                    <IoChevronUpOutline />
                  </button>
                ) : null}
                {index < reels.length - 1 ? (
                  <button className="nav-arrow nav-down" onClick={goToNext} aria-label="Next reel">
                    <IoChevronDownOutline />
                  </button>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReelsPage;
