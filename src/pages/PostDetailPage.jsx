import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  IoArrowBack, IoHeart, IoHeartOutline, IoChatbubbleOutline, 
  IoShareOutline, IoBookmarkOutline, IoSendOutline 
} from 'react-icons/io5';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { formatCount } from '../utils/engagement';
import './PostDetailPage.css';

const PostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAuthenticated, getCurrentUserId } = useAuth();
  const activeIdentity = { type: 'user', id: user?.id, ...user };

  const getActorIdentity = useCallback(() => {
    return { actorType: 'user', actorId: getCurrentUserId() };
  }, [getCurrentUserId]);

  const [post, setPost] = useState(null);
  const [liked, setLiked] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsCount, setCommentsCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const postId = id;
        const { actorType, actorId } = getActorIdentity();
        const [p, cs] = await Promise.all([
          api.getPost(postId, actorType, actorId),
          isAuthenticated ? api.getPostComments(postId) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setPost(p);
        setComments(cs || []);
        setCommentsCount(p?.comments ?? (cs || []).length);
        setSharesCount(p?.shares ?? 0);
        setLiked(Boolean(p?.liked_by_me) || Boolean(p?.isLiked));
      } catch (e) {
        if (!cancelled) {
          toast.error('Failed to load post');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, toast, isAuthenticated, activeIdentity?.id, activeIdentity?.type, getCurrentUserId, getActorIdentity]);

  useEffect(() => {
    const handleEngagementUpdate = (event) => {
      const { postId: updatedPostId, engagementType, counts } = event.detail || {};
      if (!post || String(updatedPostId) !== String(post.id)) return;

      if (engagementType === 'deleted') {
        setPost(null);
        setComments([]);
        setCommentsCount(0);
        setSharesCount(0);
        return;
      }

      if (counts?.commentsCount !== undefined) setCommentsCount(counts.commentsCount);
      if (counts?.sharesCount !== undefined) setSharesCount(counts.sharesCount);

      setPost((prev) => prev
        ? { ...prev, comments: counts?.commentsCount ?? prev.comments, shares: counts?.sharesCount ?? prev.shares, likes: counts?.likesCount ?? prev.likes }
        : prev);
    };

    window.addEventListener('engagement-update', handleEngagementUpdate);
    return () => window.removeEventListener('engagement-update', handleEngagementUpdate);
  }, [post]);

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

  const handleComment = async (e) => {
    e.preventDefault();
    const text = comment.trim();
    if (!text || !post) return;
    if (!isAuthenticated) {
      toast.info('Please log in to comment');
      return;
    }

    const actorType = activeIdentity?.type === 'page' ? 'page' : 'user';
    const actorId = actorType === 'page' ? activeIdentity?.id : getCurrentUserId();
    if (!actorId) {
      toast.error('Unable to determine your identity for commenting');
      return;
    }

    try {
      const created = await api.addComment(post.id, text, actorType, actorId);
      setComments((prev) => [
        {
          id: created.id,
          user: {
            name: created.authorName,
            username: created.authorUsername,
            avatar: null,
          },
          content: created.text,
          likes: created.likes || 0,
          createdAt: created.createdAt,
        },
        ...prev,
      ]);
      setComment('');
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  if (loading) {
    return (
      <div className="post-detail-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detail-page">
        <div className="post-detail-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <IoArrowBack />
          </button>
          <h2>Post</h2>
        </div>
        <div className="post-detail-container">
          <p>Post not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="post-detail-page">
      <div className="post-detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h2>Post</h2>
      </div>

      <div className="post-detail-container">
        <div className="post-detail-main">
          <div className="post-detail-card">
            <div className="post-user">
              <div className="post-avatar">
                {post.user?.avatar ? (
                  <img src={post.user.avatar} alt={post.user?.name || 'User'} />
                ) : (
                  <div className="avatar-placeholder">{post.user?.name?.[0] || '?'}</div>
                )}
              </div>
              <div className="post-user-info">
                <span className="post-name">{post.user?.name || 'Unknown'}</span>
                <span className="post-username">@{post.user?.username || 'unknown'}</span>
              </div>
              <span className="post-time">{formatTime(post.timestamp || post.createdAt)}</span>
            </div>

            <div className="post-content">
              <p>{post.content}</p>
              {post.media && post.media.length > 0 ? <div className="post-media">
                  {post.media.map((item, index) => (
                    <img key={`${post.id}-media-${index}`} src={item.url} alt="Post media" />
                  ))}
                </div> : null}
            </div>

            <div className="post-actions">
              <button className="post-action" onClick={() => setLiked(!liked)}>
                {liked ? <IoHeart className="icon-filled" /> : <IoHeartOutline />}
                <span>{formatCount(post.likes)}</span>
              </button>
              <button className="post-action">
                <IoChatbubbleOutline />
                <span>{formatCount(commentsCount)}</span>
              </button>
              <button className="post-action">
                <IoShareOutline />
                <span>{formatCount(sharesCount)}</span>
              </button>
              <button className="post-action">
                <IoBookmarkOutline />
              </button>
            </div>
          </div>

          <div className="comments-wrapper">
            <h3 className="comments-title">Comments ({formatCount(commentsCount)})</h3>
            
            <form className="comment-input-form" onSubmit={handleComment}>
              <div className="comment-input-avatar">
                <div className="avatar-placeholder">U</div>
              </div>
              <input
                id="comment-input"
                name="comment"
                type="text"
                className="comment-input"
                placeholder="Write a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                aria-label="Write a comment"
              />
              <button type="submit" className="comment-send-btn" disabled={!comment.trim()}>
                <IoSendOutline />
              </button>
            </form>

            <div className="comments-list">
              {comments.map((c) => (
                <div key={c.id} className="comment-item">
                  <div className="comment-avatar">
                    {c.user?.avatar ? (
                      <img src={c.user.avatar} alt={c.user?.name || 'User'} />
                    ) : (
                      <div className="avatar-placeholder">{(c.user?.name || 'U')[0]}</div>
                    )}
                  </div>
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-name">{c.user?.name || 'User'}</span>
                      <span className="comment-username">@{c.user?.username || 'user'}</span>
                      <span className="comment-time">{formatTime(c.createdAt)}</span>
                    </div>
                    <p className="comment-text">{c.content}</p>
                    <div className="comment-actions">
                      <button className="comment-reply-btn">Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailPage;





