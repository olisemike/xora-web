import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoDownloadOutline, IoCheckmarkCircle, IoWarningOutline } from 'react-icons/io5';
import './ExportData.css';

// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const API_URL = import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api';

const ExportData = () => {
  const navigate = useNavigate();
  const [selectedData, setSelectedData] = useState({
    profile: true,
    posts: true,
    comments: true,
    messages: true,
    likes: true,
    followers: true,
    following: true,
    media: false,
    settings: true
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const dataTypes = [
    { 
      key: 'profile', 
      label: 'Profile Information', 
      description: 'Name, bio, profile picture, contact info',
      size: '~2 KB'
    },
    { 
      key: 'posts', 
      label: 'Posts', 
      description: 'All your posts, captions, timestamps',
      size: '~500 KB'
    },
    { 
      key: 'comments', 
      label: 'Comments', 
      description: 'Comments you made on posts',
      size: '~100 KB'
    },
    { 
      key: 'messages', 
      label: 'Messages', 
      description: 'Direct message conversations',
      size: '~300 KB'
    },
    { 
      key: 'likes', 
      label: 'Likes & Reactions', 
      description: 'Posts and comments you liked',
      size: '~50 KB'
    },
    { 
      key: 'followers', 
      label: 'Followers', 
      description: 'List of your followers',
      size: '~20 KB'
    },
    { 
      key: 'following', 
      label: 'Following', 
      description: 'Accounts you follow',
      size: '~20 KB'
    },
    { 
      key: 'media', 
      label: 'Media Files', 
      description: 'Photos and videos (may be large)',
      size: '~50 MB',
      warning: 'This may take longer to process'
    },
    { 
      key: 'settings', 
      label: 'Settings & Preferences', 
      description: 'Account settings, privacy preferences',
      size: '~5 KB'
    }
  ];

  const handleToggle = (key) => {
    setSelectedData(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(selectedData).every(v => v);
    const newState = {};
    Object.keys(selectedData).forEach(key => {
      newState[key] = !allSelected;
    });
    setSelectedData(newState);
  };

  const generateExportData = (apiData) => {
    const exportPackage = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      userData: {},
    };

    if (!apiData) return exportPackage;

    if (selectedData.profile && apiData.user) {
      exportPackage.userData.profile = apiData.user;
    }

    if (selectedData.posts && apiData.posts) {
      exportPackage.userData.posts = apiData.posts;
    }

    if (selectedData.comments && apiData.comments) {
      exportPackage.userData.comments = apiData.comments;
    }

    if (selectedData.messages && apiData.messages) {
      exportPackage.userData.messages = apiData.messages;
    }

    if (selectedData.likes && apiData.likes) {
      exportPackage.userData.likes = apiData.likes;
    }

    if (selectedData.followers && apiData.followers) {
      exportPackage.userData.followers = apiData.followers;
    }

    if (selectedData.following && apiData.following) {
      exportPackage.userData.following = apiData.following;
    }

    if (selectedData.settings && apiData.settings) {
      exportPackage.userData.settings = apiData.settings;
    }

    return exportPackage;
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const response = await fetch(`${API_URL}/users/me/export`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const apiData = await response.json();
      if (!response.ok || !apiData?.success) {
        throw new Error(apiData?.error?.message || `Failed to export data: ${response.status}`);
      }

      const data = generateExportData(apiData.data);
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `xora-social-data-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportComplete(true);
      setTimeout(() => {
        setExportComplete(false);
      }, 3000);
    } catch (err) {
      // Ignore export errors
    } finally {
      setIsExporting(false);
    }
  };

  const selectedCount = Object.values(selectedData).filter(Boolean).length;
  const totalSize = dataTypes
    .filter(type => selectedData[type.key])
    .reduce((acc, type) => {
      const size = type.size.includes('MB') 
        ? parseFloat(type.size) * 1024 
        : parseFloat(type.size);
      return acc + size;
    }, 0);

  return (
    <div className="export-data-page">
      {/* Header */}
      <div className="export-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <div className="export-header-content">
          <h1 className="export-title">Export Your Data</h1>
          <p className="export-subtitle">Download a copy of your data (GDPR Compliant)</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="export-info-box">
        <IoWarningOutline className="info-icon" />
        <div className="info-content">
          <h3 className="info-title">About Data Export</h3>
          <p className="info-text">
            Your data will be exported in JSON format. This includes all selected information 
            from your account. The file can be opened with any text editor or JSON viewer.
          </p>
          <p className="info-text">
            <strong>Processing time:</strong> Usually takes a few seconds, but may take longer 
            for accounts with lots of media files.
          </p>
        </div>
      </div>

      {/* Selection Header */}
      <div className="selection-header">
        <div className="selection-info">
          <span className="selection-count">
            {selectedCount} of {dataTypes.length} selected
          </span>
          <span className="selection-size">
            Estimated size: {totalSize > 1024 ? `${(totalSize / 1024).toFixed(1)} MB` : `${totalSize.toFixed(0)} KB`}
          </span>
        </div>
        <button className="select-all-btn" onClick={handleSelectAll}>
          {Object.values(selectedData).every(v => v) ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Data Types List */}
      <div className="data-types-list">
        {dataTypes.map(type => (
          <div key={type.key} className="data-type-item">
            <label className="data-type-label">
              <input
                type="checkbox"
                checked={selectedData[type.key]}
                onChange={() => handleToggle(type.key)}
                className="data-type-checkbox"
              />
              <div className="checkbox-custom">
                {selectedData[type.key] ? <IoCheckmarkCircle /> : null}
              </div>
              <div className="data-type-info">
                <div className="data-type-name">{type.label}</div>
                <div className="data-type-description">{type.description}</div>
                {type.warning ? <div className="data-type-warning">
                    <IoWarningOutline />
                    {type.warning}
                  </div> : null}
              </div>
              <div className="data-type-size">{type.size}</div>
            </label>
          </div>
        ))}
      </div>

      {/* Export Button */}
      <div className="export-action">
        <button
          className="export-btn"
          onClick={handleExport}
          disabled={selectedCount === 0 || isExporting || exportComplete}
        >
          {isExporting ? (
            <>
              <div className="spinner-small"></div>
              Preparing Export...
            </>
          ) : exportComplete ? (
            <>
              <IoCheckmarkCircle />
              Export Complete!
            </>
          ) : (
            <>
              <IoDownloadOutline />
              Export Selected Data
            </>
          )}
        </button>
        {selectedCount === 0 && (
          <p className="export-hint">Select at least one data type to export</p>
        )}
      </div>

      {/* GDPR Notice */}
      <div className="gdpr-notice">
        <h4 className="gdpr-title">Your Rights Under GDPR</h4>
        <ul className="gdpr-list">
          <li>Right to access your personal data</li>
          <li>Right to data portability</li>
          <li>Right to rectification</li>
          <li>Right to erasure (delete account)</li>
          <li>Right to restrict processing</li>
        </ul>
        <p className="gdpr-text">
          For questions about your data or to exercise your rights, contact us at{' '}
          <a href="mailto:privacy@xorasocial.com">privacy@xorasocial.com</a>
        </p>
      </div>
    </div>
  );
};

export default ExportData;





