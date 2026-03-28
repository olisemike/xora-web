import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useWebSocket } from './WebSocketContext';
import { api } from '../services/api';

const AppDataContext = createContext();

const mapReelsToFeedPosts = (reels = []) => {
  const mapped = [];
  const seenPostIds = new Set();

  for (const reel of Array.isArray(reels) ? reels : []) {
    if (!reel || typeof reel !== 'object' || reel.isAd) continue;

    const postId = String(reel.postId || reel.id || '');
    if (!postId || seenPostIds.has(postId)) continue;
    seenPostIds.add(postId);

    const rawCreatedAt = reel.createdAt || reel.timestamp || null;
    const createdAt = typeof rawCreatedAt === 'number'
      ? rawCreatedAt
      : (Date.parse(rawCreatedAt || '') || Date.now());
    const videoUrl = reel.video || reel.url || null;

    mapped.push({
      id: postId,
      content: reel.caption || reel.description || '',
      media: videoUrl
        ? [{
            type: 'video',
            url: videoUrl,
            thumbnail: reel.thumbnail || null,
            poster: reel.thumbnail || null,
          }]
        : [],
      image: reel.thumbnail || null,
      likes: Number(reel.likes || 0),
      comments: Number(reel.comments || 0),
      shares: Number(reel.shares || 0),
      views: Number(reel.views || 0),
      isLiked: Boolean(reel.likedByMe ?? reel.liked_by_me ?? false),
      isBookmarked: false,
      createdAt,
      timestamp: typeof rawCreatedAt === 'string' ? rawCreatedAt : new Date(createdAt).toISOString(),
      user: {
        id: reel.user?.id || reel.actorId || null,
        name: reel.user?.name || reel.user?.username || 'User',
        username: reel.user?.username || 'user',
        avatar: reel.user?.avatar || null,
      },
    });
  }

  return mapped;
};
export const AppDataProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [bookmarks, setBookmarks] = useState(new Set());
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [blockedUsers, setBlockedUsers] = useState(new Set());
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Computed liked posts from posts data
  const likedPosts = useMemo(() => {
    const liked = new Set();
    posts.forEach(post => {
      const original = post.original || post;
      if (original.isLiked || original.liked_by_me || original.is_liked) {
        liked.add(String(original.id));
      }
    });
    return liked;
  }, [posts]);

  const { user, refreshAccessToken } = useAuth();

  // Centralized function to update like state across all pages (like mobile app)
  const updatePostLikeState = useCallback((postId, nextLiked) => {
    if (!postId) return;
    const targetId = String(postId);
    const delta = nextLiked ? 1 : -1;

    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        const isTarget = String(p.id) === targetId || (p.original && String(p.original.id) === targetId);
        if (!isTarget) return p;

        const updated = {
          ...p,
          likes: Math.max(0, Number(p.likes || 0) + delta),
          isLiked: nextLiked,
          liked_by_me: nextLiked,
          is_liked: nextLiked,
        };

        if (p.original && String(p.original.id) === targetId) {
          updated.original = {
            ...p.original,
            likes: Math.max(0, Number(p.original.likes || 0) + delta),
            isLiked: nextLiked,
            liked_by_me: nextLiked,
            is_liked: nextLiked,
          };
        }

        return updated;
      }),
    );

    // Dispatch event so other components with local state can also update
    window.dispatchEvent(new CustomEvent('engagement-update', {
      detail: {
        postId: targetId,
        counts: { isLiked: nextLiked },
        engagementType: 'like',
      }
    }));
  }, []);

  // Centralized function to update bookmark state across all pages
  const updatePostBookmarkState = useCallback((postId, nextBookmarked) => {
    if (!postId) return;
    const targetId = String(postId);

    setBookmarks(prev => {
      const newBookmarks = new Set(prev);
      if (nextBookmarked) {
        newBookmarks.add(targetId);
      } else {
        newBookmarks.delete(targetId);
      }
      return newBookmarks;
    });

    // Dispatch event so other components with local state can also update
    window.dispatchEvent(new CustomEvent('engagement-update', {
      detail: {
        postId: targetId,
        counts: { isBookmarked: nextBookmarked },
        engagementType: 'bookmark',
      }
    }));
  }, []);

  // Centralized function to update engagement counts (likes, comments, shares)
  const updatePostEngagement = useCallback((postId, counts) => {
    if (!postId) return;
    const targetId = String(postId);

    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        const isTarget = String(p.id) === targetId || (p.original && String(p.original.id) === targetId);
        if (!isTarget) return p;

        const updated = {
          ...p,
          ...(counts.likesCount !== undefined && { likes: counts.likesCount }),
          ...(counts.commentsCount !== undefined && { comments: counts.commentsCount }),
          ...(counts.sharesCount !== undefined && { shares: counts.sharesCount }),
          ...(counts.isLiked !== undefined && { isLiked: counts.isLiked, liked_by_me: counts.isLiked }),
        };

        if (p.original && String(p.original.id) === targetId) {
          updated.original = {
            ...p.original,
            ...(counts.likesCount !== undefined && { likes: counts.likesCount }),
            ...(counts.commentsCount !== undefined && { comments: counts.commentsCount }),
            ...(counts.sharesCount !== undefined && { shares: counts.sharesCount }),
            ...(counts.isLiked !== undefined && { isLiked: counts.isLiked, liked_by_me: counts.isLiked }),
          };
        }

        return updated;
      }),
    );

    // Dispatch event so other components with local state can also update
    window.dispatchEvent(new CustomEvent('engagement-update', {
      detail: { postId: targetId, counts, engagementType: 'engagement' }
    }));
  }, []);
  const {
    latestEngagementUpdate,
    latestPostAction,
    latestBookmarkAction,
    latestFollowAction,
    latestMessageAction,
    latestFeedRefresh
  } = useWebSocket();

  // Handle real-time engagement updates
  useEffect(() => {
    if (!latestEngagementUpdate) return;

    const { postId, engagementType, counts } = latestEngagementUpdate;

    if (engagementType === 'deleted') {
      setPosts(prevPosts => prevPosts.filter(p => p.id !== postId && p.original?.id !== postId));
      return;
    }

    // Update engagement counts for posts in real-time
    setPosts(prevPosts =>
      prevPosts.map(p => {
        const isTargetPost = p.id === postId || (p.original && p.original.id === postId);
        if (!isTargetPost) return p;

        const updatedPost = {
          ...p,
          likes: counts.likesCount ?? p.likes,
          comments: counts.commentsCount ?? p.comments,
          shares: counts.sharesCount ?? p.shares,
          // Update liked status if provided
          ...(counts.isLiked !== undefined && { isLiked: counts.isLiked, liked_by_me: counts.isLiked }),
        };

        // Also update original post if this is a share
        if (p.original && p.original.id === postId) {
          updatedPost.original = {
            ...p.original,
            likes: counts.likesCount ?? p.original.likes,
            comments: counts.commentsCount ?? p.original.comments,
            shares: counts.sharesCount ?? p.original.shares,
            // Update liked status if provided
            ...(counts.isLiked !== undefined && { isLiked: counts.isLiked, liked_by_me: counts.isLiked }),
          };
        }

        return updatedPost;
      })
    );
  }, [latestEngagementUpdate]);

  // Handle real-time post actions
  useEffect(() => {
    if (!latestPostAction) return;

    const { action, post } = latestPostAction;

    if (action === 'created') {
      // Append new post to END of feed (users see it while scrolling down, not interrupting top)
      setPosts(prevPosts => {
        const exists = prevPosts.some(p => p.id === post.id);
        if (exists) return prevPosts;
        return [...prevPosts, post];
      });
    } else if (action === 'updated') {
      // Update existing post
      setPosts(prevPosts =>
        prevPosts.map(p => p.id === post.id ? { ...p, ...post } : p)
      );
    } else if (action === 'deleted') {
      // Remove post from feed
      setPosts(prevPosts => prevPosts.filter(p => p.id !== post.id));
    }
  }, [latestPostAction]);

  // Handle real-time bookmark actions
  useEffect(() => {
    if (!latestBookmarkAction) return;

    const { action, bookmark } = latestBookmarkAction;

    if (action === 'created') {
      setBookmarks(prev => new Set([...prev, bookmark.postId]));
    } else if (action === 'deleted') {
      setBookmarks(prev => {
        const newBookmarks = new Set(prev);
        newBookmarks.delete(bookmark.postId);
        return newBookmarks;
      });
    }
  }, [latestBookmarkAction]);

  // Handle real-time follow actions
  useEffect(() => {
    if (!latestFollowAction) return;

    const { action, follow } = latestFollowAction;

    if (action === 'created') {
      setFollowingUsers(prev => new Set([...prev, follow.targetUserId]));
    } else if (action === 'deleted') {
      setFollowingUsers(prev => {
        const newFollowing = new Set(prev);
        newFollowing.delete(follow.targetUserId);
        return newFollowing;
      });
    }
  }, [latestFollowAction]);

  // Handle real-time message actions
  useEffect(() => {
    if (!latestMessageAction) return;

    const { action, message, conversationId } = latestMessageAction;

    if (action === 'created') {
      // Update conversation with new message
      setConversations(prevConversations => {
        return prevConversations.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              lastMessage: message.text || 'New message',
              timestamp: message.time || 'now',
              unread: true, // Mark as unread since it's a new message
            };
          }
          return conv;
        });
      });
    }
  }, [latestMessageAction]);

  const loadPosts = useCallback(async () => {
    if (!user) return;
    try {
      const { posts: fetchedPosts } = await api.getPosts();
      if (Array.isArray(fetchedPosts) && fetchedPosts.length > 0) {
        setPosts(fetchedPosts);
        return;
      }

      const { posts: suggestedPosts } = await api.getPosts(null, null, 'suggested');
      if (Array.isArray(suggestedPosts) && suggestedPosts.length > 0) {
        setPosts(suggestedPosts);
        return;
      }

      const fallbackReels = await api.getReelsFeed();
      setPosts(mapReelsToFeedPosts(fallbackReels));
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  }, [user]);

  const loadConversations = useCallback(async () => {
    try {
      const conversations = await api.getConversations();
      setConversations(conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  // Handle feed refresh requests
  useEffect(() => {
    if (!latestFeedRefresh) return;

    const { feedType } = latestFeedRefresh;

    // Trigger feed refresh based on type
    if (feedType === 'posts' || feedType === 'all') {
      loadPosts();
    }
    if (feedType === 'conversations' || feedType === 'all') {
      loadConversations();
    }
  }, [latestFeedRefresh, loadPosts, loadConversations]);

  // Load core app data when auth token changes
  const loadAllData = useCallback(async () => {
    if (!user) {
      setPosts([]);
      setConversations([]);
      setBookmarks(new Set());
      setFollowingUsers(new Set());
      setBlockedUsers(new Set());
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const username = user?.username;
      const [feedPosts, apiConversations, apiBlocks, apiUsers, apiFollowing, bookmarkData] = await Promise.all([
        api.getPosts(),
        api.getConversations(),
        api.getBlocks(),
        api.getSuggestedUsers(),
        username ? api.getUserFollowing(username) : Promise.resolve([]),
        api.getBookmarks(),
      ]);

      // Set posts
      const primaryPosts = Array.isArray(feedPosts?.posts) ? feedPosts.posts : [];
      if (primaryPosts.length > 0) {
        setPosts(primaryPosts);
      } else {
        const suggestedFeed = await api.getPosts(null, null, 'suggested');
        const suggestedPosts = Array.isArray(suggestedFeed?.posts) ? suggestedFeed.posts : [];
        if (suggestedPosts.length > 0) {
          setPosts(suggestedPosts);
        } else {
          const fallbackReels = await api.getReelsFeed();
          setPosts(mapReelsToFeedPosts(fallbackReels));
        }
      }

      // Set conversations
      setConversations(apiConversations || []);

      // Set bookmarks
      const bookmarkIds = new Set((bookmarkData?.bookmarks || []).map(b => b.postId));
      setBookmarks(bookmarkIds);

      // Set following users
      const followingIds = new Set((apiFollowing || []).map(f => f.id));
      setFollowingUsers(followingIds);

      // Set blocked users
      const blockedIds = new Set((apiBlocks || []).map(b => b.id));
      setBlockedUsers(blockedIds);

      // Set suggested users
      setUsers(apiUsers || []);

    } catch (error) {
      console.error('Failed to load app data:', error);
      const errorMessage = error?.message || String(error);
      // If we get a 401 error, try to refresh the token
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Invalid or expired token')) {
        try {
          const newToken = await refreshAccessToken();
          if (newToken) {
            // Retry loading data with new token
            try {
              const username = user?.username;
              const [feedPosts, apiConversations, apiBlocks, apiUsers, apiFollowing, bookmarkData] = await Promise.all([
                api.getPosts(),
                api.getConversations(),
                api.getBlocks(),
                api.getSuggestedUsers(),
                username ? api.getUserFollowing(username) : Promise.resolve([]),
                api.getBookmarks(),
              ]);

              // Set posts
              const retryPosts = Array.isArray(feedPosts?.posts) ? feedPosts.posts : [];
              if (retryPosts.length > 0) {
                setPosts(retryPosts);
              } else {
                const suggestedFeed = await api.getPosts(null, null, 'suggested');
                const suggestedPosts = Array.isArray(suggestedFeed?.posts) ? suggestedFeed.posts : [];
                if (suggestedPosts.length > 0) {
                  setPosts(suggestedPosts);
                } else {
                  const fallbackReels = await api.getReelsFeed();
                  setPosts(mapReelsToFeedPosts(fallbackReels));
                }
              }

              // Set conversations
              setConversations(apiConversations || []);

              // Set bookmarks
              const bookmarkIds = new Set((bookmarkData?.bookmarks || []).map(b => b.postId));
              setBookmarks(bookmarkIds);

              // Set following users
              const followingIds = new Set((apiFollowing || []).map(f => f.id));
              setFollowingUsers(followingIds);

              // Set blocked users
              const blockedIds = new Set((apiBlocks || []).map(b => b.id));
              setBlockedUsers(blockedIds);

              // Set suggested users
              setUsers(apiUsers || []);
            } catch (retryError) {
              console.error('Failed to load app data after token refresh:', retryError);
            }
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, refreshAccessToken]);

  const loadBookmarks = useCallback(async () => {
    try {
      const bookmarkData = await api.getBookmarks();
      const bookmarkIds = new Set((bookmarkData?.bookmarks || []).map(b => b.postId));
      setBookmarks(bookmarkIds);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  }, []);

  // Load data when token changes
  useEffect(() => {
    loadAllData();
  }, [user, loadAllData]);

  return (
    <AppDataContext.Provider value={{
      // State
      posts,
      conversations,
      likedPosts,
      bookmarkedPosts: bookmarks,
      followingUsers,
      blockedUsers,
      users,
      loading,

      // Real-time updates
      latestEngagementUpdate,

      // Setters
      setPosts,
      setConversations,
      setBookmarks,
      setFollowingUsers,
      setBlockedUsers,
      setUsers,

      // Loaders
      loadPosts,
      loadConversations,
      loadBookmarks,
      loadAllData,

      // Centralized engagement state management
      updatePostLikeState,
      updatePostBookmarkState,
      updatePostEngagement,
    }}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
};

export default AppDataContext;




