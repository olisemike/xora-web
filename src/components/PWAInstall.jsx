import React, { useState, useEffect } from 'react';
import { IoCloseOutline, IoDownloadOutline, IoPhonePortraitOutline } from 'react-icons/io5';
import './PWAInstall.css';

const PWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const now = Date.now();
      // Show again after 7 days
      if (now - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      
      // Show the prompt after 3 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle install button click
  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    } else {
      // User dismissed the install prompt
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  // Handle dismiss
  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if installed or no prompt available
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="pwa-install-container">
      <div className="pwa-install-prompt">
        <button className="pwa-close-btn" onClick={handleDismiss} aria-label="Close">
          <IoCloseOutline />
        </button>
        
        <div className="pwa-content">
          <div className="pwa-icon">
            <IoPhonePortraitOutline />
          </div>
          
          <div className="pwa-text">
            <h3 className="pwa-title">Install Xora Social</h3>
            <p className="pwa-description">
              Install our app for quick access and a better experience. Works offline!
            </p>
          </div>
        </div>
        
        <div className="pwa-actions">
          <button className="pwa-btn pwa-btn-secondary" onClick={handleDismiss}>
            Not Now
          </button>
          <button className="pwa-btn pwa-btn-primary" onClick={handleInstall}>
            <IoDownloadOutline />
            Install
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstall;





