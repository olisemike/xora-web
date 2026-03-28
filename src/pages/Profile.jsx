import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { IoArrowBack, IoSettingsOutline, IoChatbubbleOutline, IoBan, IoEllipsisHorizontal, IoFlagOutline } from 'react-icons/io5';
import { useBlockList } from '../contexts/BlockContext';
import PostMenu from '../components/PostMenu';
import PostMedia from '../components/PostMedia';
import api from '../services/api';
import AvatarPlaceholder from '../assets/avatar-placeholder.svg';
import CoverPlaceholder from '../assets/cover-placeholder.svg';
import './Profile.css';
import { useToast } from '../components/Toast';
import { formatCount } from '../utils/engagement';

// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const API_URL = import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api';

const Profile = () => {
  const { username: usernameParam } = useParams();
  const { user, isAuthenticated, loading: authLoading, getCurrentUserId } = useAuth();
  const { bookmarkedPosts, latestEngagementUpdate, updatePostBookmarkState } = useAppData();
  const navigate = useNavigate();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('Posts');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const { isBlocked, block, unblock } = useBlockList();

  const tabs = useMemo(() => ['Posts', 'Stories', 'Bookmarks'], []);

  // Format timestamp for display (handles Unix seconds, milliseconds, and ISO strings)
  const formatTime = (timestamp) => {
    if (!timestamp) return '';

    let ms = timestamp;
    if (typeof timestamp === 'number' && timestamp < 10000000000) {
      // Looks like Unix seconds, convert to ms
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
    if (days < 7) return `${days}d ago`;

    // For older posts, show the date
    return new Date(ms).toLocaleDateString();
  };

  useEffect(() => {
    if (!tabs.includes(activeTab)) {
      setActiveTab('Posts');
    }
  }, [activeTab, tabs]);

  const loadProfile = useCallback(async () => {
    if (!usernameParam) {
      setLoading(false);
      setProfile(null);
      return;
    }

    setLoading(true);
    try {
      const profileRes = await fetch(`${API_URL}/users/${encodeURIComponent(usernameParam)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const profileData = await profileRes.json();
      if (!profileRes.ok || !profileData?.success) {
        throw new Error(profileData?.error?.message || `Failed to load profile: ${profileRes.status}`);
      }
      const p = profileData.data;
      const isOwn = user && p.id === getCurrentUserId();
      const relationship = p.relationship || {};
      setIsFollowing(Boolean(relationship.isFollowedByMe));
      const mappedProfile = {
        id: p.id,
        username: p.username,
        name: p.name,
        avatar: p.avatar_url || user?.avatar || null,
        coverImage: p.coverUrl || user?.coverImage || null,
        location: p.location || '',
        bio: p.bio || '',
        followers: p.stats?.followers ?? 0,
        following: p.stats?.following ?? 0,
        isOwnProfile: isOwn,
      };

      const feedRes = await fetch(`${API_URL}/users/${encodeURIComponent(usernameParam)}/feed`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const feedData = await feedRes.json();
      if (!feedRes.ok || !feedData?.success) {
        throw new Error(feedData?.error?.message || `Failed to load feed: ${feedRes.status}`);
      }

      const mappedPosts = (feedData.data?.posts || []).map((post) => {
        let mediaArray = [];
        if (Array.isArray(post.media_urls)) mediaArray = post.media_urls;
        else if (typeof post.media_urls === 'string') {
          try { mediaArray = JSON.parse(post.media_urls); } catch { mediaArray = []; }
        }

        const firstMedia = mediaArray.find((m) => m && (m.type === 'image' || !m.type)) || mediaArray[0];
        const imageUrl = typeof firstMedia === 'string'
          ? firstMedia
          : (firstMedia?.url || firstMedia?.uri || firstMedia?.image_url || null);

        return {
          id: post.id,
          originalId: post.id,
          userId: post.actor_id,
          userName: post.actor_name || post.username || 'User',
          userAvatar: post.avatar_url || null,
          content: post.content,
          media: mediaArray,
          image: imageUrl,
          likes: post.likesCount ?? post.likes_count ?? 0,
          comments: post.commentsCount ?? post.comments_count ?? 0,
          shares: post.sharesCount ?? post.shares_count ?? 0,
          timestamp: post.created_at ? new Date(post.created_at * 1000).toISOString() : null,
          isLiked: post.isLiked || post.liked_by_me || false,
          isBookmarked: bookmarkedPosts.has(post.id) || post.isBookmarked || post.bookmarked_by_me || false,
        };
      });

      let combinedPosts = mappedPosts;

      if (mappedProfile.isOwnProfile) {
        try {
          const shares = await api.getMyShares();
          const sharePosts = (shares || []).map((share) => {
            const original = share.original || {};
            return {
              id: `share-${share.id}`,
              originalId: original.id,
              // Keep the sharedBy and original structure to render correctly
              sharedBy: {
                id: mappedProfile.id,
                name: mappedProfile.name,
                username: mappedProfile.username,
                avatar: mappedProfile.avatar,
              },
              original: {
                id: original.id,
                content: original.content,
                media: original.media || [],
                image: original.image || null,
                likes: original.likes ?? 0,
                comments: original.comments ?? 0,
                shares: original.shares ?? 0,
                isLiked: original.isLiked || original.liked_by_me || false,
                isBookmarked: bookmarkedPosts.has(original.id) || original.isBookmarked || original.bookmarked_by_me || false,
                user: original.user || {
                  id: original.userId,
                  name: original.userName || 'Unknown',
                  username: original.userUsername || 'unknown',
                  avatar: original.userAvatar || null,
                },
                timestamp: original.timestamp || original.createdAt,
              },
              timestamp: share.timestamp,
              isShare: true,
            };
          });

          combinedPosts = [...sharePosts, ...mappedPosts].sort((a, b) => {
            const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return bTime - aTime;
          });
        } catch {
          combinedPosts = mappedPosts;
        }
      }

      setProfile(mappedProfile);
      setPosts(combinedPosts);
    } catch (err) {
      setProfile(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [usernameParam, user, getCurrentUserId, bookmarkedPosts]);

  useEffect(() => {
    if (!authLoading) {
      loadProfile();
    }
  }, [usernameParam, authLoading, loadProfile]);

  // Update posts when real-time bookmark state changes
  useEffect(() => {
    setPosts(prevPosts =>
      prevPosts.map(post => ({
        ...post,
        isBookmarked: bookmarkedPosts.has(post.originalId || post.id)
      }))
    );
  }, [bookmarkedPosts]);

  // Update posts when real-time engagement updates occur
  useEffect(() => {
    if (!latestEngagementUpdate) return;

    const { postId, engagementType, counts } = latestEngagementUpdate;

    if (engagementType === 'deleted') {
      setPosts(prevPosts => prevPosts.filter(p => p.id !== postId && p.original?.id !== postId));
      return;
    }

    setPosts(prevPosts =>
      prevPosts.map(p => {
        const isTargetPost = p.id === postId || (p.original && p.original.id === postId);
        if (!isTargetPost) return p;

        const updatedPost = {
          ...p,
          likes: counts.likesCount ?? p.likes,
          comments: counts.commentsCount ?? p.comments,
          shares: counts.sharesCount ?? p.shares,
          ...(counts.isLiked !== undefined && { isLiked: counts.isLiked, liked_by_me: counts.isLiked }),
        };

        if (p.original && p.original.id === postId) {
          updatedPost.original = {
            ...p.original,
            likes: counts.likesCount ?? p.original.likes,
            comments: counts.commentsCount ?? p.original.comments,
            shares: counts.sharesCount ?? p.original.shares,
            ...(counts.isLiked !== undefined && { isLiked: counts.isLiked, liked_by_me: counts.isLiked }),
          };
        }

        return updatedPost;
      })
    );
  }, [latestEngagementUpdate]);

  const isStoryExpired = (story) => {
    const expiresAt = story?.expiresAt || story?.expires_at;
    if (!expiresAt) return false;
    const expiresMs = typeof expiresAt === 'number'
      ? (expiresAt < 1e12 ? expiresAt * 1000 : expiresAt)
      : Date.parse(expiresAt);
    if (Number.isNaN(expiresMs)) return false;
    return expiresMs <= Date.now();
  };

  useEffect(() => {
    if (activeTab !== 'Stories' || !usernameParam) return;
    let cancelled = false;
    const loadStories = async () => {
      setStoriesLoading(true);
      try {
        const response = await fetch(`${API_URL}/stories/${encodeURIComponent(usernameParam)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error?.message || `Failed to load stories (${response.status})`);
        }
        const items = (data.data?.stories || []).map((s) => ({
          id: s.id,
          mediaUrl: s.media_url || null,
          mediaType: s.media_type || 'image',
          createdAt: s.created_at,
          expiresAt: s.expires_at,
          title: s.caption || s.content || 'Story',
          timestamp: s.created_at ? new Date(s.created_at * 1000).toLocaleString() : '',
        }));
        if (!cancelled) {
          setStories(items.filter((s) => !isStoryExpired(s)));
        }
      } catch {
        if (!cancelled) setStories([]);
      } finally {
        if (!cancelled) setStoriesLoading(false);
      }
    };

    loadStories();
    return () => {
      cancelled = true;
    };
  }, [activeTab, usernameParam]);

  useEffect(() => {
    if (activeTab !== 'Bookmarks') return;
    let cancelled = false;

    const loadBookmarks = async () => {
      if (!usernameParam) {
        setBookmarks([]);
        return;
      }
      setBookmarksLoading(true);
      try {
        const response = await fetch(`${API_URL}/users/${encodeURIComponent(usernameParam)}/bookmarks`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        const data = await response.json();
        if (!response.ok || !data?.success) {
          throw new Error(data?.error?.message || `Failed to load bookmarks (${response.status})`);
        }
        const items = (data.data?.bookmarks || []).map((b) => {
          const postId = b.post_id || b.id;
          let mediaArray = [];
          if (Array.isArray(b.media_urls)) mediaArray = b.media_urls;
          else if (typeof b.media_urls === 'string') {
            try { mediaArray = JSON.parse(b.media_urls); } catch { mediaArray = []; }
          }
          const firstMedia = mediaArray.find((m) => m && (m.type === 'image' || !m.type)) || mediaArray[0];
          const imageUrl = typeof firstMedia === 'string'
            ? firstMedia
            : (firstMedia?.url || firstMedia?.uri || firstMedia?.image_url || null);

          return {
            id: postId,
            postId,
            content: b.content || '',
            authorName: b.actor_name || b.username || 'User',
            authorUsername: b.username || '',
            authorAvatar: b.avatar_url || null,
            image: imageUrl,
            timestamp: b.created_at ? new Date(b.created_at * 1000).toLocaleString() : '',
          };
        });
        if (!cancelled) setBookmarks(items);
      } catch {
        if (!cancelled) setBookmarks([]);
      } finally {
        if (!cancelled) setBookmarksLoading(false);
      }
    };

    loadBookmarks();
    return () => {
      cancelled = true;
    };
  }, [activeTab, usernameParam]);

  useEffect(() => {
    if (!stories.length) return;
    const interval = setInterval(() => {
      setStories((prev) => prev.filter((s) => !isStoryExpired(s)));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [stories.length]);

  // Listen for real-time engagement updates
  useEffect(() => {
    const handleEngagementUpdate = (event) => {
      const { postId, counts } = event.detail || {};
      if (!postId) return;

      console.log('[Profile] Received engagement update:', { postId, counts, currentPosts: posts.map(p => ({ id: p.id, originalId: p.originalId })) });

      setPosts(prevPosts => prevPosts.map(post => {
        if (String(post.id) === String(postId) || String(post.originalId) === String(postId)) {
          console.log('[Profile] Updating post:', postId, counts);
          return {
            ...post,
            likes: counts?.likesCount !== undefined ? counts.likesCount : post.likes,
            comments: counts?.commentsCount !== undefined ? counts.commentsCount : post.comments,
            shares: counts?.sharesCount !== undefined ? counts.sharesCount : post.shares,
          };
        }
        return post;
      }));
    };

    window.addEventListener('engagement-update', handleEngagementUpdate);
    return () => window.removeEventListener('engagement-update', handleEngagementUpdate);
  }, [posts]);

  const handleRemoveBookmark = async (postId) => {
    if (!isAuthenticated || !postId) return;
    setBookmarks((prev) => prev.filter((b) => b.postId !== postId && b.id !== postId));

    // Also update centralized state so other pages sync
    updatePostBookmarkState(postId, false);

    try {
      await api.unbookmarkPost(postId);
    } catch {
      // Ignore removal errors; user can refresh
    }
  };

  const handleReportUser = () => {
    setShowReportModal(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      toast.error('Please select a reason for reporting');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please log in to report users');
      return;
    }

    try {
      await api.reportContent('user', profile.id, reportReason, '');
      toast.success('Report submitted. Our moderation team will review it soon.');
      setShowReportModal(false);
      setReportReason('');
    } catch (error) {
      toast.error(error.message || 'Failed to submit report');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div>User not found</div>;
  }

  return (
    <div className="profile-container">
      {/* Cover Image */}
      <div className="profile-cover">
        {profile.coverImage ? (
          <img 
            src={profile.coverImage} 
            alt="Cover" 
            onClick={() => setPreviewImage(profile.coverImage)}
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

      {/* Profile Info */}
      <div className="profile-info-section">
        <div className="profile-avatar-wrapper">
          {profile.avatar ? (
            <img 
              src={profile.avatar} 
              alt={profile.name} 
              className="profile-avatar" 
              onClick={() => setPreviewImage(profile.avatar)}
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
            <h2>{profile.name}</h2>
            {profile.isOwnProfile ? (
              <button className="settings-icon-btn" onClick={() => navigate('/settings')}>
                <IoSettingsOutline />
              </button>
            ) : (
              <>
                <button
                  className="block-icon-btn"
                  onClick={handleReportUser}
                  title="Report user"
                  aria-label="Report user"
                >
                  <IoFlagOutline />
                </button>
                <button
                  className={`block-icon-btn ${isBlocked('user', profile.id) ? 'blocked' : ''}`}
                  onClick={() => {
                    const blockedNow = isBlocked('user', profile.id);
                    if (blockedNow) {
                      unblock('user', profile.id);
                    } else {
                      block({
                        id: profile.id,
                        type: 'user',
                        name: profile.name,
                        username: profile.username || '',
                        avatar: profile.avatar,
                      });
                    }
                  }}
                  title={isBlocked('user', profile.id) ? 'Unblock user' : 'Block user'}
                  aria-label={isBlocked('user', profile.id) ? 'Unblock user' : 'Block user'}
                >
                  <IoBan />
                </button>
              </>
            )}
          </div>
          <p className="profile-location">{profile.location}</p>
          {Boolean(profile.bio) && <p className="profile-bio">{profile.bio}</p>}

          <div className="profile-stats">
            <button
              type="button"
              className="stat-item stat-clickable"
              onClick={() => navigate(`/followers/${profile.username || usernameParam}`)}
            >
              <span className="stat-value">{profile.followers?.toLocaleString() || 0}</span>
              <span className="stat-label">Followers</span>
            </button>
            <button
              type="button"
              className="stat-item stat-clickable"
              onClick={() => navigate(`/following/${profile.username || usernameParam}`)}
            >
              <span className="stat-value">{profile.following?.toLocaleString() || 0}</span>
              <span className="stat-label">Following</span>
            </button>
          </div>

          {profile.isOwnProfile ? (
            <button className="edit-profile-btn" onClick={() => navigate('/edit-profile')}>
              Edit Profile
            </button>
          ) : (
            <div className="action-buttons">
              <button
                className="follow-btn-profile"
                onClick={async () => {
                  if (!isAuthenticated) {
                    toast.error('Please log in to follow users');
                    return;
                  }

                  const wasFollowing = isFollowing;

                  try {
                    if (wasFollowing) {
                      await api.unfollowUser('user', profile.id);
                      setIsFollowing(false);
                      setProfile(prev => ({
                        ...prev,
                        followers: Math.max((prev.followers || 1) - 1, 0),
                      }));
                    } else {
                      await api.followUser('user', profile.id);
                      setIsFollowing(true);
                      setProfile(prev => ({
                        ...prev,
                        followers: (prev.followers || 0) + 1,
                      }));
                    }
                  } catch (err) {
                    const msg = err?.message || '';

                    // Make follow/unfollow idempotent for common backend 400s
                    if (!wasFollowing && msg.includes('Already following')) {
                      setIsFollowing(true);
                      return;
                    }
                    if (wasFollowing && msg.includes('Not following')) {
                      setIsFollowing(false);
                      return;
                    }

                    toast.error(msg || 'Failed to update follow status');
                  }
                }}
                disabled={isBlocked('user', profile.id)}
              >
                {isBlocked('user', profile.id) ? 'Blocked' : isFollowing ? 'Unfollow' : 'Follow'}
              </button>
              <button
                className="message-btn-profile"
                onClick={() => {
                  navigate('/messages', {
                    state: {
                      targetUser: {
                        id: profile.id,
                        name: profile.name,
                        avatar: profile.avatar || null,
                      },
                    },
                  });
                }}
                disabled={isBlocked('user', profile.id)}
              >
                Message
              </button>
            </div>
          )}
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

      {/* Posts List */}
      {activeTab === 'Posts' && (
        <div className="profile-posts-list">
          {posts.length === 0 ? (
            <div className="empty-tab">
              <p>No posts yet</p>
            </div>
          ) : (
            posts.map((post) => {
              const isShared = Boolean(post.sharedBy || post.isShare);
              const original = isShared ? (post.original || post) : post;
              const baseId = post.originalId || original.id || post.id;
              const displayContent = original.content || post.content;
              const displayImage = original.image || post.image;
              const displayComments = original.comments ?? post.comments ?? 0;
              const displayMedia = Array.isArray(original.media) && original.media.length > 0
                ? original.media
                : (displayImage ? [{ type: 'image', url: displayImage }] : []);

              // Get the author info - for shares, use original post author; for regular posts, use profile
              const authorInfo = isShared && original.user
                ? original.user
                : { name: profile.name, username: profile.username, avatar: profile.avatar };

              return (
              <div
                key={post.id}
                className="profile-post-card"
                onClick={() => navigate(`/post/${baseId}`)}
              >
                {/* Show "shared by" header for shared posts */}
                {isShared && post.sharedBy ? <div className="profile-shared-header">
                    <img
                      src={post.sharedBy.avatar || AvatarPlaceholder}
                      alt={post.sharedBy.name}
                      className="profile-shared-avatar"
                    />
                    <span className="profile-shared-text">
                      <strong>{post.sharedBy.name}</strong> shared
                      {post.timestamp ? ` · ${formatTime(post.timestamp)}` : null}
                    </span>
                  </div> : null}

                <div className={isShared ? 'profile-shared-original' : ''}>
                  <div className="profile-post-header">
                    <div className="profile-post-avatar">
                      {authorInfo.avatar ? (
                        <img src={authorInfo.avatar} alt={authorInfo.name} />
                      ) : (
                        <img src={AvatarPlaceholder} alt="Default avatar" />
                      )}
                    </div>
                    <div className="profile-post-header-text">
                      <span className="profile-post-name">{authorInfo.name}</span>
                      <span className="profile-post-username">@{authorInfo.username}</span>
                      {Boolean(original.timestamp || post.timestamp) && !isShared && (
                        <span className="profile-post-time">
                          {formatTime(original.timestamp || post.timestamp)}
                        </span>
                      )}
                      {isShared && Boolean(original.timestamp) ? <span className="profile-post-time">
                          {formatTime(original.timestamp)}
                        </span> : null}
                    </div>
                    {!isShared && (
                      <button
                        className="post-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPost(post);
                          setShowPostMenu(true);
                        }}
                        aria-label="Post options"
                      >
                        <IoEllipsisHorizontal />
                      </button>
                    )}
                  </div>

                  {Boolean(displayContent) && (
                    <div className="profile-post-content">{displayContent}</div>
                  )}

                  {displayMedia.length > 0 && (
                    <div className="profile-post-media">
                      <PostMedia
                        media={displayMedia}
                        autoPlayVideo={false}
                        allowInlineVideoPlayback
                        onMediaClick={(_index, mediaItem) => {
                          const mediaUrl = typeof mediaItem === 'string'
                            ? mediaItem
                            : (mediaItem?.url || mediaItem?.uri || '');
                          const mediaType = mediaItem?.type || (mediaUrl.includes('.mp4') ? 'video' : 'image');
                          if (mediaType !== 'video' && mediaType !== 'gif') {
                            navigate(`/post/${baseId}`);
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className="profile-post-footer">
                    <button
                      className="post-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/post/${baseId}`);
                      }}
                    >
                      <IoChatbubbleOutline />
                      <span>{formatCount(displayComments)}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
            })
          )}
        </div>
      )}

      {activeTab === 'Stories' && (
        <div className="profile-stories-list">
          {storiesLoading ? (
            <div className="empty-tab">
              <p>Loading stories...</p>
            </div>
          ) : stories.length === 0 ? (
            <div className="empty-tab">
              <p>No stories yet</p>
            </div>
          ) : (
            stories.map((story) => (
              <button
                key={story.id}
                className="profile-story-item"
                onClick={() => navigate(`/story/${profile.username || usernameParam}`)}
              >
                <div className="profile-story-thumb">
                  {story.mediaUrl ? (
                    <img src={story.mediaUrl} alt="Story" />
                  ) : (
                    <img src={AvatarPlaceholder} alt="Story" />
                  )}
                </div>
                <div className="profile-story-meta">
                  <span className="profile-story-title">{story.title || 'Story'}</span>
                  <span className="profile-story-time">{story.timestamp}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {activeTab === 'Bookmarks' && (
        <div className="profile-bookmarks-list">
          {bookmarksLoading ? (
            <div className="empty-tab">
              <p>Loading bookmarks...</p>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="empty-tab">
              <p>No bookmarks yet</p>
            </div>
          ) : (
            bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="profile-bookmark-item"
                onClick={() => bookmark.postId && navigate(`/post/${bookmark.postId}`)}
              >
                <div className="profile-bookmark-thumb">
                  {bookmark.image ? (
                    <img src={bookmark.image} alt="Bookmark" />
                  ) : (
                    <img src={AvatarPlaceholder} alt="Bookmark" />
                  )}
                </div>
                <div className="profile-bookmark-meta">
                  <span className="profile-bookmark-title">{bookmark.content || 'Post'}</span>
                  <span className="profile-bookmark-author">@{bookmark.authorUsername || 'user'}</span>
                </div>
                {profile.isOwnProfile ? (
                  <button
                    className="profile-bookmark-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveBookmark(bookmark.postId);
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}

      {Boolean(previewImage) && (
        <div className="image-modal" onClick={() => setPreviewImage(null)}>
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
        </div>
      )}

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
      />

      {/* Report Modal */}
      {Boolean(showReportModal) && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Report User</h3>
              <button
                className="close-modal-btn"
                onClick={() => setShowReportModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Why are you reporting this user?</p>
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
        </div>
      )}
    </div>
  );
};

export default Profile;





