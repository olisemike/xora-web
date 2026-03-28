import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IoSearchOutline } from 'react-icons/io5';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useWebSocket } from '../contexts/WebSocketContext';
import AvatarPlaceholder from '../assets/avatar-placeholder.svg';
import LanguageSelector from './LanguageSelector';
import './RightSidebar.css';

const RightSidebar = () => {
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [trendingTopics, setTrendingTopics] = useState([]);
  const navigate = useNavigate();
  const { _t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const { latestFollowAction } = useWebSocket();

  const loadData = async () => {
    try {
      const [users, topics] = await Promise.all([
        api.getSuggestedUsers(),
        api.getTrendingTopics(),
      ]);
      setSuggestedUsers(Array.isArray(users) ? users : []);
      setTrendingTopics(Array.isArray(topics) ? topics : []);
    } catch (error) {
      setSuggestedUsers([]);
      setTrendingTopics([]);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setSuggestedUsers([]);
      return;
    }
    loadData();
  }, [isAuthenticated]);

  // Refresh suggested users when follow actions occur (real-time)
  useEffect(() => {
    if (!latestFollowAction) return;
    // Refresh suggestions whenever a follow/unfollow action happens
    console.log('[RightSidebar] Follow action detected, refreshing suggestions');
    loadData();
  }, [latestFollowAction]);

  return (
    <div className="right-sidebar">
      {/* Language selector */}
      <div className="language-selector-wrapper">
        <LanguageSelector compact />
      </div>

      {/* Suggested for You */}
      <div className="suggested-section">
        <h3 className="section-title">Suggested for you</h3>
        <div className="suggested-list">
          {suggestedUsers.map((user) => (
            <div key={user.id} className="suggested-user">
              <div
                className="suggested-avatar-wrapper"
                onClick={() => navigate(`/profile/${user.username || user.id}`)}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="suggested-avatar"
                  />
                ) : (
                  <img
                    src={AvatarPlaceholder}
                    alt={user.name || 'User avatar'}
                    className="suggested-avatar"
                  />
                )}
              </div>
              <span className="suggested-name">{user.name}</span>
              <button
                className={`follow-btn ${user.isFollowing ? 'following' : ''}`}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!isAuthenticated) {
                    toast.error('Please log in to follow users');
                    return;
                  }

                  try {
                    if (user.isFollowing) {
                      // Unfollow
                      await api.unfollowUser('user', user.id);
                    } else {
                      // Follow
                      await api.followUser('user', user.id);
                    }

                    // Refresh suggestions from backend so state is always up to date
                    await loadData();
                  } catch (err) {
                    toast.error(err.message || 'Failed to update follow status');
                  }
                }}
              >
                {user.isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Topics */}
      <div className="trending-section">
        <h3 className="section-title">Trending Topics</h3>
        <div className="trending-list">
          {trendingTopics.map((topic) => (
            <div key={topic.tag} className="trending-item">
              <div 
                className="trending-info"
                onClick={() => {
                  const cleanTag = topic.tag.replace('#', '');
                  navigate(`/hashtag/${cleanTag}`);
                }}
                style={{ cursor: 'pointer' }}
              >
                <span className="trending-tag">{topic.tag}</span>
                <span className="trending-posts">{topic.posts}</span>
              </div>
              <button 
                className="search-topic-btn"
                onClick={() => {
                  const cleanTag = topic.tag.replace('#', '');
                  navigate(`/hashtag/${cleanTag}`);
                }}
              >
                <IoSearchOutline />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;





