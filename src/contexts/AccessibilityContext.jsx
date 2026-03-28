import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const AccessibilityContext = createContext(null);

const STORAGE_KEY = 'xora-accessibility-preferences';

const defaultPreferences = {
  textSize: 'default',
  boldText: false,
  highContrastMode: false,
  reduceMotion: false,
  captionsForVideos: true,
};

const applyPreferencesToDocument = (prefs) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Text size
  root.classList.toggle('text-size-large', prefs.textSize === 'large');

  // Bold text
  root.classList.toggle('bold-text', Boolean(prefs.boldText));

  // High contrast
  root.classList.toggle('high-contrast', Boolean(prefs.highContrastMode));

  // Reduced motion
  root.classList.toggle('reduce-motion', Boolean(prefs.reduceMotion));
};

export const AccessibilityProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(() => {
    if (typeof window === 'undefined') return defaultPreferences;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return defaultPreferences;
      const parsed = JSON.parse(stored);
      return { ...defaultPreferences, ...parsed };
    } catch (error) {
      // Clear corrupted data
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage errors while attempting to clear corrupted preferences
      }
      return defaultPreferences;
    }
  });

  useEffect(() => {
    applyPreferencesToDocument(preferences);

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        // Ignore storage errors
      }
    }
  }, [preferences]);

  const updateAccessibility = useCallback((partial) => {
    setPreferences((prev) => {
      const updated = {
        ...prev,
        ...partial,
      };
      
      // IMPORTANT: Apply changes and save to localStorage immediately
      applyPreferencesToDocument(updated);
      
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
          console.error('Failed to save accessibility preferences:', error);
        }
      }
      
      return updated;
    });
  }, []);

  return (
    <AccessibilityContext.Provider value={{ accessibility: preferences, updateAccessibility }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return ctx;
};





