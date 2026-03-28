import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  IoHomeOutline,
  IoSearchOutline,
  IoFilmOutline,
  IoMailOutline,
  IoPersonOutline,
  IoAddCircleOutline,
} from 'react-icons/io5';
import './MobileBottomNav.css';

const navItems = [
  { icon: IoHomeOutline, label: 'Home', path: '/' },
  { icon: IoSearchOutline, label: 'Explore', path: '/explore' },
  { icon: IoFilmOutline, label: 'Reels', path: '/reels' },
  { icon: IoMailOutline, label: 'Messages', path: '/messages' },
  { icon: IoPersonOutline, label: 'Profile', path: null, dynamic: true },
];

const MobileBottomNav = ({ user }) => {
  const navigate = useNavigate();
  const profilePath = `/profile/${user?.username || ''}`;

  return (
    <div className="mobile-bottom-nav" role="navigation" aria-label="Primary">
      <div className="mobile-bottom-nav__items">
        {navItems.map((item, index) => {
          const path = item.dynamic ? profilePath : item.path;
          const Icon = item.icon;
          const link = (
            <NavLink
              key={item.label}
              to={path}
              className={({ isActive }) => `mobile-bottom-nav__link ${isActive ? 'is-active' : ''}`}
            >
              <Icon className="mobile-bottom-nav__icon" />
              <span className="mobile-bottom-nav__label">{item.label}</span>
            </NavLink>
          );

          if (index === 2) {
            return (
              <React.Fragment key={item.label}>
                <div className="mobile-bottom-nav__spacer" aria-hidden="true" />
                {link}
              </React.Fragment>
            );
          }

          return link;
        })}
      </div>
      <button className="mobile-bottom-nav__fab" onClick={() => navigate('/create')} aria-label="Create post">
        <IoAddCircleOutline />
      </button>
    </div>
  );
};

export default MobileBottomNav;
