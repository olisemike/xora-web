import React, { useState, useEffect } from 'react';
import { IoChevronDown, IoCheckmarkCircle } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { useIdentity } from '../contexts/IdentityContext';
import AvatarPlaceholder from '../assets/avatar-placeholder.svg';
import './IdentitySwitcher.css';

// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const API_URL = import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api';

const IdentitySwitcher = ({ compact = false }) => {
  const { user, getCurrentUserId } = useAuth();
  const { activeIdentity, setActiveIdentity } = useIdentity();
  const [pages, setPages] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [_loading, setLoading] = useState(false);

  const loadPages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/pages`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error?.message || 'Failed to load pages');
      }
      const pagesFromApi = data.data?.pages || [];
      const mapped = pagesFromApi.map((p) => ({
        id: p.id,
        name: p.name,
        username: p.username || p.name?.toLowerCase().replace(/\s+/g, '_'),
        avatar: p.avatar_url || null,
      }));
      setPages(mapped);
    } catch (err) {
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  // Build list of available identities
  const identities = [
    {
      id: 'user',
      type: 'user',
      name: user?.name || user?.username || 'You',
      username: user?.username || 'you',
      avatar: user?.avatarUrl || user?.avatar_url || null,
      isUser: true,
    },
    ...pages.map(page => ({
      id: page.id,
      type: 'page',
      name: page.name,
      username: page.username,
      avatar: page.avatar,
      isUser: false,
    })),
  ];

  // Find current identity display info
  const currentIdentity = activeIdentity.type === 'user'
    ? identities[0]
    : identities.find(i => i.id === activeIdentity.id) || identities[0];

  const handleSelectIdentity = (identity) => {
    if (identity.isUser) {
      const newIdentity = { type: 'user', id: getCurrentUserId() };
      setActiveIdentity(newIdentity);
    } else {
      // Store page info in both top-level and meta for compatibility
      const newIdentity = {
        type: 'page',
        id: identity.id,
        name: identity.name,
        username: identity.username,
        avatar: identity.avatar,
        meta: {
          name: identity.name,
          username: identity.username,
          avatar: identity.avatar,
        },
      };
      setActiveIdentity(newIdentity);
    }
    setShowPicker(false);
  };

  const isActive = (identity) => {
    if (identity.isUser && activeIdentity.type === 'user') return true;
    if (!identity.isUser && activeIdentity.type === 'page' && activeIdentity.id === identity.id) return true;
    return false;
  };

  if (compact) {
    return (
      <div className="identity-switcher-compact">
        <button
          className="identity-switcher-trigger-compact"
          onClick={() => setShowPicker(!showPicker)}
        >
          <img
            src={currentIdentity.avatar || AvatarPlaceholder}
            alt={currentIdentity.name}
            className="identity-avatar-compact"
          />
          <IoChevronDown className="identity-chevron" />
        </button>

        {showPicker ? <>
            <div className="identity-modal-overlay" onClick={() => setShowPicker(false)} />
            <div className="identity-picker-modal">
              <h3 className="identity-modal-title">Switch Identity</h3>
              <div className="identity-list">
                {identities.map((identity) => (
                  <button
                    key={`${identity.type}-${identity.id}`}
                    className={`identity-item ${isActive(identity) ? 'active' : ''}`}
                    onClick={() => handleSelectIdentity(identity)}
                  >
                    <img
                      src={identity.avatar || AvatarPlaceholder}
                      alt={identity.name}
                      className="identity-avatar"
                    />
                    <div className="identity-info">
                      <span className="identity-name">{identity.name}</span>
                      <span className="identity-username">@{identity.username}</span>
                    </div>
                    {isActive(identity) && (
                      <IoCheckmarkCircle className="identity-check" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </> : null}
      </div>
    );
  }

  // Full mode
  return (
    <div className="identity-switcher-full">
      <button
        className="identity-switcher-trigger-full"
        onClick={() => setShowPicker(!showPicker)}
      >
        <img
          src={currentIdentity.avatar || AvatarPlaceholder}
          alt={currentIdentity.name}
          className="identity-avatar-full"
        />
        <div className="identity-info-full">
          <span className="identity-name-full">{currentIdentity.name}</span>
          <span className="identity-username-full">@{currentIdentity.username}</span>
        </div>
        <IoChevronDown className="identity-chevron" />
      </button>

      {showPicker ? <>
          <div className="identity-modal-overlay" onClick={() => setShowPicker(false)} />
          <div className="identity-picker-modal">
            <h3 className="identity-modal-title">Switch Identity</h3>
            <div className="identity-list">
              {identities.map((identity) => (
                <button
                  key={`${identity.type}-${identity.id}`}
                  className={`identity-item ${isActive(identity) ? 'active' : ''}`}
                  onClick={() => handleSelectIdentity(identity)}
                >
                  <img
                    src={identity.avatar || AvatarPlaceholder}
                    alt={identity.name}
                    className="identity-avatar"
                  />
                  <div className="identity-info">
                    <span className="identity-name">{identity.name}</span>
                    <span className="identity-username">@{identity.username}</span>
                  </div>
                  {isActive(identity) && (
                    <IoCheckmarkCircle className="identity-check" />
                  )}
                </button>
              ))}
              {pages.length === 0 && (
                <div className="no-pages-message">
                  <p>No pages created yet.</p>
                  <p style={{ fontSize: '13px', color: '#999', marginTop: '8px' }}>
                    Create a page from the Pages menu to switch identities.
                  </p>
                </div>
              )}
            </div>
          </div>
        </> : null}
    </div>
  );
};

export default IdentitySwitcher;





