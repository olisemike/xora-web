import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoAddCircleOutline, IoMoonOutline, IoSunnyOutline } from 'react-icons/io5';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import SkipToMain from './SkipToMain';
import PWAInstall from './PWAInstall';
import MobileBottomNav from './MobileBottomNav';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import './Layout.css';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setMode } = useTheme();

  const toggleTheme = () => {
    setMode(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <SkipToMain />
      <div className="layout-shell">
        <Sidebar />
        <div className="layout-shell__content">
          <header className="layout-mobile-header">
            <button className="layout-mobile-header__brand" onClick={() => navigate('/')}>
              <span className="layout-mobile-header__xora">XoRa</span>
              <span className="layout-mobile-header__social">SociAl</span>
            </button>
            <div className="layout-mobile-header__actions">
              <button className="layout-mobile-header__icon" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'dark' ? <IoSunnyOutline /> : <IoMoonOutline />}
              </button>
              <button className="layout-mobile-header__icon layout-mobile-header__icon--accent" onClick={() => navigate('/create')} aria-label="Create post">
                <IoAddCircleOutline />
              </button>
            </div>
          </header>
          <main id="main-content" className="main-content" role="main" aria-label="Main content">
            <div className="main-content__inner">{children}</div>
          </main>
        </div>
        <RightSidebar />
      </div>
      <MobileBottomNav user={user} />
      <PWAInstall />
    </>
  );
};

export default Layout;
