import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import Post from '../components/Post';
import './HashtagPage.css';
import { extractError } from '../services/api';

// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const API_URL = import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api';

const HashtagPage = () => {
  const { tag } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    postCount: 0,
    todayCount: 0,
    trend: 'up' // 'up', 'down', 'stable'
  });

  const loadHashtagData = useCallback(async () => {
    setLoading(true);

    try {
      const query = `#${tag}`;
      const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}&type=posts&limit=50`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, `Failed to load hashtag posts: ${response.status}`);
        throw new Error(message);
      }

      const postsFromApi = data.data?.posts || [];
      const mappedPosts = postsFromApi.map((p) => {
        let mediaArray = [];
        if (Array.isArray(p.media_urls)) {
          mediaArray = p.media_urls;
        } else if (typeof p.media_urls === 'string') {
          try {
            mediaArray = JSON.parse(p.media_urls);
          } catch {
            mediaArray = [];
          }
        }
        return {
          id: p.id,
          user: {
            id: p.actor_id,
            name: p.name || p.actor_name || p.username || 'User',
            username: p.username || 'user',
            avatar: p.avatar_url || null,
          },
          content: typeof p.content === 'string' ? p.content : '',
          media: mediaArray,
          likes: p.likesCount ?? p.likes_count ?? 0,
          comments: p.commentsCount ?? p.comments_count ?? 0,
          timestamp: p.created_at ? new Date(p.created_at * 1000).toISOString() : '',
          isLiked: false,
        };
      });

      setPosts(mappedPosts);
      setStats({
        postCount: mappedPosts.length,
        todayCount: 0,
        trend: 'stable',
      });
    } catch (err) {
      setPosts([]);
      setStats({ postCount: 0, todayCount: 0, trend: 'stable' });
    } finally {
      setLoading(false);
    }
  }, [tag]);

  useEffect(() => {
    loadHashtagData();
  }, [loadHashtagData]);

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)  }M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)  }K`;
    }
    return num.toString();
  };

  return (
    <div className="hashtag-page">
      {/* Header */}
      <div className="hashtag-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <div className="hashtag-info">
          <h1 className="hashtag-title">#{tag}</h1>
          <div className="hashtag-stats">
            <span className="stat-item">
              {formatNumber(stats.postCount)} posts
            </span>
            <span className="stat-divider">•</span>
            <span className="stat-item">
              {stats.todayCount} today
            </span>
            <span className={`trend-indicator ${stats.trend}`}>
              {stats.trend === 'up' ? '↗' : stats.trend === 'down' ? '↘' : '→'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="hashtag-content">
          <div className="hashtag-list">
            {posts.map((post) => (
              <Post key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HashtagPage;





