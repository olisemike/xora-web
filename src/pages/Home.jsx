import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { IoHeartOutline, IoHeart, IoChatbubbleOutline, IoShareOutline, IoBookmarkOutline, IoBookmark, IoEllipsisHorizontal } from 'react-icons/io5';
import AvatarPlaceholder from '../assets/avatar-placeholder.svg';
import PostMenu from '../components/PostMenu';
import AdPost from '../components/AdPost';
import PostMedia from '../components/PostMedia';
import { formatCount } from '../utils/engagement';
import './Home.css';

const Home = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPosts, setExpandedPosts] = useState(new Set());
  const [revealedSensitive, setRevealedSensitive] = useState(new Set());
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [_postsScrolled, _setPostsScrolled] = useState(0);
  const feedContainerRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { user, loading: authLoading, getCurrentUserId, isAuthenticated } = useAuth();
  const { posts, likedPosts, bookmarkedPosts, loadPosts, setPosts, updatePostLikeState, updatePostBookmarkState } = useAppData();
  const activeIdentity = { type: 'user', id: getCurrentUserId() };
  const deferredPosts = useDeferredValue(posts);

  const isStoryExpired = (story) => {
    if (!story?.expiresAt) return false;
    const expiresMs = typeof story.expiresAt === 'number'
      ? (story.expiresAt < 1e12 ? story.expiresAt * 1000 : story.expiresAt)
      : Date.parse(story.expiresAt);
    if (Number.isNaN(expiresMs)) return false;
    return expiresMs <= Date.now();
  };

  const getActorIdentity = () => {
    return { actorType: 'user', actorId: getCurrentUserId() };
  };

  // Helper to create a local share wrapper that the feed can render
  const createLocalShare = (originalPost) => {
    const sharedByName = user?.name || user?.username || 'You';
    const sharedByUsername = user?.username || 'you';
    const sharedByAvatar = user?.avatar_url || user?.avatar || AvatarPlaceholder;

    return {
      id: `share-${Date.now()}-${originalPost.id}`,
      sharedBy: {
        name: sharedByName,
        username: sharedByUsername,
        avatar: sharedByAvatar,
      },
      timestamp: new Date().toISOString(),
      original: originalPost,
    };
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    // Load initial posts
    loadPosts();
  }, [isAuthenticated, loadPosts]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadStories = async () => {
      // Don't load if not authenticated
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        let fetchedStories = [];
        try {
          fetchedStories = await api.getStoriesFeed();
        } catch (err) {
          // Ignore stories fetch errors
        }
        if (isMounted) {
          setStories((fetchedStories || []).filter((s) => !isStoryExpired(s)));
          setLoading(false);
        }
      } catch (error) {
        if (error.name !== 'AbortError' && isMounted) {
          toast.error('Failed to load stories');
          setLoading(false);
        }
      }
    };

    loadStories();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [toast, isAuthenticated]);

  useEffect(() => {
    if (!stories.length) return;
    const interval = setInterval(() => {
      setStories((prev) => prev.filter((s) => !isStoryExpired(s)));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [stories.length]);

  // Restore scroll position when component mounts if posts exist
  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem('home-feed-scroll');
    if (savedScrollPos && posts.length > 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(savedScrollPos, 10));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only restore once on mount; posts are persisted in context

  // Save scroll position when navigating away
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem('home-feed-scroll', window.scrollY.toString());
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        sessionStorage.setItem('home-feed-scroll', window.scrollY.toString());
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      sessionStorage.setItem('home-feed-scroll', window.scrollY.toString());
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const groupedStoriesList = useMemo(() => {
    const groupedStories = stories.reduce((acc, story) => {
      const userId = story?.user?.id || story?.user?.username || 'unknown';
      if (!acc[userId]) {
        acc[userId] = { latest: story, hasUnviewed: !story.viewedByMe };
        return acc;
      }

      const prev = acc[userId];
      const nextHasUnviewed = prev.hasUnviewed || !story.viewedByMe;
      const prevTime = prev.latest?.createdAt || 0;
      const nextTime = story?.createdAt || 0;
      acc[userId] = {
        latest: nextTime > prevTime ? story : prev.latest,
        hasUnviewed: nextHasUnviewed,
      };
      return acc;
    }, {});

    return Object.values(groupedStories)
      .map((group) => group.latest)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [stories]);

  const feedPosts = useMemo(() => deferredPosts || [], [deferredPosts]);

  const handleShare = async (post, e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info('Please log in to share posts');
      return;
    }

    const actorType = 'user';
    const actorId = getCurrentUserId();
    if (!actorId) {
      toast.error('Unable to determine your identity for sharing');
      return;
    }

    try {
      await api.sharePost(post.id, actorType, actorId);
      toast.success('Post shared');

      // Insert a local share wrapper at the top of the feed so the user sees it immediately
      const shared = createLocalShare(post);
      setPosts((prev) => [...prev, shared]);
    } catch (err) {
      toast.error('Failed to share post');
    }
  };

  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 22) return 'Good Evening';
    return 'Good Night';
  };

  const getIdentityName = () => {
    // If acting as a page, show the page name from activeIdentity.meta
    if (activeIdentity?.type === 'page' && activeIdentity.meta?.name) {
      return activeIdentity.meta.name;
    }
    // Fallback to user profile name
    return user?.name || 'there';
  };

  const MAX_WORDS = 300;

  const getTruncatedContent = (content, postId) => {
    if (!content) return '';
    const words = content.split(/\s+/);
    if (words.length <= MAX_WORDS || expandedPosts.has(postId)) {
      return content;
    }
    return `${words.slice(0, MAX_WORDS).join(' ')  }...`;
  };

  const toggleExpanded = (postId, e) => {
    e.stopPropagation();
    setExpandedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';

    // Handle both Unix seconds and milliseconds
    let ms = timestamp;
    if (typeof timestamp === 'number' && timestamp < 10000000000) {
      // Looks like seconds, convert to ms
      ms = timestamp * 1000;
    } else if (typeof timestamp === 'string') {
      ms = new Date(timestamp).getTime();
    }

    if (isNaN(ms) || ms <= 0) return '';

    const diff = Date.now() - ms;
    if (diff < 0) return 'just now';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleLike = async (postId, e) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.info('Please log in to like posts');
      return;
    }

    const actorType = activeIdentity?.type === 'page' ? 'page' : 'user';
    const actorId = actorType === 'page' ? activeIdentity?.id : getCurrentUserId();
    if (!actorId) {
      toast.error('Unable to determine your identity for likes');
      return;
    }

    // Get current like status from the computed likedPosts
    const currentlyLiked = likedPosts.has(String(postId));
    const nextLiked = !currentlyLiked;

    // Optimistic update via centralized state management
    updatePostLikeState(postId, nextLiked);

    try {
      await api.togglePostLike(postId, nextLiked, actorType, actorId);
      toast.success(nextLiked ? 'Post liked!' : 'Removed like');
    } catch (err) {
      // Revert on failure
      updatePostLikeState(postId, currentlyLiked);
      toast.error('Failed to update like');
    }
  };

  const handleBookmark = async (postId, e) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.info('Please log in to bookmark posts');
      return;
    }

    const isCurrentlyBookmarked = bookmarkedPosts.has(String(postId));
    const nextBookmarked = !isCurrentlyBookmarked;

    // Optimistic update via centralized state management
    updatePostBookmarkState(postId, nextBookmarked);

    try {
      await api.togglePostBookmark(postId, nextBookmarked);
      toast.success(nextBookmarked ? 'Added to bookmarks' : 'Removed from bookmarks');
    } catch (err) {
      // Revert on failure
      updatePostBookmarkState(postId, isCurrentlyBookmarked);
      toast.error('Failed to update bookmark');
    }
  };

  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`);
  };

  if (authLoading) {
    return (
      <div className="home-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container" ref={feedContainerRef}>
      <div className="home-header">
        <input 
          type="text" 
          placeholder="Search for people, posts, tags..."
          className="home-search"
          id="home-search"
          name="homeSearch"
          onFocus={() => navigate('/explore')}
        />
      </div>

      <div className="greeting">
        {getGreetingText()}, {getIdentityName()}.
      </div>

      {/* Stories */}
      {groupedStoriesList.length > 0 && (
        <div className="stories-section">
          {groupedStoriesList.map((story) => (
            <div
              key={story.id}
              className={`story-item ${story.viewedByMe ? 'viewed' : 'unviewed'}`}
              onClick={() => navigate(`/story/${story.user.username}`)}
            >
              <img
                src={story.image}
                alt={story.user?.name || 'Story'}
                className="story-image"
              />
              <div className="story-avatar">
                {story.user?.avatar ? (
                  <img src={story.user.avatar} alt={story.user?.name || 'User'} />
                ) : (
                  <img src={AvatarPlaceholder} alt="Default avatar" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posts Feed */}
      <div className="posts-feed">
        {!feedPosts.length ? (
          <div className="home-empty-state">
            <h3>Your feed is quiet right now.</h3>
            <p>Explore posts, follow people, or create the first post from this session.</p>
          </div>
        ) : null}
        {feedPosts.map((post, index) => {
          if (post?.isAd || post?.type === 'AD' || post?.adType) {
            return (
              <AdPost
                key={`ad-${post.id || index}`}
                adData={post}
              />
            );
          }

          const isShared = Boolean(post.sharedBy);
          const original = isShared ? post.original : post;
          const cardId = isShared ? original.id : post.id;
          const isLikedByMe = likedPosts.has(String(original.id));
          const { isSensitive } = original;
          const isCovered = isSensitive && !revealedSensitive.has(original.id);
          const mediaItems = Array.isArray(original.media) && original.media.length > 0
            ? original.media
            : (original.image ? [{ type: 'image', url: original.image }] : []);

          return (
            <div key={`post-group-${index}`}>
              {/* Regular post */}
              <div
                key={post.id}
                className="post-card"
                onClick={() => handlePostClick(cardId)}
              >
              {isShared ? <div className="shared-header">
                  <img
                    src={post.sharedBy.avatar || AvatarPlaceholder}
                    alt={post.sharedBy.name}
                    className="post-avatar"
                    onError={(e) => { e.target.src = AvatarPlaceholder; }}
                  />
                  <div className="post-user-info">
                    <span className="post-username">{post.sharedBy.name}</span>
                    <span className="post-time">shared â€¢ {formatTime(post.timestamp)}</span>
                  </div>
                </div> : null}

              <div className={isShared ? 'shared-original-card' : ''}>
                <div className="post-header">
                  {original.user?.avatar ? (
                    <img
                      src={original.user.avatar}
                      alt={original.user.name || 'User'}
                      className="post-avatar"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (original.user?.username) navigate(`/profile/${original.user.username}`);
                      }}
                    />
                  ) : (
                    <img
                      src={AvatarPlaceholder}
                      alt="Default avatar"
                      className="post-avatar"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (original.user?.username) navigate(`/profile/${original.user.username}`);
                      }}
                    />
                  )}
                  <div className="post-user-info">
                    <span className="post-username">{original.user?.name || 'Unknown User'}</span>
                    <span className="post-time">{formatTime(original.timestamp)}</span>
                  </div>
                  <button
                    className="post-menu-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPost(original);
                      setShowPostMenu(true);
                    }}
                    aria-label="Post options"
                  >
                    <IoEllipsisHorizontal />
                  </button>
                </div>

                {isCovered ? (
                  <div
                    className="post-content sensitive-overlay"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRevealedSensitive((prev) => {
                        const next = new Set(prev);
                        next.add(original.id);
                        return next;
                      });
                    }}
                  >
                    <strong>Sensitive content</strong>
                    <p>This post may contain sensitive content. Click to view.</p>
                  </div>
                ) : (
                  original.content && (
                    <div className="post-content">
                      {getTruncatedContent(original.content, original.id)}
                      {original.content &&
                        typeof original.content === 'string' &&
                        original.content.split(/\s+/).length > MAX_WORDS ? <button
                            className="read-more-btn"
                            onClick={(e) => toggleExpanded(original.id, e)}
                          >
                            {expandedPosts.has(original.id) ? 'Show less' : 'Read more'}
                          </button> : null}
                    </div>
                  )
                )}

                {!isCovered && mediaItems.length > 0 ? (
                  <PostMedia
                    media={mediaItems}
                    className="home-feed-media"                    autoPlayVideo={false}
                    allowInlineVideoPlayback
                    onMediaClick={(_index, mediaItem) => {
                      const mediaUrl = typeof mediaItem === 'string'
                        ? mediaItem
                        : (mediaItem?.url || mediaItem?.uri || '');
                      const mediaType = mediaItem?.type || (mediaUrl.includes('.mp4') ? 'video' : 'image');
                      if (mediaType !== 'video' && mediaType !== 'gif') {
                        handlePostClick(cardId);
                      }
                    }}
                  />
                ) : null}

                <div className="post-actions">
                  <button
                    className={`action-btn ${isLikedByMe ? 'liked' : ''}`}
                    onClick={(e) => handleLike(original.id, e)}
                  >
                    {isLikedByMe ? <IoHeart /> : <IoHeartOutline />}
                    <span>{formatCount(original.likes)}</span>
                  </button>
                  <button className="action-btn" onClick={(e) => {
                    e.stopPropagation();
                    handlePostClick(original.id);
                  }}>
                    <IoChatbubbleOutline />
                    <span>{formatCount(original.comments)}</span>
                  </button>
                  <button className="action-btn" onClick={(e) => handleShare(original, e)}>
                    <IoShareOutline />
                    <span>{formatCount(original.shares)}</span>
                  </button>
                  <button
                    className={`action-btn action-btn-bookmark ${bookmarkedPosts.has(original.id) ? 'bookmarked' : ''}`}
                    onClick={(e) => handleBookmark(original.id, e)}
                  >
                    {bookmarkedPosts.has(original.id) ? <IoBookmark /> : <IoBookmarkOutline />}
                  </button>
                </div>
              </div>
            </div>
            </div>
          );
        })}
      </div>

      <PostMenu
        visible={showPostMenu}
        onClose={() => {
          setShowPostMenu(false);
          setSelectedPost(null);
        }}
        post={selectedPost}
        onDelete={(postId) => {
          setPosts((prev) => prev.filter(p => p.id !== postId && p.original?.id !== postId));
        }}
        onEdit={(post) => {
          if (!post?.id) return;
          navigate(`/create?edit=${post.id}`);
        }}
      />
    </div>
  );
};

export default Home;






