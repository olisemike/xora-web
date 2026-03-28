import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchPage.css';
import { api } from '../services/api';
import PostMedia from '../components/PostMedia';

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, users, posts, hashtags, pages
  const [searchResults, setSearchResults] = useState({
    users: [],
    posts: [],
    hashtags: [],
    pages: []
  });
  const [pagination, setPagination] = useState({
    hasMore: false,
    nextCursor: null
  });
  const [recentSearches, setRecentSearches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState('relevance'); // relevance, recent, popular
  const searchInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Focus search input on mount
    searchInputRef.current?.focus();

    // Load recent searches from localStorage
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecentSearches(Array.isArray(parsed) ? parsed : []);
      } catch (error) {localStorage.removeItem('recentSearches');
        setRecentSearches([]);
      }
    }
  }, []);

  const performSearch = useCallback(async (query, append = false) => {
    try {
      const searchType = activeTab === 'all' ? 'all' : activeTab;
      const options = {
        type: searchType,
        limit: 20,
        sort: sortBy,
      };

      if (append && pagination.nextCursor) {
        options.cursor = pagination.nextCursor;
      }

      const result = await api.searchAll(query, options);

      // Map the normalized results to the UI format
      const users = result.users.map((u) => ({
        ...u,
        followers: '', // UI expects this field
      }));

      const posts = result.posts.map((p) => ({
        id: p.id,
        author: p.user?.username || p.user?.name || 'user',
        avatar: p.user?.avatar || null,
        image: p.image || null,
        media: Array.isArray(p.media) ? p.media : [],
        likes: typeof p.likes === 'number' ? p.likes : 0,
        caption: typeof p.content === 'string' ? p.content : '',
        timestamp: p.timestamp || '',
      }));

      // hashtags and pages are already in the right format from api.searchAll
      const { hashtags, pages, pagination: newPagination } = result;

      if (append) {
        setSearchResults((prev) => ({
          users: [...prev.users, ...users],
          posts: [...prev.posts, ...posts],
          hashtags: [...prev.hashtags, ...hashtags],
          pages: [...prev.pages, ...pages],
        }));
      } else {
        setSearchResults({ users, posts, hashtags, pages });
      }

      setPagination(newPagination);
    } catch (err) {
      if (!append) {
        setSearchResults({ users: [], posts: [], hashtags: [], pages: [] });
        setPagination({ hasMore: false, nextCursor: null });
      }
    }
  }, [activeTab, sortBy, pagination.nextCursor]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults({ users: [], posts: [], hashtags: [], pages: [] });
        setPagination({ hasMore: false, nextCursor: null });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, sortBy, performSearch]);

  const loadMore = async () => {
    if (!pagination.hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    await performSearch(searchQuery, true);
    setIsLoadingMore(false);
  };

  const saveRecentSearch = (query, type, data) => {
    const newSearch = {
      query,
      type,
      data,
      timestamp: Date.now()
    };

    const updated = [newSearch, ...recentSearches.filter(s => 
      !(s.query === query && s.type === type)
    )].slice(0, 10); // Keep only last 10

    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const handleUserClick = (user) => {
    saveRecentSearch(user.username, 'user', user);
    navigate(`/profile/${user.username}`);
  };

  const handleHashtagClick = (tag) => {
    saveRecentSearch(tag, 'hashtag', { tag });
    navigate(`/hashtag/${tag}`);
  };

  const handlePostClick = (post) => {
    navigate(`/post/${post.id}`);
  };

  const handleRecentClick = (search) => {
    // Re-run the search with the recent query
    setSearchQuery(search.query);
    // If it was a specific type search, navigate there
    if (search.type === 'user' && search.data?.username) {
      navigate(`/profile/${search.data.username}`);
    } else if (search.type === 'hashtag' && search.data?.tag) {
      navigate(`/hashtag/${search.data.tag}`);
    }
  };

  const getFilteredResults = () => {
    switch(activeTab) {
      case 'users':
        return { users: searchResults.users, posts: [], hashtags: [], pages: [] };
      case 'posts':
        return { users: [], posts: searchResults.posts, hashtags: [], pages: [] };
      case 'hashtags':
        return { users: [], posts: [], hashtags: searchResults.hashtags, pages: [] };
      case 'pages':
        return { users: [], posts: [], hashtags: [], pages: searchResults.pages };
      default:
        return searchResults;
    }
  };

  const filteredResults = getFilteredResults();
  const hasResults = filteredResults.users.length > 0 || 
                     filteredResults.posts.length > 0 || 
                     filteredResults.hashtags.length > 0 ||
                     filteredResults.pages.length > 0;

  return (
    <div className="search-page">
      <div className="search-header">
        <div className="search-input-wrapper">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={searchInputRef}
            id="search-input"
            name="search"
            type="text"
            className="search-input"
            placeholder="Search users, posts, and hashtags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? <button 
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button> : null}
        </div>

        {searchQuery ? <div className="search-tabs">
            <button 
              className={`search-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button 
              className={`search-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
            <button 
              className={`search-tab ${activeTab === 'pages' ? 'active' : ''}`}
              onClick={() => setActiveTab('pages')}
            >
              Pages
            </button>
            <button 
              className={`search-tab ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              Posts
            </button>
            <button 
              className={`search-tab ${activeTab === 'hashtags' ? 'active' : ''}`}
              onClick={() => setActiveTab('hashtags')}
            >
              Hashtags
            </button>
          </div> : null}

        {searchQuery && (activeTab === 'all' || activeTab === 'posts') ? (
          <div className="search-sort">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="relevance">Most Relevant</option>
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        ) : null}
      </div>

      <div className="search-content">
        {isSearching ? <div className="search-loading">
            <div className="loading-spinner"></div>
            <p>Searching...</p>
          </div> : null}

        {!searchQuery && recentSearches.length > 0 && (
          <div className="recent-searches">
            <div className="recent-header">
              <h3>Recent</h3>
              <button onClick={clearRecentSearches} className="clear-all-btn">
                Clear All
              </button>
            </div>
            <div className="recent-list">
              {recentSearches.map((search, index) => (
                <div
                  key={search}
                  className="recent-item"
                  onClick={() => handleRecentClick(search)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleRecentClick(search)}
                >
                  <div className="recent-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div className="recent-text">
                    <span className="recent-query">{search.query}</span>
                    <span className="recent-type">{search.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchQuery && !isSearching && !hasResults ? <div className="no-results">
            <svg className="no-results-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <h3>No results found</h3>
            <p>Try searching for something else</p>
          </div> : null}

        {searchQuery && !isSearching && hasResults ? <div className="search-results">
            {filteredResults.pages.length > 0 && (
              <div className="results-section">
                <h3 className="section-title">Pages</h3>
                <div className="pages-results">
                  {filteredResults.pages.map(page => (
                    <div
                      key={page.id}
                      className="page-result-item"
                      onClick={() => navigate(`/page/${page.id}`)}
                    >
                      <img src={page.avatar || '/default-avatar.png'} alt={page.name || 'Page'} className="page-avatar" />
                      <div className="page-info">
                        <div className="page-name-wrapper">
                          <span className="page-name">{page.name}</span>
                          {page.verified ? <svg className="verified-badge" width="14" height="14" viewBox="0 0 24 24" fill="#1DA1F2">
                              <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/>
                            </svg> : null}
                        </div>
                        <div className="page-meta">
                          <span className="page-description">Business page</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredResults.users.length > 0 && (
              <div className="results-section">
                <h3 className="section-title">Users</h3>
                <div className="users-results">
                  {filteredResults.users.map(user => (
                    <div
                      key={user.id}
                      className="user-result-item"
                      onClick={() => handleUserClick(user)}
                    >
                      <img src={user.avatar || '/default-avatar.png'} alt={user.username || 'User'} className="user-avatar" />
                      <div className="user-info">
                        <div className="user-name-wrapper">
                          <span className="user-username">{user.username}</span>
                          {user.verified ? <svg className="verified-badge" width="14" height="14" viewBox="0 0 24 24" fill="#1DA1F2">
                              <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/>
                            </svg> : null}
                        </div>
                        <div className="user-meta">
                          <span className="user-fullname">{user.name}</span>
                          <span className="user-followers">{user.followers} followers</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredResults.hashtags.length > 0 && (
              <div className="results-section">
                <h3 className="section-title">Hashtags</h3>
                <div className="hashtags-results">
                  {filteredResults.hashtags.map((hashtag, index) => (
                    <div 
                      key={hashtag.tag}
                      className="hashtag-result-item"
                      onClick={() => handleHashtagClick(hashtag.tag)}
                    >
                      <div className="hashtag-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M10.5 3h-1l-1 6h-3l.5-3h-2l-.5 3H1v2h2l-1 6H0v2h1.5l-.5 3h2l.5-3h3l-.5 3h2l.5-3H11v-2H9l1-6h3l-.5 3h2l.5-3H17v-2h-2l1-6h-2l-1 6h-3l1-6zm-2 8h3l-1 6h-3l1-6z"/>
                        </svg>
                      </div>
                      <div className="hashtag-info">
                        <span className="hashtag-name">#{hashtag.tag}</span>
                        <span className="hashtag-count">{hashtag.posts} posts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredResults.posts.length > 0 && (
              <div className="results-section">
                <h3 className="section-title">Posts</h3>
                <div className="posts-results">
                  {filteredResults.posts.map(post => (
                    <div
                      key={post.id}
                      className={`post-result-item ${(!post.image && (!post.media || post.media.length === 0)) ? 'text-only' : ''}`}
                      onClick={() => handlePostClick(post)}
                    >
                      {(() => {
                        const mediaItems = Array.isArray(post.media) && post.media.length > 0
                          ? post.media
                          : (post.image ? [{ type: 'image', url: post.image }] : []);

                        if (mediaItems.length > 0) {
                          return (
                            <div className="post-thumbnail">
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
                                    handlePostClick(post);
                                  }
                                }}
                              />
                            </div>
                          );
                        }

                        return (
                          <div className="post-text-preview">
                            <p className="post-caption">{post.caption.length > 100 ? `${post.caption.substring(0, 100)}...` : post.caption}</p>
                            <div className="post-text-meta">
                              <span className="post-author">@{post.author}</span>
                              <span className="post-likes">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                                {post.likes.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pagination.hasMore ? <div className="load-more-container">
                <button 
                  className="load-more-btn"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div> : null}
          </div> : null}
      </div>
    </div>
  );
};

export default SearchPage;





