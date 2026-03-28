import React from 'react';
import { IoArrowBack, IoPersonRemoveOutline } from 'react-icons/io5';
import { useNavigate } from 'react-router-dom';
import { useBlockList } from '../contexts/BlockContext';
import { useToast } from '../components/Toast';
import './BlockedUsersPage.css';

const BlockedUsersPage = () => {
  const navigate = useNavigate();
  const { blocked, unblock } = useBlockList();
  const toast = useToast();

  const handleUnblock = (entity) => {
    toast.info('Unblocking user...');
    unblock(entity.type, entity.id);
    toast.success('User unblocked successfully');
  };

  return (
    <div className="blocked-users-page">
      <div className="blocked-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h1>Blocked Users</h1>
      </div>

      <div className="blocked-content">
        {blocked.length === 0 ? (
          <div className="empty-state">
            <IoPersonRemoveOutline className="empty-icon" />
            <h2>No Blocked Items</h2>
            <p>You haven&apos;t blocked any users or pages yet</p>
          </div>
        ) : (
          <div className="blocked-list">
            {blocked.map(entity => (
              <div key={`${entity.type}-${entity.id}`} className="blocked-user-item">
                <div className="blocked-user-info">
                  <div className="blocked-avatar">
                    {entity.avatar ? (
                      <img src={entity.avatar} alt={entity.name} />
                    ) : (
                      <div className="avatar-placeholder">
                        {entity.name && entity.name[0] ? entity.name[0].toUpperCase() : 'U'}
                      </div>
                    )}
                  </div>
                  <div className="blocked-details">
                    <span className="blocked-name">{entity.name}</span>
                    {Boolean(entity.username) && (
                      <span className="blocked-username">@{entity.username}</span>
                    )}
                    <span className="blocked-date">
                      {entity.type === 'page' ? 'Page' : 'Profile'} blocked
                    </span>
                  </div>
                </div>
                <button 
                  className="unblock-btn"
                  onClick={() => handleUnblock(entity)}
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockedUsersPage;





