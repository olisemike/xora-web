import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';
import AvatarPlaceholder from '../assets/avatar-placeholder.svg';
import './Pages.css';
import { useAuth } from '../contexts/AuthContext';
import { getCsrfToken, extractError } from '../services/api';

// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const API_URL = import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api';

const Pages = () => {
  const [pages, setPages] = useState([]);
  const [_showCreateForm, setShowCreateForm] = useState(false);
  const [pageName, setPageName] = useState('');
  const [pageBio, setPageBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);
  const navigate = useNavigate();
  const { getCurrentUserId } = useAuth();
  const activeIdentity = { type: 'user', id: getCurrentUserId() };
  const { t } = useTranslation();

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/pages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, `Failed to load pages: ${response.status}`);
        throw new Error(message);
      }
      const pagesFromApi = data.data?.pages || [];
      const mapped = pagesFromApi.map((p) => ({
        id: p.id,
        name: p.name,
        username: p.username,
        avatar: p.avatar_url || null,
        bio: p.bio || '',
      }));
      setPages(mapped);
    } catch (err) {
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const isPageIdentity = false;
  const identityName = 'Your personal profile';
  const identityUsername = '';
  const identityAvatar = null;

  const handleCreatePage = async () => {
    if (!pageName.trim()) return;

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_URL}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          name: pageName.trim(),
          bio: pageBio.trim() || 'New Page',
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, `Failed to create page: ${response.status}`);
        throw new Error(message);
      }
      const p = data.data?.page || data.data;
      const newPage = {
        id: p.id,
        name: p.name,
        avatar: p.avatar_url || null,
        bio: p.bio || '',
      };
      setPages([newPage, ...pages]);
      setPageName('');
      setPageBio('');
      setShowCreateForm(false);
    } catch (err) {
      // Ignore page creation errors
    }
  };

  if (loading) {
    return (
      <div className="pages-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pages-container">
      <div className="pages-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h2>{t('common.pages')}</h2>
      </div>

      <div className="identity-status">
        <div className="identity-card">
          <div className="identity-main">
            <div className="identity-avatar">
              {identityAvatar ? (
                <img src={identityAvatar} alt={identityName} />
              ) : (
                <div className="identity-avatar-placeholder">
                  {identityName?.charAt(0) || 'Y'}
                </div>
              )}
            </div>
            <div className="identity-info">
              <span className="identity-title">
                {isPageIdentity ? t('pages.actingAsPage', 'Acting as page') : t('pages.actingAsUser', 'Acting as you')}
              </span>
              <span className="identity-name">{identityName}</span>
              {Boolean(identityUsername) && (
                <span className="identity-username">@{identityUsername}</span>
              )}
            </div>
          </div>
          <div className="identity-actions">
            {Boolean(!isPageIdentity) && (
              <span className="identity-chip user">
                User
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="create-page-section">
        <h3>{t('pages.createHeading', 'Create/Add to Pages')}</h3>
        <input
          id="page-name"
          name="pageName"
          type="text"
          placeholder="Input your New Page Name"
          value={pageName}
          maxLength={40}
          onChange={(e) => setPageName(e.target.value)}
          className="page-name-input"
        />
        <textarea
          id="page-bio"
          name="pageBio"
          placeholder="Page bios information....."
          value={pageBio}
          maxLength={160}
          onChange={(e) => setPageBio(e.target.value)}
          className="page-bio-input"
        />
        <button className="create-page-btn" onClick={handleCreatePage}>
          Create Page
        </button>
      </div>

      {pages.length === 0 ? (
        <div className="empty-state">
<h3>{t('empty.nothingToShow')}</h3>
        </div>
      ) : (
        <>
          <h4 className="my-pages-title">My Pages:</h4>
          <div className="pages-list">
            {pages.map((page) => (
              <div key={page.id} className="page-item">
                {page.avatar ? (
                  <img 
                    src={page.avatar} 
                    alt={page.name} 
                    className="page-avatar" 
                    onClick={() => setPreviewImage(page.avatar)}
                  />
                ) : (
                  <img
                    src={AvatarPlaceholder}
                    alt="Default page avatar"
                    className="page-avatar"
                    onClick={() => setPreviewImage(AvatarPlaceholder)}
                  />
                )}
                <span className="page-name">{page.name}</span>

                <div className="page-actions">
                  <button
                    className="open-page-btn"
                    onClick={() => navigate(`/page/${page.id}`, { state: { page } })}
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
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
    </div>
  );
};

export default Pages;





