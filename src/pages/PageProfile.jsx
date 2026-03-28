import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { IoArrowBack, IoHeartOutline, IoHeart, IoChatbubbleOutline, IoShareOutline, IoBookmarkOutline, IoBookmark, IoBan, IoEllipsisHorizontal, IoFlagOutline } from 'react-icons/io5';
import { useBlockList } from '../contexts/BlockContext';
import PostMenu from '../components/PostMenu';
import api from '../services/api';
import AvatarPlaceholder from '../assets/avatar-placeholder.svg';
import CoverPlaceholder from '../assets/cover-placeholder.svg';
import './Profile.css';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const API_URL = import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api';

const PageProfile = () => {
  const { username: pageId } = useParams();
  const _location = useLocation();
  const navigate = useNavigate();
  const { isBlocked, block, unblock } = useBlockList();
  const { isAuthenticated, getCurrentUserId } = useAuth();
  const activeIdentity = { type: 'user', id: getCurrentUserId() };
  const toast = useToast();

  const [page, setPage] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('Posts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const tabs = ['Posts', 'Stories', 'Liked'];

  const loadPage = async () => {
    setLoading(true);
    setError(null);
    try {
      const pageRes = await fetch(`${API_URL}/pages/${encodeURIComponent(pageId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const pageData = await pageRes.json().catch(() => null);
      if (!pageRes.ok || !pageData?.success) {
        throw new Error(pageData?.error?.message || `Failed to load page: ${pageRes.status}`);
      }
      const p = pageData.data;
      const mappedPage = {
        id: p.id,
        name: p.name,
        username: p.username,
        avatar: p.avatar_url || null,
        coverImage: p.cover_url || null,
        bio: p.bio || '',
        followers: p.stats?.followers ?? 0,
        postsCount: p.stats?.posts ?? 0,
        isPage: true,
        isOwner: p.isOwner || false,
      };
      setIsFollowing(p.isFollowedByMe || false);

      const feedRes = await fetch(`${API_URL}/pages/${encodeURIComponent(pageId)}/feed`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const feedData = await feedRes.json().catch(() => null);
      if (!feedRes.ok || !feedData?.success) {
        throw new Error(feedData?.error?.message || `Failed to load page posts: ${feedRes.status}`);
      }
      const postsFromApi = feedData.data?.posts || [];

      const pageName = mappedPage.name;
      const pageUsername = mappedPage.username || mappedPage.name?.toLowerCase();
      const pageAvatar = mappedPage.avatar;

      const mappedPosts = postsFromApi.map((post) => {
        let mediaArray = [];
        if (Array.isArray(post.media_urls)) mediaArray = post.media_urls;
        else if (typeof post.media_urls === 'string') {
          try { mediaArray = JSON.parse(post.media_urls); } catch { mediaArray = []; }
        }
        return {
          id: post.id,
          content: post.content || '',
          media: mediaArray,
          likes: post.likesCount ?? post.likes_count ?? 0,
          comments: post.commentsCount ?? post.comments_count ?? 0,
          shares: post.sharesCount ?? post.shares_count ?? 0,
          createdAt: post.created_at,
          author: {
            name: post.author?.name || post.actor_name || pageName,
            username: post.author?.username || post.username || pageUsername,
            avatar: post.author?.avatar || post.avatar_url || pageAvatar,
          },
          isLiked: post.isLiked || false,
          isBookmarked: post.isBookmarked || false,
        };
      });

      setPage(mappedPage);
      setPosts(mappedPosts);
    } catch (err) {setError(err.message || 'Failed to load page');
      setPage(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const handleLike = async (postId) => {
    if (!isAuthenticated) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const wasLiked = post.isLiked;

    // Optimistic update
    setPosts(posts.map(p =>
      p.id === postId
        ? { ...p, isLiked: !wasLiked }
        : p
    ));

    try {
      if (wasLiked) {
        await api.unlikePost(postId);
      } else {
        await api.likePost(postId);
      }
    } catch (error) {// Revert on error
      setPosts(posts.map(p =>
        p.id === postId
          ? { ...p, isLiked: wasLiked }
          : p
      ));
    }
  };

  const handleBookmark = async (postId) => {
    if (!isAuthenticated) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const wasBookmarked = post.isBookmarked;

    // Optimistic update
    setPosts(posts.map(p =>
      p.id === postId
        ? { ...p, isBookmarked: !wasBookmarked }
        : p
    ));

    try {
      if (wasBookmarked) {
        await api.unbookmarkPost(postId);
      } else {
        await api.bookmarkPost(postId);
      }
    } catch (error) {// Revert on error
      setPosts(posts.map(p =>
        p.id === postId
          ? { ...p, isBookmarked: wasBookmarked }
          : p
      ));
    }
  };

  const handleShare = async (postId) => {
    if (!isAuthenticated) {
      toast.error('Please log in to share posts');
      return;
    }

    const actorType = 'user';
    const actorId = getCurrentUserId();

    if (!actorId) {
      toast.error('Could not determine who is sharing this post');
      return;
    }

    try {
      // Web API expects (postId, token, actorType, actorId)
      await api.sharePost(postId, actorType, actorId);
      toast.success('Post shared successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to share post');
    }
  };

  const handleReportPage = () => {
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      toast.error('Please select a reason for reporting');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please log in to report pages');
      return;
    }

    try {
      await api.reportContent('page', page.id, reportReason, '');
      toast.success('Report submitted. Our moderation team will review it soon.');
      setShowReportModal(false);
      setReportReason('');
    } catch (error) {
      toast.error(error.message || 'Failed to submit report');
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!page || error) {
    return (
      <div className="profile-container">
        <button className="back-btn-cover" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <div className="empty-tab">
          <p>{error || 'Page not found or failed to load.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Cover Image */}
      <div className="profile-cover">
        {page.coverImage ? (
          <img
            src={page.coverImage}
            alt="Cover"
            onClick={() => setPreviewImage(page.coverImage)}
          />
        ) : (
          <img
            src={CoverPlaceholder}
            alt="Default cover"
          />
        )}
        <button className="back-btn-cover" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
      </div>

      {/* Page Info (reuses profile layout) */}
      <div className="profile-info-section">
        <div className="profile-avatar-wrapper">
          {page.avatar ? (
            <img
              src={page.avatar}
              alt={page.name}
              className="profile-avatar"
              onClick={() => setPreviewImage(page.avatar)}
            />
          ) : (
            <img
              src={AvatarPlaceholder}
              alt="Default avatar"
              className="profile-avatar"
            />
          )}
        </div>

        <div className="profile-details">
          <div className="profile-name-row">
            <h2>{page.name}</h2>
            <span className="page-badge">Page</span>
            {!page.isOwner && (
              <>
                <button
                  className="block-icon-btn"
                  onClick={handleReportPage}
                  title="Report page"
                  aria-label="Report page"
                >
                  <IoFlagOutline />
                </button>
                <button
                  className={`block-icon-btn ${isBlocked('page', page.id) ? 'blocked' : ''}`}
                  onClick={() => {
                    const blockedNow = isBlocked('page', page.id);
                    if (blockedNow) {
                      unblock('page', page.id);
                    } else {
                      block({
                        id: page.id,
                        type: 'page',
                        name: page.name,
                        username: page.username || '',
                        avatar: page.avatar,
                      });
                    }
                  }}
                  title={isBlocked('page', page.id) ? 'Unblock page' : 'Block page'}
                  aria-label={isBlocked('page', page.id) ? 'Unblock page' : 'Block page'}
                >
                  <IoBan />
                </button>
              </>
            )}
          </div>

          {page.bio ? <p className="profile-bio">{page.bio}</p> : null}

          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-value">{page.followers?.toLocaleString() || 0}</span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{page.postsCount?.toLocaleString() || 0}</span>
              <span className="stat-label">Posts</span>
            </div>
          </div>

          <div className="action-buttons">
            {page.isOwner ? (
              <>
                <button
                  className="follow-btn-profile"
                  onClick={() => navigate(`/edit-page/${page.id}`)}
                >
                  Edit Page
                </button>
                <button
                  className="message-btn-profile"
                  onClick={() => navigate('/messages')}
                >
                  Messages
                </button>
              </>
            ) : (
              <>
                <button
                  className="follow-btn-profile"
                  onClick={async () => {
                    try {
                      if (!isAuthenticated) {
                        toast.error('Please log in to follow pages');
                        return;
                      }

                      if (isFollowing) {
                        await api.unfollowUser('page', page.id);
                        setIsFollowing(false);
                        setPage(prev => ({ ...prev, followers: (prev.followers || 1) - 1 }));
                      } else {
                        await api.followUser('page', page.id);
                        setIsFollowing(true);
                        setPage(prev => ({ ...prev, followers: (prev.followers || 0) + 1 }));
                      }
                    } catch (err) {
                      toast.error(err.message || 'Failed to update follow status');
                    }
                  }}
                  disabled={isBlocked('page', page.id)}
                >
                  {isBlocked('page', page.id) ? 'Blocked' : isFollowing ? 'Unfollow' : 'Follow'}
                </button>
                <button
                  className="message-btn-profile"
                  onClick={() => navigate('/messages')}
                  disabled={isBlocked('page', page.id)}
                >
                  Message
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`profile-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Posts Feed */}
      {activeTab === 'Posts' && (
        <div className="posts-feed-vertical">
          {posts.length === 0 ? (
            <div className="empty-tab">
              <p>No posts yet</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="post-card">
                {/* Post Header */}
                <div className="post-header">
                  <div className="post-author">
                    <img
                      src={post.author.avatar || AvatarPlaceholder}
                      alt={post.author.name}
                      className="post-author-avatar"
                    />
                    <div className="post-author-info">
                      <span className="post-author-name">{post.author.name}</span>
                      <span className="post-author-username">@{post.author.username}</span>
                    </div>
                  </div>
                  <button
                    className="post-menu-btn"
                    onClick={() => {
                      setSelectedPost(post);
                      setShowPostMenu(true);
                    }}
                    aria-label="Post options"
                  >
                    <IoEllipsisHorizontal />
                  </button>
                </div>

                {/* Post Content */}
                {post.content ? <div className="post-content" onClick={() => navigate(`/post/${post.id}`)}>
                    <p>{post.content}</p>
                  </div> : null}

                {/* Post Media */}
                {post.media && post.media.length > 0 ? <div className="post-media" onClick={() => navigate(`/post/${post.id}`)}>
                    {post.media.map((item, idx) => (
                      item.type === 'image' ? (
                        <img key={`${post.id}-media-${idx}`} src={item.url} alt="Post media" />
                      ) : item.type === 'video' ? (
                        <video key={`${post.id}-media-${idx}`} src={item.url} controls />
                      ) : null
                    ))}
                  </div> : null}

                {/* Post Actions */}
                <div className="post-actions">
                  <button className="post-action-btn" onClick={() => handleLike(post.id)}>
                    {post.isLiked ? <IoHeart color="#E91E63" /> : <IoHeartOutline />}
                    <span>{post.likes}</span>
                  </button>
                  <button className="post-action-btn" onClick={() => navigate(`/post/${post.id}`)}>
                    <IoChatbubbleOutline />
                    <span>{post.comments}</span>
                  </button>
                  <button className="post-action-btn" onClick={() => handleShare(post.id)}>
                    <IoShareOutline />
                    <span>{post.shares || 0}</span>
                  </button>
                  <button className="post-action-btn" onClick={() => handleBookmark(post.id)}>
                    {post.isBookmarked ? <IoBookmark color="#E91E63" /> : <IoBookmarkOutline />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab !== 'Posts' && (
        <div className="empty-tab">
          <p>No {activeTab.toLowerCase()} yet</p>
        </div>
      )}

      {previewImage ? <div className="image-modal" onClick={() => setPreviewImage(null)}>
          <div
            className="image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="image-modal-close"
              onClick={() => setPreviewImage(null)}
              aria-label="Close image preview"
            >
              ×
            </button>
            <img src={previewImage} alt="Preview" />
          </div>
        </div> : null}

      <PostMenu
        visible={showPostMenu}
        onClose={() => {
          setShowPostMenu(false);
          setSelectedPost(null);
        }}
        post={selectedPost}
        onDelete={(postId) => {
          setPosts(posts.filter(p => p.id !== postId));
        }}
      />

      {/* Report Modal */}
      {showReportModal ? <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Report Page</h3>
              <button
                className="close-modal-btn"
                onClick={() => setShowReportModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Why are you reporting this page?</p>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="report-select"
              >
                <option value="">Select a reason...</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="hate_speech">Hate Speech</option>
                <option value="impersonation">Impersonation</option>
                <option value="scam">Scam or Fraud</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowReportModal(false)}
              >
                Cancel
              </button>
              <button
                className="report-btn"
                onClick={submitReport}
                disabled={!reportReason}
              >
                Submit Report
              </button>
            </div>
          </div>
        </div> : null}
    </div>
  );
};

export default PageProfile;





