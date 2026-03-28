import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { IoArrowBack, IoHeartOutline, IoChatbubbleOutline, IoShareOutline, IoBookmarkOutline, IoChevronBack, IoChevronForward, IoSendSharp, IoHeart, IoTrashOutline, IoImageOutline, IoClose, IoPlay } from 'react-icons/io5';
import { useToast } from '../components/Toast';
import { api, getCloudflareImageUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatCount } from '../utils/engagement';
import AvatarPlaceholder from '../assets/avatar-placeholder.svg';
import './PostDetail.css';

// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const API_URL = import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api';

const PostDetail = () => {
  const { id: postId } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isDetailVideoPlaying, setIsDetailVideoPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [sharesCount, setSharesCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [commentMedia, setCommentMedia] = useState([]);
  const [deletingCommentMediaIndex, setDeletingCommentMediaIndex] = useState(null); // Track which comment media is being deleted
  const commentFileInputRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const { user, isAuthenticated, getCurrentUserId } = useAuth();
  const activeIdentity = { type: 'user', id: getCurrentUserId() };

  const getActorIdentity = useCallback(() => {
    return { actorType: 'user', actorId: getCurrentUserId() };
  }, [getCurrentUserId]);

  const normalizeComment = (c) => {
    if (!c) return null;
    const createdAtMs = c.created_at ? c.created_at * 1000 : Date.now();
    return {
      id: c.id,
      userId: c.actor_id,
      actorType: c.actor_type || c.actorType || 'user',
      userName: c.actor_name || c.username || c.actor_username || 'User',
      userAvatar: c.avatar_url || null,
      text: c.content,
      likes: c.likes_count ?? 0,
      timestamp: new Date(createdAtMs).toLocaleString(),
    };
  };

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
            key={`mention-${username}`}
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
            key={`hashtag-${hashtag}`}
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
  const loadPost = useCallback(async () => {
    if (!postId) {
      return;
    }
    setLoading(true);
    try {
      const { actorType, actorId } = getActorIdentity();
      const mappedPost = await api.getPost(postId, actorType, actorId);

      const commentsRes = await fetch(`${API_URL}/posts/${encodeURIComponent(postId)}/comments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const commentsData = await commentsRes.json();
      if (!commentsRes.ok || !commentsData?.success) {
        throw new Error(commentsData?.error?.message || `Failed to load comments: ${commentsRes.status}`);
      }
      const mappedComments = (commentsData.data?.comments || [])
        .map(normalizeComment)
        .filter(Boolean);

      setPost(mappedPost);
      setComments(mappedComments);
      setLikeCount(mappedPost.likes);
      setCommentsCount(mappedPost.commentsCount || mappedComments.length || 0);
      setSharesCount(mappedPost.shares || 0);
      setLiked(mappedPost.isLiked);
      setBookmarked(mappedPost.isBookmarked);
    } catch (err) {
      setPost(null);
      setComments([]);
      setCommentsCount(0);
      setSharesCount(0);
    } finally {
      setLoading(false);
    }
  }, [postId, getActorIdentity]);

  useEffect(() => {
    const handleEngagementUpdate = (event) => {
      const { postId: updatedPostId, engagementType, counts } = event.detail || {};
      if (!post || String(updatedPostId) !== String(post.id)) return;

      if (engagementType === 'deleted') {
        setPost(null);
        setComments([]);
        setCommentsCount(0);
        setSharesCount(0);
        setLikeCount(0);
        return;
      }

      if (counts?.likesCount !== undefined) setLikeCount(counts.likesCount);
      if (counts?.commentsCount !== undefined) setCommentsCount(counts.commentsCount);
      if (counts?.sharesCount !== undefined) setSharesCount(counts.sharesCount);

      setPost((prev) => prev
        ? { ...prev, likes: counts?.likesCount ?? prev.likes, comments: counts?.commentsCount ?? prev.comments, shares: counts?.sharesCount ?? prev.shares }
        : prev);
    };

    window.addEventListener('engagement-update', handleEngagementUpdate);
    return () => window.removeEventListener('engagement-update', handleEngagementUpdate);
  }, [post]);

  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }
    loadPost();
  }, [postId, loadPost]);

  const MAX_COMMENT_WORDS = 300;

  const getTruncatedComment = (text, id) => {
    if (!text) return '';
    const words = text.split(/\s+/);
    const truncatedText = words.length <= MAX_COMMENT_WORDS || expandedComments.has(id)
      ? text
      : `${words.slice(0, MAX_COMMENT_WORDS).join(' ')  }...`;
    return parseContent(truncatedText);
  };

  const toggleExpandedComment = (id) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCommentMediaUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newMedia = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name
    }));
    setCommentMedia(prev => [...prev, ...newMedia]);
  };

  const removeCommentMedia = async (index) => {
    // Start deletion animation: set loading state
    setDeletingCommentMediaIndex(index);
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 300));
    // Remove from list and revoke object URL
    setCommentMedia(prev => {
      const removed = prev[index];
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
    // Clear loading state
    setDeletingCommentMediaIndex(null);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() && commentMedia.length === 0) return;
    if (!post) return;

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

    const content = newComment.trim();
    setNewComment('');

    // Upload media if present
    let uploadedMediaUrls = null;
    if (commentMedia.length > 0) {
      uploadedMediaUrls = [];

      // Process all media uploads in parallel
      const uploadPromises = commentMedia.map(async (item) => {
        // Get signed upload URL using the correct /media/* endpoint
const uploadUrlData = await api.getImageUploadURL();

        if (!uploadUrlData || !uploadUrlData.uploadURL) {
          throw new Error('Failed to get upload URL');
        }
        const { uploadURL: uploadUrl, id, deliveryUrl } = uploadUrlData;

        // Upload to signed URL
        const formData = new FormData();
        formData.append('file', item.file);
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });
        if (!uploadResponse.ok) {
          throw new Error(`Upload failed (${uploadResponse.status})`);
        }
        let uploadResult = null;
        try {
          uploadResult = await uploadResponse.json();
        } catch {
          uploadResult = null;
        }
        const finalUrl =
          uploadResult.result?.url ||
          uploadResult.result?.variants?.[0] ||
          deliveryUrl ||
          (id ? getCloudflareImageUrl(id) : null);

        if (!finalUrl) {
          throw new Error('Failed to get uploaded image URL');
        }

        return { type: 'image', url: finalUrl, name: item.name, cloudflareId: id };
      });

      // Wait for all uploads to complete
      try {
        const uploadResults = await Promise.allSettled(uploadPromises);

        // Collect successful uploads
        uploadResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            uploadedMediaUrls.push(result.value);
          }
        });

        // Check if any uploads failed
        const failedUploads = uploadResults.filter(result => result.status === 'rejected');
        if (failedUploads.length > 0) {
          toast.error('Some media uploads failed');
        }
      } catch (err) {
        toast.error('Failed to upload media');
        return;
      }
    }

    try {
        const created = await api.addComment(post.id, content, actorType, actorId, uploadedMediaUrls);
      const normalized = normalizeComment(created);
      if (normalized) {
        setComments((prev) => [...prev, normalized]);
      } else {
        // Fallback: reload comments if we could not normalize the response
        loadPost();
      }
      setCommentMedia([]);
      // Clean up preview URLs
      commentMedia.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  const nextMedia = () => {
    if (!post?.media?.length) return;
    setCurrentMediaIndex((prev) => (prev + 1) % post.media.length);
  };

  const prevMedia = () => {
    if (!post?.media?.length) return;
    setCurrentMediaIndex((prev) => (prev - 1 + post.media.length) % post.media.length);
  };

  useEffect(() => {
    setIsDetailVideoPlaying(false);
  }, [currentMediaIndex, postId]);

  const currentMedia = post?.media?.[currentMediaIndex] || null;
  const isCurrentVideo = currentMedia?.type === 'video' || currentMedia?.type === 'gif';
  const currentMediaPoster = currentMedia?.poster || currentMedia?.thumbnail || '';

  const handlePlayCurrentMedia = (e) => {
    e.stopPropagation();
    setIsDetailVideoPlaying(true);
  };

  const handleSelectMedia = (index) => {
    setCurrentMediaIndex(index);
    setIsDetailVideoPlaying(false);
  };

  const handleNextMedia = (e) => {
    e?.stopPropagation?.();
    nextMedia();
    setIsDetailVideoPlaying(false);
  };

  const handlePrevMedia = (e) => {
    e?.stopPropagation?.();
    prevMedia();
    setIsDetailVideoPlaying(false);
  };

  const handleDetailVideoEnded = () => {
    setIsDetailVideoPlaying(false);
  };

  const handleDetailVideoPause = (event) => {
    const video = event.currentTarget;
    if (video.ended || video.currentTime === 0) {
      setIsDetailVideoPlaying(false);
    }
  };
  const handleLike = async () => {
    if (!post) return;

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

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((prev) => prev + (nextLiked ? 1 : -1));

    try {
      await api.togglePostLike(post.id, nextLiked, actorType, actorId);
    } catch (err) {
      // Revert optimistic update
      setLiked(!nextLiked);
      setLikeCount((prev) => prev + (nextLiked ? -1 : 1));
      toast.error('Failed to update like');
    }
  };

  const handleShare = async () => {
    if (!post) return;

    if (!isAuthenticated) {
      toast.info('Please log in to share posts');
      return;
    }

    const actorType = activeIdentity?.type === 'page' ? 'page' : 'user';
    const actorId = actorType === 'page' ? activeIdentity?.id : getCurrentUserId();
    if (!actorId) {
      toast.error('Unable to determine your identity for sharing');
      return;
    }

    try {
      await api.sharePost(post.id, actorType, actorId);
      toast.success('Post shared to your feed');
    } catch (err) {
      toast.error('Failed to share post');
    }
  };

  if (loading) {
    return (
      <div className="post-detail-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detail-container">
        <div className="post-detail-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <IoArrowBack />
          </button>
          <h2>Post</h2>
          <div></div>
        </div>
        <div className="post-detail-content">
          <p>Post not found.</p>
        </div>
      </div>
    );
  }
  const isOwnPost = post && activeIdentity && post.actorType && post.actorId && (
    (post.actorType === 'user' && activeIdentity.type === 'user' && String(post.actorId) === String(getCurrentUserId())) ||
    (post.actorType === 'page' && activeIdentity.type === 'page' && String(post.actorId) === String(activeIdentity.id))
  );

  const handleActorClick = () => {
    if (!post) return;
    if (post.actorType === 'page') {
      navigate(`/page/${post.actorId}`);
      return;
    }

    const ownUser = String(post.actorId) === String(getCurrentUserId());
    if (ownUser) {
      const ownUsername = user?.username || activeIdentity?.username || post.user?.username || post.actorId;
      navigate(`/profile/${ownUsername}`);
      return;
    }

    const username = post.user?.username || post.actorId;
    navigate(`/profile/${username}`);
  };

  return (
    <div className="post-detail-container">
      <div className="post-detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h2>Post</h2>
        <div className="post-detail-header-actions">
          {isOwnPost ? <button
              className="edit-post-btn"
              onClick={() => navigate(`/create?edit=${post.id}`)}
            >
              Edit
            </button> : null}
        </div>
      </div>

      <div className="post-detail-content">
        {/* Post Card */}
        <div className="post-card-detail">
          {/* User Info */}
          <div className="post-header" onClick={handleActorClick} role="button" tabIndex={0}>
            {post.user?.avatar ? (
              <img src={post.user.avatar} alt={post.user?.name || 'User'} className="post-avatar" />
            ) : (
              <img src={AvatarPlaceholder} alt="Default avatar" className="post-avatar" />
            )}
            <div className="post-user-info">
              <span className="post-username">{post.user?.name || 'Unknown'}</span>
              <span className="post-time">{post.timestamp}</span>
            </div>
          </div>

          {/* Content */}
          {post.content ? <div className="post-content">
              {parseContent(post.content)}
            </div> : null}

                    {/* Media Carousel */}
          {post.media && post.media.length > 0 ? <div className="post-media-carousel-wrapper">
              <div className="post-detail-stage">
                {isCurrentVideo ? (
                  isDetailVideoPlaying ? (
                    <video
                      key={`${currentMedia.url}-${currentMediaIndex}-player`}
                      src={currentMedia.url}
                      poster={currentMediaPoster || undefined}
                      className="post-detail-video-player"
                      controls
                      autoPlay
                      playsInline
                      muted
                      onEnded={handleDetailVideoEnded}
                      onPause={handleDetailVideoPause}
                    />
                  ) : (
                    <button
                      type="button"
                      className="post-detail-video-preview"
                      onClick={handlePlayCurrentMedia}
                    >
                      {currentMediaPoster ? (
                        <img
                          key={`${currentMedia.url}-${currentMediaIndex}-poster`}
                          src={currentMediaPoster}
                          alt="Post media"
                          className="post-detail-image post-detail-video-poster"
                        />
                      ) : (
                        <div className="post-detail-video-placeholder">
                          <IoPlay />
                        </div>
                      )}
                      <span className="post-detail-video-overlay" />
                      <span className="post-detail-video-play-button">
                        <IoPlay />
                      </span>
                    </button>
                  )
                ) : (
                  <img
                    key={`${currentMedia?.url}-${currentMediaIndex}-image`}
                    src={currentMedia?.url}
                    alt="Post media"
                    className="post-detail-image"
                  />
                )}

                {post.media.length > 1 ? <>
                    <button className="media-prev" onClick={handlePrevMedia}>
                      <IoChevronBack />
                    </button>
                    <button className="media-next" onClick={handleNextMedia}>
                      <IoChevronForward />
                    </button>
                    <div className="post-detail-counter">{currentMediaIndex + 1}/{post.media.length}</div>
                  </> : null}
              </div>

              {post.media.length > 1 ? <div className="media-indicators">
                  {post.media.map((media, index) => (
                    <button
                      key={`indicator-${post.id}-${media.id || index}`}
                      className={`indicator ${index === currentMediaIndex ? 'active' : ''}`}
                      onClick={() => handleSelectMedia(index)}
                    />
                  ))}
                </div> : null}
            </div> : null}

          {/* Actions */}
          <div className="post-actions">
            <button className="action-btn" onClick={handleLike}>
              {liked ? <IoHeart className="liked" /> : <IoHeartOutline />}
              <span>{formatCount(likeCount)}</span>
            </button>
            <button className="action-btn" onClick={() => {
              const commentsEl = document.querySelector('.comments-section');
              if (commentsEl) commentsEl.scrollIntoView({ behavior: 'smooth' });
            }}>
              <IoChatbubbleOutline />
              <span>{formatCount(commentsCount)}</span>
            </button>
            <button className="action-btn" onClick={handleShare}>
              <IoShareOutline />
              <span>{formatCount(sharesCount)}</span>
            </button>
            <button 
              className={`action-btn action-btn-bookmark ${bookmarked ? 'bookmarked' : ''}`}
              onClick={async () => {
                if (!post) return;
                if (!isAuthenticated) {
                  toast.info('Please log in to bookmark posts');
                  return;
                }

                const nextBookmarked = !bookmarked;
                setBookmarked(nextBookmarked);

                try {
                  await api.togglePostBookmark(post.id, nextBookmarked);
                } catch (err) {
                  setBookmarked(!nextBookmarked);
                  toast.error('Failed to update bookmark');
                }
              }}
            >
              <IoBookmarkOutline className={bookmarked ? 'bookmarked' : ''} />
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="comments-section">
          <h3>Comments ({formatCount(commentsCount)})</h3>
          
          <div className="comments-list">
            {comments.map((comment) => {
              const viewerType = activeIdentity?.type === 'page' ? 'page' : 'user';
              const viewerId = viewerType === 'page' ? activeIdentity?.id : getCurrentUserId();
              const isOwnComment =
                comment.userId &&
                viewerId &&
                String(comment.userId) === String(viewerId) &&
                String(comment.actorType || 'user') === String(viewerType);

              const handleDeleteComment = async () => {
                if (!isAuthenticated) {
                  toast.info('Please log in to delete comments');
                  return;
                }

                // Show confirmation toast
                toast.warning('Comment deleted');
                
                try {
                  await api.deleteComment(comment.id);
                  setComments((prev) => prev.filter((c) => c.id !== comment.id));
                  setCommentsCount((prev) => Math.max(0, prev - 1));
                  setPost((prev) => prev
                    ? { ...prev, comments: Math.max(0, (prev.comments || 0) - 1) }
                    : prev);
                  toast.success('Comment deleted successfully');
                } catch (err) {
                  toast.error(err.message || 'Failed to delete comment');
                }
              };

              return (
                <div key={comment.id} className="comment-item">
                  {comment.userAvatar ? (
                    <img src={comment.userAvatar} alt={comment.userName} className="comment-avatar" />
                  ) : (
                    <img src={AvatarPlaceholder} alt="Default avatar" className="comment-avatar" />
                  )}
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-username">{comment.userName}</span>
                      <span className="comment-time">{comment.timestamp}</span>
                      {isOwnComment ? <button
                          className="comment-delete-btn"
                          onClick={handleDeleteComment}
                          title="Delete comment"
                          aria-label="Delete comment"
                        >
                          <IoTrashOutline />
                        </button> : null}
                    </div>
                    <p className="comment-text">
                      {getTruncatedComment(comment.text, comment.id)}
                      {comment.text && comment.text.split(/\s+/).length > MAX_COMMENT_WORDS ? <button
                          className="comment-read-more"
                          onClick={() => toggleExpandedComment(comment.id)}
                        >
                          {expandedComments.has(comment.id) ? 'Show less' : 'Read more'}
                        </button> : null}
                    </p>
                    {/* Display comment media if present */}
                    {comment.media_urls && comment.media_urls.length > 0 ? <div className="comment-media">
                        {comment.media_urls.map((media, idx) => (
                          <img
                            key={`comment-media-${comment.id}-${media.url || idx}`}
                            src={media.url}
                            alt={media.name || `Comment media ${idx + 1}`}
                            className="comment-media-image"
                          />
                        ))}
                      </div> : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comment Media Preview */}
          {commentMedia.length > 0 && (
            <div className="comment-media-preview">
              {commentMedia.map((item, index) => (
                <div 
                  key={item.name || `comment-media-${index}`} 
                  className="media-preview-item"
                  style={{
                    opacity: deletingCommentMediaIndex === index ? 0.5 : 1,
                    transform: deletingCommentMediaIndex === index ? 'scale(0.95)' : 'scale(1)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <img src={item.previewUrl} alt={item.name} />
                  <button
                    className="remove-media-btn"
                    onClick={() => removeCommentMedia(index)}
                    type="button"
                    disabled={deletingCommentMediaIndex === index}
                    style={{ opacity: deletingCommentMediaIndex === index ? 0 : 1 }}
                  >
                    {deletingCommentMediaIndex === index ? (
                      <div className="spinner-inline" />
                    ) : (
                      <IoClose />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Comment */}
          <div className="add-comment">
            <img src={AvatarPlaceholder} alt="You" className="comment-avatar" />
            <input
              id="add-comment"
              name="comment"
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            />
            <input
              id="comment-media"
              name="commentMedia"
              type="file"
              ref={commentFileInputRef}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleCommentMediaUpload}
            />
            <button
              className="attach-media-btn"
              onClick={() => commentFileInputRef.current?.click()}
              type="button"
            >
              <IoImageOutline />
            </button>
            <button className="send-comment-btn" onClick={handleAddComment}>
              <IoSendSharp />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;










