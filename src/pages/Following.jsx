import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Followers.css';

// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const API_URL = import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api';

const Following = () => {
  const { username } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const targetUsername = username || user?.username;

  useEffect(() => {
    const loadFollowing = async () => {
      if (!targetUsername) {
        setLoading(false);
        setError('No username specified');
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(
          `${API_URL}/users/${encodeURIComponent(targetUsername)}/following`,
          {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          throw new Error(
            data?.error?.message || `Failed to load following (${res.status})`
          );
        }
        const rows = data.data?.following || data.following || data.data || [];
        const mapped = rows.map((f) => ({
          id: f.id,
          name: f.name || f.username || 'Account',
          username: f.username,
          type: f.type || 'user',
        }));
        setFollowing(mapped);
        setError('');
      } catch (err) {setError(err.message || 'Failed to load following');
        setFollowing([]);
      } finally {
        setLoading(false);
      }
    };

    loadFollowing();
  }, [targetUsername]);

  if (authLoading) {
    return (
      <div className="followers-container">
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="followers-container">
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="followers-container">
      <div className="followers-header">
        <button
          className="back-btn"
          onClick={() => navigate(-1)}
        >
          ←
        </button>
        <h2>Following</h2>
        <div style={{ width: 32 }} />
      </div>

      {error ? <div className="followers-error">
          <p>{error}</p>
        </div> : null}

      {following.length === 0 && !error ? (
        <div className="followers-empty">
          <p>Not following anyone yet.</p>
        </div>
      ) : (
        <ul className="followers-list">
          {following.map((f) => (
            <li
              key={f.id}
              className="followers-item"
              onClick={() => {
                if (f.type === 'page') {
                  navigate(`/page/${f.id}`);
                } else {
                  navigate(`/profile/${f.username || f.id}`);
                }
              }}
            >
              <div className="followers-avatar">
                {(f.name || 'U')[0].toUpperCase()}
              </div>
              <div className="followers-info">
                <div className="followers-name">{f.name}</div>
                <div className="followers-username">@{f.username}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Following;





