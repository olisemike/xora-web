import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoSearchOutline, IoPersonRemoveOutline } from 'react-icons/io5';
import AvatarPlaceholder from '../assets/avatar-placeholder.svg';
import './BlockedUsers.css';
import { extractError, getCsrfToken } from '../services/api';

// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const API_URL = import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api';

const BlockedUsers = () => {
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const loadBlockedUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/blocks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, `Failed to load blocked users: ${response.status}`);
        throw new Error(message);
      }
      const items = (data.data?.blocks || []).map((b) => ({
        id: b.blocked_id,
        type: b.blocked_type,
        username: b.username || '',
        name: b.name || b.username || 'User',
        avatar: b.avatar_url || null,
        blockedAt: b.created_at ? new Date(b.created_at * 1000).toISOString() : new Date().toISOString(),
        reason: b.reason || '',
      }));
      setBlockedUsers(items);
    } catch (err) {
      setBlockedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const filteredUsers = blockedUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUnblockClick = (user) => {
    setSelectedUser(user);
    setShowUnblockDialog(true);
  };

  const confirmUnblock = async () => {
    if (!selectedUser) return;

    try {
      const csrfToken = getCsrfToken();
      await fetch(`${API_URL}/blocks`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          blockedType: selectedUser.type || 'user',
          blockedId: selectedUser.id,
        }),
      });
    } catch (err) {
      // Ignore unblock errors
    }

    setBlockedUsers(blockedUsers.filter(u => u.id !== selectedUser.id));
    setShowUnblockDialog(false);
    setSelectedUser(null);
  };

  return (
    <div className="blocked-users-page">
      {/* Header */}
      <div className="blocked-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <div className="blocked-header-content">
          <h1 className="blocked-title">Blocked Users</h1>
          <p className="blocked-subtitle">
            {blockedUsers.length} {blockedUsers.length === 1 ? 'user' : 'users'} blocked
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="blocked-search">
        <IoSearchOutline className="search-icon" />
        <input
          id="blocked-search"
          name="blockedSearch"
          type="text"
          placeholder="Search blocked users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="blocked-search-input"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="empty-state">
          <IoPersonRemoveOutline className="empty-icon" />
          <h2 className="empty-title">
            {searchQuery ? 'No users found' : 'No blocked users'}
          </h2>
          <p className="empty-text">
            {searchQuery
              ? 'Try searching with a different name or username'
              : 'Users you block will appear here'}
          </p>
        </div>
      ) : (
        <div className="blocked-list">
          {filteredUsers.map((user) => (
            <div key={user.id} className="blocked-user-item">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="blocked-avatar"
                />
              ) : (
                <img
                  src={AvatarPlaceholder}
                  alt="Default avatar"
                  className="blocked-avatar"
                />
              )}
              <div className="blocked-user-info">
                <div className="blocked-user-name">{user.name}</div>
                <div className="blocked-user-username">@{user.username}</div>
                <div className="blocked-user-meta">
                  <span className="blocked-date">
                    Blocked on {new Date(user.blockedAt).toLocaleDateString()}
                  </span>
                  {user.reason ? <>
                      <span className="meta-divider">•</span>
                      <span className="blocked-reason">{user.reason}</span>
                    </> : null}
                </div>
              </div>
              <button
                className="unblock-btn"
                onClick={() => handleUnblockClick(user)}
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Unblock Confirmation Dialog */}
      {showUnblockDialog && selectedUser ? <>
          <div className="dialog-overlay" onClick={() => setShowUnblockDialog(false)} />
          <div className="dialog">
            <h3 className="dialog-title">Unblock @{selectedUser.username}?</h3>
            <p className="dialog-text">
              They will be able to follow you, send you messages, and see your posts again.
            </p>
            <div className="dialog-actions">
              <button
                className="dialog-btn dialog-btn-cancel"
                onClick={() => setShowUnblockDialog(false)}
              >
                Cancel
              </button>
              <button
                className="dialog-btn dialog-btn-confirm"
                onClick={confirmUnblock}
              >
                Unblock
              </button>
            </div>
          </div>
        </> : null}
    </div>
  );
};

export default BlockedUsers;





