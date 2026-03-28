import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoSearchOutline } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import AvatarPlaceholder from '../assets/avatar-placeholder.svg';
import './Bookmarks.css';
import { extractError } from '../services/api';
import api from '../services/api';

// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const API_URL = import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api';

const Bookmarks = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/bookmarks`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, `Failed to load bookmarks: ${response.status}`);
        throw new Error(message);
      }
      const items = (data.data?.bookmarks || []).map((b) => {
        // Backend returns joined posts rows (p.*), so b.id is the post id.
        const postId = b.post_id || b.id;

        // Derive a human-readable label from content if available
        const rawContent = b.content || b.post_content || '';
        const snippet = rawContent
          ? (rawContent.length > 80 ? `${rawContent.slice(0, 80)}...` : rawContent)
          : 'Post';

        return {
          id: postId,
          postId,
          name: snippet,
          avatar: b.avatar_url || b.post_author_avatar || null,
          username: b.username || b.post_author_username || null,
        };
      });
      setBookmarks(items);
    } catch (err) {
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const handleRemove = async (id) => {
    const target = bookmarks.find((b) => b.id === id);
    setBookmarks(bookmarks.filter(b => b.id !== id));

    if (!target || !target.postId) return;

    try {
      await api.unbookmarkPost(target.postId);
    } catch (err) {
      // Ignore bookmark removal errors
    }
  };

  const filteredBookmarks = bookmarks.filter(bookmark =>
    bookmark?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bookmarks-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bookmarks-container">
      <div className="bookmarks-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h2>{t('common.bookmarks')}</h2>
      </div>

      {bookmarks.length === 0 ? (
        <div className="empty-state">
<h3>{t('empty.nothingToShow')}</h3>
        </div>
      ) : (
        <>
          <div className="search-section">
            <div className="search-input-wrapper">
              <input
                id="bookmarks-search"
                name="bookmarksSearch"
                type="text"
                placeholder={t('bookmarks.searchPlaceholder', 'Search bookmarks...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bookmarks-search"
              />
              <IoSearchOutline className="search-icon" />
            </div>
          </div>

          <div className="bookmarks-list">
            {filteredBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="bookmark-item"
                onClick={() => {
                  if (bookmark.username) {
                    navigate(`/profile/${bookmark.username}`);
                  } else if (bookmark.postId) {
                    navigate(`/post/${bookmark.postId}`);
                  }
                }}
              >
                {bookmark.avatar ? (
                  <img 
                    src={bookmark.avatar} 
                    alt={bookmark.name} 
                    className="bookmark-avatar"
                    onClick={() => {
                      if (bookmark.username) {
                        navigate(`/profile/${bookmark.username}`);
                      } else if (bookmark.postId) {
                        navigate(`/post/${bookmark.postId}`);
                      }
                    }}
                  />
                ) : (
                  <img
                    src={AvatarPlaceholder}
                    alt="Default avatar"
                    className="bookmark-avatar"
                    onClick={() => {
                      if (bookmark.username) {
                        navigate(`/profile/${bookmark.username}`);
                      } else if (bookmark.postId) {
                        navigate(`/post/${bookmark.postId}`);
                      }
                    }}
                  />
                )}
                <span className="bookmark-name">{bookmark.name}</span>
                <button 
                  className="remove-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(bookmark.id);
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {filteredBookmarks.length === 0 && (
            <div className="no-results">
<p>{t('commonExtra.noResultsFor', { query: searchQuery })}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Bookmarks;





