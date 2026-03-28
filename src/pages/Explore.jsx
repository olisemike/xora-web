import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { IoChatbubbleOutline } from 'react-icons/io5';
import { useToast } from '../components/Toast';
import { formatCount } from '../utils/engagement';
import AvatarPlaceholder from '../assets/avatar-placeholder.svg';
import './Explore.css';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import PostMedia from '../components/PostMedia';

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null); // { users, posts, hashtags, pages }
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAuthenticated, loading: authLoading, getCurrentUserId } = useAuth();
  const { posts, likedPosts, bookmarkedPosts, loading, updatePostLikeState, updatePostBookmarkState } = useAppData();
  const { latestPostAction } = useWebSocket();
  const activeIdentity = { type: 'user', id: user?.id, ...user };
  const feedContainerRef = useRef(null);

  const filters = ['All', 'Profiles', 'Photos', 'Videos', 'Text', 'Links', 'Tags'];

  // Listen for real-time post updates
  useEffect(() => {
    if (!latestPostAction) return;
    const { action, post } = latestPostAction;
    if (action === 'created') {
      console.log('[Explore] New post created in real-time:', post.id);
    }
  }, [latestPostAction]);

  // Restore scroll position when component mounts if posts exist
  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem('explore-feed-scroll');
    if (savedScrollPos && posts.length > 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(savedScrollPos, 10));
      });
    }
  }, []);

  // Save scroll position when navigating away
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem('explore-feed-scroll', window.scrollY.toString());
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        sessionStorage.setItem('explore-feed-scroll', window.scrollY.toString());
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      sessionStorage.setItem('explore-feed-scroll', window.scrollY.toString());
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Trigger backend search when the query changes
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      // Empty query: show default feed and clear search results
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await api.searchAll(trimmed);
        if (!cancelled) {
          setSearchResults(results);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchResults({ users: [], posts: [], hashtags: [], pages: [] });
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 400); // small debounce so we don't spam the backend

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  // Don't render anything while auth is loading
  if (authLoading) {
    return null;
  }

  const handleCardClick = (postId) => {
    navigate(`/post/${postId}`);
  };

  const handleLike = async (postId, e) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.info('Please log in to like posts');
      return;
    }

    const actorType = 'user';
    const actorId = getCurrentUserId();
    if (!actorId) {
      toast.error('Unable to determine your identity for likes');
      return;
    }

    const currentlyLiked = likedPosts.has(String(postId));
    const nextLiked = !currentlyLiked;

    // Optimistic via centralized state
    updatePostLikeState(postId, nextLiked);

    try {
      await api.togglePostLike(postId, nextLiked, actorType, actorId);
      toast.success(nextLiked ? 'Post liked!' : 'Removed like');
    } catch (error) {
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

    const isBookmarked = bookmarkedPosts.has(String(postId));
    const nextBookmarked = !isBookmarked;

    // Optimistic via centralized state
    updatePostBookmarkState(postId, nextBookmarked);

    try {
      await api.togglePostBookmark(postId, nextBookmarked);
      toast.success(nextBookmarked ? 'Added to bookmarks' : 'Removed from bookmarks');
    } catch (error) {
      updatePostBookmarkState(postId, isBookmarked);
      toast.error('Failed to update bookmark');
    }
  };

  const handleComment = (postId, e) => {
    e.stopPropagation();
    navigate(`/post/${postId}`);
  };

  const isSearching = Boolean(searchQuery.trim());
  const postList = isSearching && searchResults ? searchResults.posts || [] : posts;

  if (authLoading) {
    return (
      <div className="explore-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (loading && !isSearching) {
    return (
      <div className="explore-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="explore-container" ref={feedContainerRef}>
      <div className="explore-header">
        <input 
          id="explore-search"
          name="exploreSearch"
          type="text" 
          placeholder="Search for people, posts, tags..."
          className="explore-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="filter-tabs">
        {filters.map((filter) => (
          <button
            key={filter}
            className={`filter-tab ${activeFilter === filter ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {isSearching && searchLoading ? <div className="loading-spinner">
          <div className="spinner"></div>
        </div> : null}

      {isSearching && searchResults && (searchResults.users?.length > 0) ? <div className="search-section">
          <h3 className="section-title">People</h3>
          <div className="users-list">
            {searchResults.users.map((user) => (
              <div
                key={user.id}
                className="user-row"
                onClick={() => {
                  if (user.username) {
                    navigate(`/profile/${user.username}`);
                  }
                }}
              >
                <img
                  src={user.avatar || AvatarPlaceholder}
                  alt={user.name || user.username || 'User'}
                  className="user-avatar"
                />
                <div className="user-info">
                  <div className="user-name">{user.name || user.username}</div>
                  {user.username ? <div className="user-username">@{user.username}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </div> : null}

      {postList.length === 0 ? (
        <div className="no-results">
          <h3>No results found.</h3>
        </div>
      ) : (
        <>
          <h3 className="section-title">
            {isSearching ? 'Posts' : 'Explore'}
          </h3>
          <div className="posts-grid">
            {postList.map((post) => (
              <div 
                key={post.id} 
                className="explore-post-card"
                onClick={() => handleCardClick(post.id)}
              >
                <div className="post-header">
                  {post.user?.avatar ? (
                    <img
                      src={post.user.avatar}
                      alt={post.user?.name || 'User'}
                      className="post-avatar"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (post.user?.username) {
                          navigate(`/profile/${post.user.username}`);
                        }
                      }}
                    />
                  ) : (
                    <img
                      src={AvatarPlaceholder}
                      alt="Default avatar"
                      className="post-avatar"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (post.user?.username) {
                          navigate(`/profile/${post.user.username}`);
                        }
                      }}
                    />
                  )}
                  <div className="post-user-info">
                    <span className="post-username">{post.user?.name || 'Unknown User'}</span>
                  </div>
                </div>

                {post.content && typeof post.content === 'string' ? <div className="post-content">
                    {post.content.length > 150
                      ? `${post.content.substring(0, 150)}...`
                      : post.content}
                  </div> : null}

                {(() => {
                  const mediaItems = Array.isArray(post.media) && post.media.length > 0
                    ? post.media
                    : (post.image ? [{ type: 'image', url: post.image }] : []);
                  if (mediaItems.length === 0) return null;
                  return (
                    <PostMedia
                      media={mediaItems}
                      autoPlayVideo={false}
                      allowInlineVideoPlayback
                      onMediaClick={(_index, mediaItem) => {
                        const mediaUrl = typeof mediaItem === 'string'
                          ? mediaItem
                          : (mediaItem?.url || mediaItem?.uri || '');
                        const mediaType = mediaItem?.type || (mediaUrl.includes('.mp4') ? 'video' : 'image');
                        if (mediaType !== 'video' && mediaType !== 'gif') {
                          handleCardClick(post.id);
                        }
                      }}
                    />
                  );
                })()}

                <div className="post-actions">
                  <button 
                    className="action-btn"
                    onClick={(e) => handleComment(post.id, e)}
                  >
                    <IoChatbubbleOutline />
                    <span>{formatCount(post.comments)}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Explore;





