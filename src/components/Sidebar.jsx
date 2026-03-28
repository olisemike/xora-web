import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  IoHomeOutline,
  IoSearchOutline,
  IoNotificationsOutline,
  IoNotifications,
  IoMailOutline,
  IoBookmarkOutline,
  IoPersonOutline,
  IoFilmOutline,
  IoAddCircleOutline,
  IoLogOutOutline,
  IoMoonOutline,
  IoSunnyOutline,
} from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './Sidebar.css';
import { useTranslation } from 'react-i18next';
import { useNotificationContext } from '../hooks/useNotifications';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, setMode } = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasUnread } = useNotificationContext();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const profilePath = `/profile/${user?.username || ''}`;

  const menuItems = [
    { icon: IoHomeOutline, label: t('home.title'), path: '/' },
    { icon: IoSearchOutline, label: t('explore.title'), path: '/explore' },
    { icon: IoFilmOutline, label: t('common.reels'), path: '/reels' },
    { icon: hasUnread ? IoNotifications : IoNotificationsOutline, label: t('notifications.title'), path: '/notifications', highlight: hasUnread },
    { icon: IoMailOutline, label: t('messages.title'), path: '/messages' },
    { icon: IoBookmarkOutline, label: t('common.bookmarks'), path: '/bookmarks' },
    { icon: IoPersonOutline, label: t('common.profile'), path: profilePath },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button className="logo" onClick={() => navigate('/')}>
          <span className="logo-xora">XoRa</span>
          <span className="logo-social">SociAl</span>
        </button>
        {user ? (
          <div className="sidebar-user-chip">
            <span className="sidebar-user-chip__label">Signed in</span>
            <strong>@{user.username || 'account'}</strong>
          </div>
        ) : null}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span style={{ position: 'relative' }}>
              <item.icon className="sidebar-icon" style={item.highlight ? { color: 'var(--primary)' } : undefined} />
              {Boolean(item.highlight) && <span className="sidebar-dot" />}
            </span>
            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-actions">
        <button className="sidebar-link add-post-btn" onClick={() => navigate('/create')}>
          <IoAddCircleOutline className="sidebar-icon" />
          <span className="sidebar-label">Add post</span>
        </button>
        <button className="sidebar-link" onClick={() => setMode(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <IoSunnyOutline className="sidebar-icon" /> : <IoMoonOutline className="sidebar-icon" />}
          <span className="sidebar-label">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
        <button className="sidebar-link logout-btn" onClick={handleLogout}>
          <IoLogOutOutline className="sidebar-icon" />
          <span className="sidebar-label">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
