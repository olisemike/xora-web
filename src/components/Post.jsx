import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoHeart, IoHeartOutline, IoChatbubbleOutline, IoShareOutline, IoBookmarkOutline, IoBookmark } from 'react-icons/io5';
import { useToast } from './Toast';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatCount } from '../utils/engagement';
import PostMedia from './PostMedia';
import './Post.css';

const Post = ({ post }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated, getCurrentUserId } = useAuth();

  // Function to parse mentions and hashtags in text
  const parseContent = (text) => {
    if (!text) return null;
    
    // Split by spaces and process each word
    const parts = text.split(/(\s+)/);
    
    return parts.map((part, index) => {
      // Check for @mentions
      if (part.startsWith('@') && part.length > 1) {
        const username = part.slice(1);
        return (
          <Link 
            key={index} 
            to={`/profile/${username}`} 
            className="mention-link"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      
      // Check for #hashtags
      if (part.startsWith('#') && part.length > 1) {
        const hashtag = part.slice(1);
        return (
          <Link 
            key={index} 
            to={`/hashtag/${hashtag}`} 
            className="hashtag-link"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      
      return part;
    });
  };

  const [liked, setLiked] = React.useState(Boolean(post?.liked_by_me) || Boolean(post?.isLiked) || Boolean(post?.is_liked) || false);
  const [likes, setLikes] = React.useState(post.likes || 0);
  const [commentsCount, setCommentsCount] = React.useState(post.comments || 0);
  const [bookmarked, setBookmarked] = React.useState(Boolean(post?.isBookmarked) || Boolean(post?.bookmarked_by_me) || false);
  const [shares, setShares] = React.useState(post.shares || 0);

  // Update liked and bookmarked state if post data changes (e.g., from backend refresh or navigation back to feed)
  React.useEffect(() => {
    setLiked(Boolean(post?.liked_by_me) || Boolean(post?.isLiked) || Boolean(post?.is_liked) || false);
    setLikes(post.likes || 0);
    setCommentsCount(post.comments || 0);
    setBookmarked(Boolean(post?.isBookmarked) || Boolean(post?.bookmarked_by_me) || false);
    setShares(post.shares || 0);
  }, [post?.id, post?.liked_by_me, post?.isLiked, post?.is_liked, post?.likes, post?.comments, post?.isBookmarked, post?.bookmarked_by_me, post?.shares]);

  React.useEffect(() => {
    const handleEngagementUpdate = (event) => {
      const { postId, counts } = event.detail || {};
      if (!postId || String(postId) !== String(post.id)) return;

      if (counts?.likesCount !== undefined) {
        setLikes(counts.likesCount);
      }
      if (counts?.commentsCount !== undefined) {
        setCommentsCount(counts.commentsCount);
      }
      if (counts?.sharesCount !== undefined) {
        setShares(counts.sharesCount);
      }
    };

    window.addEventListener('engagement-update', handleEngagementUpdate);
    return () => window.removeEventListener('engagement-update', handleEngagementUpdate);
  }, [post?.id]);

  // Check if this is imported/curated content
  const isImportedContent = post.imported_from || post.external_source || post.platform ||
    (post.user?.username && post.user.username.includes('_imported_'));
  const importPlatform = post.imported_from || post.platform;

  // Use generic label for imported content
  const importLabel = isImportedContent ? (importPlatform || 'imported') : null;

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to like posts');
      return;
    }

    const wasLiked = liked;
    const prevLikes = likes;

    // Optimistic update
    setLiked(!wasLiked);
    setLikes(wasLiked ? prevLikes - 1 : prevLikes + 1);

    try {
      if (wasLiked) {
        await api.unlikePost(post.id);
      } else {
        await api.likePost(post.id);
      }
    } catch (error) {
      // Revert optimistic update on error
      setLiked(wasLiked);
      setLikes(prevLikes);
      toast.error(error.message || 'Failed to update like');
    }
  };

  const handleComment = (e) => {
    e.stopPropagation();
    // Disable comment navigation for imported/curated content
    if (isImportedContent) {
      return;
    }
    // Navigate to post detail page where users can view/add comments
    navigate(`/post/${post.id}`);
  };

  const handleShare = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to share posts');
      return;
    }

    try {
      // Copy post URL to clipboard
      const postUrl = `${window.location.origin}/post/${post.id}`;
      await navigator.clipboard.writeText(postUrl);

      // Also create a share record on the backend
      const userId = getCurrentUserId();
      if (userId) {
        await api.sharePost(post.id, 'user', userId);
      }

      // Optimistic update for share count
      setShares(prev => prev + 1);

      toast.success('Post link copied to clipboard!');
    } catch (error) {
      toast.error(error.message || 'Failed to share post');
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to bookmark posts');
      return;
    }

    const wasBookmarked = bookmarked;
    const postIdToBookmark = post.isShare ? post.originalId : post.id;

    // Optimistic update
    setBookmarked(!wasBookmarked);

    try {
      if (wasBookmarked) {
        await api.unbookmarkPost(postIdToBookmark);
        toast.success('Post removed from bookmarks');
      } else {
        await api.bookmarkPost(postIdToBookmark);
        toast.success('Post added to bookmarks');
      }
    } catch (error) {
      // Revert optimistic update on error
      setBookmarked(wasBookmarked);
      toast.error(error.message || 'Failed to update bookmark');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';

    // Handle both Unix seconds and milliseconds
    let ms = timestamp;
    if (typeof timestamp === 'number' && timestamp < 10000000000) {
      ms = timestamp * 1000;
    } else if (typeof timestamp === 'string') {
      ms = new Date(timestamp).getTime();
    } else if (typeof timestamp === 'number') {
      ms = timestamp;
    }

    if (isNaN(ms) || ms <= 0) return '';

    const diff = Math.floor((Date.now() - ms) / 1000);
    if (diff < 0) return 'now';

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const handleProfileClick = (e) => {
    // Disable profile navigation for imported content
    if (isImportedContent) {
      e.preventDefault();
      return false;
    }
  };

  const handlePostClick = (e) => {
    // Disable post navigation for imported content
    if (isImportedContent) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Navigate to post detail
    navigate(`/post/${post.id}`);
  };

  return (
    <div className={`post ${isImportedContent ? 'curated-post' : ''}`} onClick={handlePostClick}>
      <div className="post-header">
        <Link 
          to={isImportedContent ? '#' : `/profile/${post.user?.username || 'user'}`} 
          className={`post-user ${isImportedContent ? 'disabled-profile' : ''}`}
          onClick={handleProfileClick}
        >
          <div className="post-avatar">
            {post.user?.avatar ? (
              <img src={post.user.avatar} alt={post.user.name || 'User'} />
            ) : (
              <div className="avatar-placeholder">
                {(post.user?.name || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="post-user-info">
            <div className="post-user-name-row">
              <span className={`post-name ${isImportedContent ? 'imported-name' : ''}`}>
                {post.user?.name || 'User'}
              </span>
              {isImportedContent ? <span className="import-badge">
                  {importLabel === 'imported' ? 'curated' : importLabel}
                </span> : null}
            </div>
            <span className="post-username">@{post.user?.username || 'username'}</span>
          </div>
        </Link>
        <span className="post-time">{formatTime(post.createdAt || Date.now())}</span>
      </div>

      <div className="post-content">
        <p>{parseContent(post.content)}</p>
        <PostMedia
          media={post.media}
          onMediaClick={(index) => {
            if (!isImportedContent) {
              navigate(`/post/${post.id}`);
            }
          }}
        />
      </div>

      <div className="post-actions">
        <button className="post-action" onClick={handleLike}>
          {liked ? <IoHeart className="icon-filled" /> : <IoHeartOutline />}
                  <span>{formatCount(likes)}</span>
        </button>
        <button className="post-action" onClick={handleComment}>
          <IoChatbubbleOutline />
                  <span>{formatCount(commentsCount)}</span>
        </button>
        <button className="post-action" onClick={handleShare}>
          <IoShareOutline />
                  <span>{formatCount(shares)}</span>
        </button>
        <button className="post-action" onClick={handleBookmark}>
          {bookmarked ? <IoBookmark className="icon-filled" /> : <IoBookmarkOutline />}
        </button>
      </div>
    </div>
  );
};

export default Post;





