import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { IoGlobeOutline, IoCheckmark } from 'react-icons/io5';
import './LanguageSelector.css';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', countryCode: 'US' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', countryCode: 'ES' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', countryCode: 'FR' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', countryCode: 'SA' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', countryCode: 'CN' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', countryCode: 'BR' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', countryCode: 'IN' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', countryCode: 'DE' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', countryCode: 'JP' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', countryCode: 'RU' },
];

const LanguageSelector = ({ showIcon = true, compact = false }) => {
  const { i18n, t } = useTranslation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef(null);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  useEffect(() => {
    if (showDropdown && buttonRef.current && compact) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [showDropdown, compact]);

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    setShowDropdown(false);
  };

  if (compact) {
    return (
      <div className="language-selector compact">
        <button
          ref={buttonRef}
          className="language-trigger compact"
          onClick={() => setShowDropdown(!showDropdown)}
          title={t('common.changeLanguage')}
          aria-label={t('common.changeLanguage')}
        >
          <IoGlobeOutline />
          <span className="language-trigger-label">{t('common.language')}</span>
        </button>

        {showDropdown ? createPortal(
          <>
            <div
              className="language-overlay"
              onClick={() => setShowDropdown(false)}
            />
          <div
            className="language-dropdown language-dropdown-fixed"
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
              left: 'auto',
              zIndex: 99999
            }}
          >
              <div style={{ padding: '8px', color: 'white', fontSize: '12px', borderBottom: '1px solid #E91E63' }}>
                Select Language ({languages.length} options)
              </div>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className={`language-option ${lang.code === i18n.language ? 'active' : ''}`}
                  onClick={() => handleLanguageChange(lang.code)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    color: '#ffffff',
                    width: '100%',
                    cursor: 'pointer',
                    minHeight: '60px'
                  }}
                >
                  <span className="language-flag-wrapper">
                    <span className="language-flag" style={{ fontSize: '20px', marginRight: '8px' }}>{lang.flag}</span>
                    <span className="language-country-code" style={{
                      display: 'inline-flex',
                      padding: '4px 8px',
                      background: '#E91E63',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '900',
                      borderRadius: '4px',
                      minWidth: '32px'
                    }}>{lang.countryCode}</span>
                  </span>
                  <div className="language-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span className="language-name" style={{ fontWeight: '600', color: '#ffffff', fontSize: '15px' }}>
                      {lang.nativeName || lang.name || lang.code}
                    </span>
                    <span className="language-name-en" style={{ fontSize: '13px', color: '#cccccc' }}>
                      {lang.name || lang.code}
                    </span>
                  </div>
                  {lang.code === i18n.language && (
                    <IoCheckmark className="language-check" style={{ color: '#E91E63', fontSize: '20px' }} />
                  )}
                </button>
              ))}
            </div>
          </>,
          document.body
        ) : null}
      </div>
    );
  }

  return (
    <div className="language-selector">
      <label className="language-label">
        {showIcon ? <IoGlobeOutline className="language-icon" /> : null}
        {t('common.changeLanguage')}
      </label>
      
      <button
        className="language-trigger"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span className="language-flag-wrapper">
          <span className="language-flag">{currentLanguage.flag}</span>
          <span className="language-country-code">{currentLanguage.countryCode}</span>
        </span>
        <span className="language-text">{currentLanguage.nativeName}</span>
        <span className="language-arrow">▼</span>
      </button>

      {showDropdown ? <>
          <div 
            className="language-overlay" 
            onClick={() => setShowDropdown(false)} 
          />
          <div className="language-dropdown">
            <div style={{ padding: '8px', color: 'white', fontSize: '12px', borderBottom: '1px solid #E91E63' }}>
              Select Language ({languages.length} options)
            </div>
            {languages.map((lang) => (
              <button
                key={lang.code}
                className={`language-option ${lang.code === i18n.language ? 'active' : ''}`}
                onClick={() => handleLanguageChange(lang.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  width: '100%',
                  cursor: 'pointer',
                  minHeight: '60px'
                }}
              >
                <span className="language-flag-wrapper">
                  <span className="language-flag" style={{ fontSize: '20px', marginRight: '8px' }}>{lang.flag}</span>
                  <span className="language-country-code" style={{
                    display: 'inline-flex',
                    padding: '4px 8px',
                    background: '#E91E63',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: '900',
                    borderRadius: '4px',
                    minWidth: '32px'
                  }}>{lang.countryCode}</span>
                </span>
                <div className="language-info" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="language-name" style={{ fontWeight: '600', color: '#ffffff', fontSize: '15px' }}>
                    {lang.nativeName}
                  </span>
                  <span className="language-name-en" style={{ fontSize: '13px', color: '#cccccc' }}>
                    {lang.name}
                  </span>
                </div>
                {lang.code === i18n.language && (
                  <IoCheckmark className="language-check" style={{ color: '#E91E63', fontSize: '20px' }} />
                )}
              </button>
            ))}
          </div>
        </> : null}
    </div>
  );
};

export default LanguageSelector;





