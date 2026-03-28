import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { IoHeartOutline, IoChatbubbleOutline, IoShareOutline, IoBookmarkOutline, IoHeart, IoBookmark, IoArrowBack } from 'react-icons/io5';
import { useToast } from '../components/Toast';
import { formatCount } from '../utils/engagement';
import AvatarPlaceholder from '../assets/avatar-placeholder.svg';
import './Explore.css';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { useWebSocket } from '../contexts/WebSocketContext';

const Trending = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAuthenticated, getCurrentUserId } = useAuth();
  const { posts, likedPosts, bookmarkedPosts, loading, updatePostLikeState, updatePostBookmarkState } = useAppData();
  const { latestPostAction } = useWebSocket();
  const activeIdentity = { type: 'user', id: user?.id, ...user };
  const feedContainerRef = useRef(null);

  // Listen for real-time post updates
  useEffect(() => {
    if (!latestPostAction) return;
    const { action, post } = latestPostAction;
    if (action === 'created') {
      console.log('[Trending] New post created in real-time:', post.id);
    }
  }, [latestPostAction]);

  // Restore scroll position when component mounts if posts exist
  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem('trending-feed-scroll');
    if (savedScrollPos && posts.length > 0) {
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(savedScrollPos, 10));
      });
    }
  }, []);

  // Save scroll position when navigating away
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem('trending-feed-scroll', window.scrollY.toString());
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        sessionStorage.setItem('trending-feed-scroll', window.scrollY.toString());
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      sessionStorage.setItem('trending-feed-scroll', window.scrollY.toString());
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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

  const handleShare = async (post, e) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please log in to share');
      return;
    }

    const actorId = getCurrentUserId();
    if (!actorId) {
      toast.error('Unable to determine your identity');
      return;
    }

    try {
      await api.sharePost(post.id, 'user', actorId);
      toast.success('Post shared to your profile!');
    } catch (error) {
      toast.error('Failed to share post');
    }
  };

  if (loading) {
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
      <div className="explore-header" style={{ marginBottom: '20px' }}>
        <button 
          className="back-to-explore-btn"
          onClick={(e) => {
            e.preventDefault();navigate('/explore');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--primary)',
            border: 'none',
            color: '#fff',
            fontSize: '16px',
            cursor: 'pointer',
            padding: '12px 20px',
            borderRadius: '8px',
            transition: 'all 0.2s',
            fontWeight: '600',
          }}
        >
          <IoArrowBack size={20} />
          <span>Back to Explore</span>
        </button>
      </div>

      {posts.length === 0 ? (
        <div className="no-results">
          <h3>No trending posts available.</h3>
        </div>
      ) : (
        <div className="posts-grid">
          {posts.map((post) => (
            <div key={post.id} className="post-card" onClick={() => navigate(`/post/${post.id}`)}>
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

              {post.image ? <img src={post.image} alt="Post" className="post-image" /> : null}

              <div className="post-actions">
                <button
                  className="action-btn"
                  onClick={(e) => handleLike(post.id, e)}
                >
                  {likedPosts.has(post.id) ? <IoHeart className="liked" /> : <IoHeartOutline />}
                  <span>{formatCount(post.likes)}</span>
                </button>
                <button
                  className="action-btn"
                  onClick={(e) => handleComment(post.id, e)}
                >
                  <IoChatbubbleOutline />
                  <span>{formatCount(post.comments)}</span>
                </button>
                <button
                  className="action-btn"
                  onClick={(e) => handleShare(post, e)}
                >
                  <IoShareOutline />
                  <span>{formatCount(post.shares)}</span>
                </button>
                <button
                  className="action-btn bookmark-btn"
                  onClick={(e) => handleBookmark(post.id, e)}
                >
                  {bookmarkedPosts.has(post.id) ? <IoBookmark className="bookmarked" /> : <IoBookmarkOutline />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Trending;





