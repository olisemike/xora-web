import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IoArrowBack, IoChevronForward, IoMoonOutline, IoLanguageOutline,
  IoNotificationsOutline, IoLockClosedOutline, IoShieldOutline,
  IoPersonOutline, IoHelpCircleOutline, IoInformationCircleOutline,
  IoLogOutOutline, IoAccessibilityOutline, IoEyeOutline
} from 'react-icons/io5';
import { useToast } from '../components/Toast';
import './SettingsPage.css';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { _t, i18n } = useTranslation();
  const toast = useToast();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
    { code: 'pt', name: 'Português' },
    { code: 'ru', name: 'Русский' },
    { code: 'ja', name: '日本語' },
    { code: 'zh', name: '中文' },
    { code: 'ar', name: 'العربية' }
  ];

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    setShowLanguageModal(false);
  };

  const settingsSections = [
    {
      title: 'Appearance',
      items: [
        {
          icon: <IoMoonOutline />,
          label: 'Theme',
          value: 'Auto',
          onClick: () => navigate('/settings/theme')
        },
        {
          icon: <IoLanguageOutline />,
          label: 'Language',
          value: languages.find(l => l.code === i18n.language)?.name || 'English',
          onClick: () => setShowLanguageModal(true)
        },
        {
          icon: <IoEyeOutline />,
          label: 'Display',
          value: 'Default',
          onClick: () => navigate('/settings/display')
        }
      ]
    },
    {
      title: 'Account',
      items: [
        {
          icon: <IoPersonOutline />,
          label: 'Edit Profile',
          onClick: () => navigate('/settings/profile')
        },
        {
          icon: <IoLockClosedOutline />,
          label: 'Privacy',
          onClick: () => navigate('/settings/privacy')
        },
        {
          icon: <IoShieldOutline />,
          label: 'Security',
          onClick: () => navigate('/settings/security')
        },
        {
          icon: <IoNotificationsOutline />,
          label: 'Notifications',
          onClick: () => navigate('/settings/notifications')
        }
      ]
    },
    {
      title: 'Accessibility',
      items: [
        {
          icon: <IoAccessibilityOutline />,
          label: 'Accessibility',
          onClick: () => navigate('/settings/accessibility')
        }
      ]
    },
    {
      title: 'Support',
      items: [
        {
          icon: <IoHelpCircleOutline />,
          label: 'Help Center',
          onClick: () => window.open('https://help.xorasocial.com', '_blank')
        },
        {
          icon: <IoInformationCircleOutline />,
          label: 'About',
          onClick: () => navigate('/settings/about')
        }
      ]
    },
    {
      title: 'Account Actions',
      items: [
        {
          icon: <IoLogOutOutline />,
          label: 'Logout',
          onClick: () => {
            toast.info('Logging out...');
            navigate('/login');
          },
          danger: true
        }
      ]
    }
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h1>Settings</h1>
      </div>

      <div className="settings-content">
        {settingsSections.map((section, idx) => (
          <div key={section.title} className="settings-section">
            <h2 className="section-title">{section.title}</h2>
            <div className="settings-items">
              {section.items.map((item, itemIdx) => (
                <button
                  key={item.label}
                  className={`setting-item ${item.danger ? 'danger' : ''}`}
                  onClick={item.onClick}
                >
                  <div className="setting-left">
                    <span className="setting-icon">{item.icon}</span>
                    <span className="setting-label">{item.label}</span>
                  </div>
                  <div className="setting-right">
                    {item.value ? <span className="setting-value">{item.value}</span> : null}
                    <IoChevronForward className="chevron" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Language Modal */}
      {showLanguageModal ? <div className="modal-overlay" onClick={() => setShowLanguageModal(false)}>
          <div className="language-modal" onClick={e => e.stopPropagation()}>
            <h2>Select Language</h2>
            <div className="language-list">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  className={`language-item ${i18n.language === lang.code ? 'active' : ''}`}
                  onClick={() => handleLanguageChange(lang.code)}
                >
                  {lang.name}
                  {i18n.language === lang.code && <span className="checkmark">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div> : null}
    </div>
  );
};

export default SettingsPage;





