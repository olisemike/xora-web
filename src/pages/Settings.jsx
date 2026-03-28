import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { IoArrowBack } from 'react-icons/io5';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { usePushNotifications } from '../hooks/usePushNotifications';
import './Settings.css';

const Settings = () => {
  const { logout, isAuthenticated, logoutAllDevices, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { accessibility, updateAccessibility } = useAccessibility();
  const { t } = useTranslation();
  
  // Grace period tracking - prevents server overwrites during local changes
  const lastSettingUpdateRef = useRef({});
  const GRACE_PERIOD_MS = 3000; // 3 second grace period after local update
  const INITIAL_LOAD_GRACE_PERIOD_MS = 10000; // 10 second grace period on initial load
  
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmTime, setDeleteConfirmTime] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  
  const [settings, setSettings] = useState({
    // Security
    privateAccount: true,
    turnOffComments: false,
    turnOffMessaging: true,
    twoFactorAuth: false,
    
    // Notifications
    pushNotifications: true,
    inAppNotifications: true,
    emailNotifications: false,
    tagNotifications: true,
    likesReactions: true,
    commentsReplies: true,
    newFollowers: true,
    messageNotifications: true,
    liveTrendingAlerts: false,
    doNotDisturb: false,
    
    // Content Preferences
    sensitiveContentVisibility: false,
    sensitiveContentSuggestion: false,
    topicInterests: true,
    mediaAutoplayWifi: true,
    mediaAutoplayMobile: false,
    dataSaverMode: false,
    
    // Accessibility (initialized from global preferences)
    textSize: accessibility.textSize || 'default', // 'default' or 'large'
    boldText: Boolean(accessibility.boldText),
    highContrastMode: Boolean(accessibility.highContrastMode),
    reduceMotion: Boolean(accessibility.reduceMotion),
    captionsForVideos: accessibility.captionsForVideos ?? true,
    
    // Content Warnings
    contentWarnings: true,
  });

  const [backupCodesInfo, setBackupCodesInfo] = useState(null);
  const [backupCodesLoading, setBackupCodesLoading] = useState(false);
  const [backupCodesRegenerating, setBackupCodesRegenerating] = useState(false);

  // Security modal states
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityModalAction, setSecurityModalAction] = useState(null); // 'disable2fa' | 'regenerateCodes'
  const [securityPassword, setSecurityPassword] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [securityModalLoading, setSecurityModalLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const {
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    error: pushError,
    requestPermission: requestPushPermission
  } = usePushNotifications(user?.id, { autoStart: false });

  /**
   * Check if a setting is within its grace period
   * Returns true if we should skip server update for this setting
   */
  const isInGracePeriod = (key) => {
    const lastUpdate = lastSettingUpdateRef.current[key];
    if (!lastUpdate) return false;
    return Date.now() - lastUpdate < GRACE_PERIOD_MS;
  };


  // Load settings from localStorage first, then from server
  useEffect(() => {
    // Load from localStorage immediately for instant UI
    const loadLocalSettings = () => {
      try {
        const cached = localStorage.getItem('xora_user_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      } catch (err) {
        console.error('Failed to load cached settings:', err);
      }
    };

    loadLocalSettings();
  }, []);

  // Load settings from backend when authenticated (reload on every mount to ensure persistence)
  useEffect(() => {
    if (!isAuthenticated) return;

    const initialLoadTime = Date.now();
    lastSettingUpdateRef.current = {}; // Reset grace period on new auth

    const load = async () => {
      setSettingsLoading(true);
      try {
        const server = await api.getSettings();
        if (server && Object.keys(server).length > 0) {
          // Check if we're in initial load grace period
          const timeSinceInitialLoad = Date.now() - initialLoadTime;
          const isInitialLoadGracePeriod = timeSinceInitialLoad < INITIAL_LOAD_GRACE_PERIOD_MS;

          setSettings((prev) => ({
            ...prev,
            // Privacy - respect grace period if setting was recently updated locally
            privateAccount: !isInGracePeriod('privateAccount') 
              ? (server.private_account !== undefined ? Boolean(server.private_account) : prev.privateAccount)
              : prev.privateAccount,
            turnOffComments: !isInGracePeriod('turnOffComments')
              ? (server.who_can_comment !== undefined ? server.who_can_comment.toLowerCase() === 'none' : prev.turnOffComments)
              : prev.turnOffComments,
            turnOffMessaging: !isInGracePeriod('turnOffMessaging')
              ? (server.who_can_message !== undefined ? server.who_can_message.toLowerCase() === 'none' : prev.turnOffMessaging)
              : prev.turnOffMessaging,
            
            // Sensitive content
            sensitiveContentVisibility: !isInGracePeriod('sensitiveContentVisibility')
              ? (server.display_sensitive_content !== undefined ? Boolean(server.display_sensitive_content) : prev.sensitiveContentVisibility)
              : prev.sensitiveContentVisibility,
            sensitiveContentSuggestion: !isInGracePeriod('sensitiveContentSuggestion')
              ? (server.suggest_sensitive_content !== undefined ? Boolean(server.suggest_sensitive_content) : prev.sensitiveContentSuggestion)
              : prev.sensitiveContentSuggestion,
            contentWarnings: !isInGracePeriod('contentWarnings')
              ? (server.content_warnings !== undefined ? Boolean(server.content_warnings) : prev.contentWarnings)
              : prev.contentWarnings,
            
            // Notifications
            emailNotifications: !isInGracePeriod('emailNotifications')
              ? (server.notifications_email !== undefined ? Boolean(server.notifications_email) : prev.emailNotifications)
              : prev.emailNotifications,
            pushNotifications: !isInGracePeriod('pushNotifications')
              ? (server.notifications_push !== undefined ? Boolean(server.notifications_push) : prev.pushNotifications)
              : prev.pushNotifications,
            inAppNotifications: !isInGracePeriod('inAppNotifications')
              ? (server.notifications_in_app !== undefined ? Boolean(server.notifications_in_app) : prev.inAppNotifications)
              : prev.inAppNotifications,
            tagNotifications: !isInGracePeriod('tagNotifications')
              ? (server.notify_mentions !== undefined ? Boolean(server.notify_mentions) : prev.tagNotifications)
              : prev.tagNotifications,
            likesReactions: !isInGracePeriod('likesReactions')
              ? (server.notify_likes !== undefined ? Boolean(server.notify_likes) : prev.likesReactions)
              : prev.likesReactions,
            commentsReplies: !isInGracePeriod('commentsReplies')
              ? (server.notify_comments !== undefined ? Boolean(server.notify_comments) : prev.commentsReplies)
              : prev.commentsReplies,
            newFollowers: !isInGracePeriod('newFollowers')
              ? (server.notify_follows !== undefined ? Boolean(server.notify_follows) : prev.newFollowers)
              : prev.newFollowers,
            messageNotifications: !isInGracePeriod('messageNotifications')
              ? (server.notify_messages !== undefined ? Boolean(server.notify_messages) : prev.messageNotifications)
              : prev.messageNotifications,
            liveTrendingAlerts: !isInGracePeriod('liveTrendingAlerts')
              ? (server.notify_shares !== undefined ? Boolean(server.notify_shares) : prev.liveTrendingAlerts)
              : prev.liveTrendingAlerts,
            doNotDisturb: !isInGracePeriod('doNotDisturb')
              ? (server.notifications_push !== undefined || server.notifications_in_app !== undefined
                ? (!server.notifications_push && Boolean(server.notifications_in_app))
                : prev.doNotDisturb)
              : prev.doNotDisturb,
            
            // Content Preferences
            topicInterests: !isInGracePeriod('topicInterests')
              ? (server.topic_interests !== undefined ? Boolean(server.topic_interests) : prev.topicInterests)
              : prev.topicInterests,
            mediaAutoplayWifi: !isInGracePeriod('mediaAutoplayWifi')
              ? (server.autoplay_wifi !== undefined ? Boolean(server.autoplay_wifi) : prev.mediaAutoplayWifi)
              : prev.mediaAutoplayWifi,
            mediaAutoplayMobile: !isInGracePeriod('mediaAutoplayMobile')
              ? (server.media_autoplay_mobile !== undefined ? Boolean(server.media_autoplay_mobile) : prev.mediaAutoplayMobile)
              : prev.mediaAutoplayMobile,
            dataSaverMode: !isInGracePeriod('dataSaverMode')
              ? (server.data_saver_mode !== undefined ? Boolean(server.data_saver_mode) : prev.dataSaverMode)
              : prev.dataSaverMode,
            captionsForVideos: !isInGracePeriod('captionsForVideos')
              ? (server.captions_for_videos !== undefined ? Boolean(server.captions_for_videos) : prev.captionsForVideos)
              : prev.captionsForVideos,
            
            // Accessibility
            textSize: !isInGracePeriod('textSize')
              ? (server.font_size !== undefined ? (server.font_size === 'large' ? 'large' : 'default') : prev.textSize)
              : prev.textSize,
            highContrastMode: !isInGracePeriod('highContrastMode')
              ? (server.high_contrast !== undefined ? Boolean(server.high_contrast) : prev.highContrastMode)
              : prev.highContrastMode,
            reduceMotion: !isInGracePeriod('reduceMotion')
              ? (server.reduced_motion !== undefined ? Boolean(server.reduced_motion) : prev.reduceMotion)
              : prev.reduceMotion,
            boldText: !isInGracePeriod('boldText')
              ? (server.screen_reader !== undefined ? Boolean(server.screen_reader) : prev.boldText)
              : prev.boldText,
          }));

          // Sync accessibility context with server-side settings
          updateAccessibility({
            textSize: server.font_size !== undefined ? (server.font_size === 'large' ? 'large' : 'default') : 'default',
            highContrastMode: server.high_contrast !== undefined ? Boolean(server.high_contrast) : false,
            reduceMotion: server.reduced_motion !== undefined ? Boolean(server.reduced_motion) : false,
          });

          // Cache settings in localStorage for instant load on next visit
          try {
            localStorage.setItem('xora_user_settings', JSON.stringify({
              privateAccount: server.private_account !== undefined ? Boolean(server.private_account) : settings.privateAccount,
              turnOffComments: server.who_can_comment !== undefined ? server.who_can_comment.toLowerCase() === 'none' : settings.turnOffComments,
              turnOffMessaging: server.who_can_message !== undefined ? server.who_can_message.toLowerCase() === 'none' : settings.turnOffMessaging,
              sensitiveContentVisibility: server.display_sensitive_content !== undefined ? Boolean(server.display_sensitive_content) : settings.sensitiveContentVisibility,
              sensitiveContentSuggestion: server.suggest_sensitive_content !== undefined ? Boolean(server.suggest_sensitive_content) : settings.sensitiveContentSuggestion,
              contentWarnings: server.content_warnings !== undefined ? Boolean(server.content_warnings) : settings.contentWarnings,
              emailNotifications: server.notifications_email !== undefined ? Boolean(server.notifications_email) : settings.emailNotifications,
              pushNotifications: server.notifications_push !== undefined ? Boolean(server.notifications_push) : settings.pushNotifications,
              inAppNotifications: server.notifications_in_app !== undefined ? Boolean(server.notifications_in_app) : settings.inAppNotifications,
              tagNotifications: server.notify_mentions !== undefined ? Boolean(server.notify_mentions) : settings.tagNotifications,
              likesReactions: server.notify_likes !== undefined ? Boolean(server.notify_likes) : settings.likesReactions,
              commentsReplies: server.notify_comments !== undefined ? Boolean(server.notify_comments) : settings.commentsReplies,
              newFollowers: server.notify_follows !== undefined ? Boolean(server.notify_follows) : settings.newFollowers,
              messageNotifications: server.notify_messages !== undefined ? Boolean(server.notify_messages) : settings.messageNotifications,
              liveTrendingAlerts: server.notify_shares !== undefined ? Boolean(server.notify_shares) : settings.liveTrendingAlerts,
              doNotDisturb:
                server.notifications_push !== undefined || server.notifications_in_app !== undefined
                  ? (!server.notifications_push && Boolean(server.notifications_in_app))
                  : settings.doNotDisturb,
              topicInterests: server.topic_interests !== undefined ? Boolean(server.topic_interests) : settings.topicInterests,
              mediaAutoplayWifi: server.autoplay_wifi !== undefined ? Boolean(server.autoplay_wifi) : settings.mediaAutoplayWifi,
              mediaAutoplayMobile: server.media_autoplay_mobile !== undefined ? Boolean(server.media_autoplay_mobile) : settings.mediaAutoplayMobile,
              dataSaverMode: server.data_saver_mode !== undefined ? Boolean(server.data_saver_mode) : settings.dataSaverMode,
              captionsForVideos: server.captions_for_videos !== undefined ? Boolean(server.captions_for_videos) : settings.captionsForVideos,
              textSize: server.font_size !== undefined ? (server.font_size === 'large' ? 'large' : 'default') : settings.textSize,
              highContrastMode: server.high_contrast !== undefined ? Boolean(server.high_contrast) : settings.highContrastMode,
              reduceMotion: server.reduced_motion !== undefined ? Boolean(server.reduced_motion) : settings.reduceMotion,
              boldText: server.screen_reader !== undefined ? Boolean(server.screen_reader) : settings.boldText,
            }));
          } catch (err) {
            console.error('Failed to cache settings:', err);
          }
        }
      } catch (error) {
        console.error('Settings load error:', error);
        // Don't show error toast on load failure - user can still interact with defaults
      } finally {
        setSettingsLoading(false);
      }
    };

    load();
  }, [isAuthenticated, updateAccessibility]);

  // Clear cached settings on logout
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.removeItem('xora_user_settings');
    }
  }, [isAuthenticated]);

  const syncSettingToBackend = async (key, value) => {
    if (!isAuthenticated) return;

    const payload = {};

    switch (key) {
      // Privacy & Security
      case 'privateAccount':
        payload.privateAccount = value;
        break;
      case 'turnOffComments':
        payload.whoCanComment = value ? 'none' : 'everyone';
        break;
      case 'turnOffMessaging':
        payload.whoCanMessage = value ? 'none' : 'everyone';
        break;

      // Sensitive Content
      case 'sensitiveContentVisibility':
        payload.displaySensitiveContent = value;
        break;
      case 'sensitiveContentSuggestion':
        payload.suggestSensitiveContent = value;
        break;
      case 'contentWarnings':
        payload.contentWarnings = value;
        break;

      // Notifications
      case 'emailNotifications':
        payload.notificationsEmail = value;
        break;
      case 'pushNotifications':
        payload.notificationsPush = value;
        break;
      case 'inAppNotifications':
        payload.notificationsInApp = value;
        break;
      case 'tagNotifications':
        payload.notifyMentions = value;
        break;
      case 'likesReactions':
        payload.notifyLikes = value;
        break;
      case 'commentsReplies':
        payload.notifyComments = value;
        break;
      case 'newFollowers':
        payload.notifyFollows = value;
        break;
      case 'messageNotifications':
        payload.notifyMessages = value;
        break;
      case 'liveTrendingAlerts':
        payload.notifyShares = value; // Map to shares for now, could add separate column later
        break;

      // Content Preferences
      case 'topicInterests':
        payload.topicInterests = value;
        break;
      case 'mediaAutoplayWifi':
        payload.autoplayWifi = value;
        break;
      case 'mediaAutoplayMobile':
        payload.mediaAutoplayMobile = value;
        break;
      case 'dataSaverMode':
        payload.dataSaverMode = value;
        break;

      // Accessibility
      case 'boldText':
        payload.screenReader = value; // Map to screen reader
        break;
      case 'highContrastMode':
        payload.highContrast = value;
        break;
      case 'reduceMotion':
        payload.reducedMotion = value;
        break;
      case 'captionsForVideos':
        payload.captionsForVideos = value; // Will need backend support
        break;

      // Do Not Disturb (simplified - maps to reduced notifications)
      case 'doNotDisturb':
        payload.notificationsPush = !value;
        if (value) {
          payload.notificationsInApp = true;
        }
        payload.notifyLikes = !value;
        payload.notifyComments = !value;
        payload.notifyFollows = !value;
        payload.notifyMentions = !value;
        payload.notifyMessages = !value;
        payload.notifyShares = !value;
        break;

      default:
        break;
    }

    if (Object.keys(payload).length === 0) return;

    try {
      const updatedSettings = await api.updateSettings(payload);
      if (updatedSettings) {
        // Don't overwrite all settings - just confirm the one we changed was successful
        // This prevents race conditions when multiple settings are being toggled quickly
        // The optimistic update already has the correct value, so trust it
        
        // Only update if the server returned something different than what we sent
        // This is mainly for validation, not for pulling fresh state
        setSettings(prev => ({
          ...prev,
          // Only update fields if server response differs from what we optimistically set
          // Respect grace period for each field
          ...(updatedSettings && {
            privateAccount: !isInGracePeriod('privateAccount') && updatedSettings.private_account !== undefined 
              ? Boolean(updatedSettings.private_account) 
              : prev.privateAccount,
            // For other fields, we trust the optimistic update that just succeeded
          })
        }));

        // Cache updated settings in localStorage
        try {
          localStorage.setItem('xora_user_settings', JSON.stringify(updatedSettings || settings));
        } catch (err) {
          console.error('Failed to cache updated settings:', err);
        }

        // Update accessibility context if needed
        if (payload.highContrast !== undefined || 'fontSize' in payload || payload.reducedMotion !== undefined) {
          updateAccessibility({
            textSize: updatedSettings.font_size !== undefined ? (updatedSettings.font_size === 'large' ? 'large' : 'default') : accessibility.textSize,
            highContrastMode: updatedSettings.high_contrast !== undefined ? Boolean(updatedSettings.high_contrast) : accessibility.highContrastMode,
            reduceMotion: updatedSettings.reduced_motion !== undefined ? Boolean(updatedSettings.reduced_motion) : accessibility.reduceMotion,
          });
        }
      }
    } catch (error) {
      toast.error('Failed to update settings');
      throw error; // Re-throw to trigger revert in toggleSetting
    }
  };

  const loadBackupCodesInfo = async () => {
    if (!isAuthenticated) return;
    setBackupCodesLoading(true);
    try {
      const info = await api.getBackupCodesCount();
      setBackupCodesInfo(info);
    } catch (error) {
      toast.error('Failed to load backup codes info');
    } finally {
      setBackupCodesLoading(false);
    }
  };

  const handleRegenerateBackupCodes = () => {
    if (!isAuthenticated) return;
    // Open security modal to collect password and 2FA code
    setSecurityModalAction('regenerateCodes');
    setSecurityPassword('');
    setSecurityCode('');
    setShowSecurityModal(true);
  };

  const executeSecurityAction = async () => {
    if (!securityPassword || !securityCode) {
      toast.error('Please enter your password and 2FA code');
      return;
    }

    if (securityCode.length !== 6 || !/^\d+$/.test(securityCode)) {
      toast.error('2FA code must be 6 digits');
      return;
    }

    setSecurityModalLoading(true);

    try {
      if (securityModalAction === 'regenerateCodes') {
        const info = await api.regenerateBackupCodes(securityPassword, securityCode);
        setBackupCodesInfo(info);
        toast.success('Backup codes regenerated');
      } else if (securityModalAction === 'disable2fa') {
        await api.disable2FA(securityPassword, securityCode);
        setSettings(prev => ({ ...prev, twoFactorAuth: false }));
        setBackupCodesInfo(null);
        toast.success('Two-factor authentication disabled');
      }

      // Close modal on success
      setShowSecurityModal(false);
      setSecurityPassword('');
      setSecurityCode('');
      setSecurityModalAction(null);
    } catch (error) {
      toast.error(error.message || 'Authentication failed. Please check your password and 2FA code.');
    } finally {
      setSecurityModalLoading(false);
    }
  };

  const toggleSetting = (key) => {
    if (key === 'twoFactorAuth') {
      // Turning 2FA on → go through dedicated setup flow
      if (!settings.twoFactorAuth) {
        navigate('/enable-2fa');
        return;
      }

      // Turning 2FA off → open security modal
      if (!isAuthenticated) {
        toast.error('You must be logged in to change this setting');
        return;
      }

      // Open security modal to collect password and 2FA code
      setSecurityModalAction('disable2fa');
      setSecurityPassword('');
      setSecurityCode('');
      setShowSecurityModal(true);
      return;
    }

    const newValue = !settings[key];
    const newSettings = {
      ...settings,
      [key]: newValue,
    };

    // Mark when this setting was last updated locally (for grace period)
    lastSettingUpdateRef.current[key] = Date.now();

    // Optimistic update
    setSettings(newSettings);

    // IMPORTANT: Save to localStorage immediately before async server sync
    // This ensures changes persist even if page reloads or sync fails
    try {
      localStorage.setItem('xora_user_settings', JSON.stringify(newSettings));
    } catch (err) {
      console.error('Failed to cache settings immediately:', err);
    }

    // Sync relevant accessibility settings to global preferences
    if (
      key === 'boldText' ||
      key === 'highContrastMode' ||
      key === 'reduceMotion' ||
      key === 'captionsForVideos'
    ) {
      updateAccessibility({ [key]: newValue });
    }

    // Try to sync to backend, revert on failure
    syncSettingToBackend(key, newValue).catch((error) => {
      // Revert optimistic update on failure
      setSettings({
        ...settings,
        [key]: !newValue,
      });

      // Revert localStorage on failure
      try {
        localStorage.setItem('xora_user_settings', JSON.stringify(settings));
      } catch (err) {
        console.error('Failed to revert cached settings:', err);
      }

      // Revert accessibility settings if needed
      if (
        key === 'boldText' ||
        key === 'highContrastMode' ||
        key === 'reduceMotion' ||
        key === 'captionsForVideos'
      ) {
        updateAccessibility({ [key]: !newValue });
      }
    });
  };

  const handleTextSizeChange = async () => {
    const nextSize = settings.textSize === 'default' ? 'large' : 'default';
    const newSettings = {
      ...settings,
      textSize: nextSize,
    };

    // Mark when text size was last updated locally (for grace period)
    lastSettingUpdateRef.current.textSize = Date.now();

    // Optimistic update
    setSettings(newSettings);
    updateAccessibility({ textSize: nextSize });

    // IMPORTANT: Save to localStorage immediately
    try {
      localStorage.setItem('xora_user_settings', JSON.stringify(newSettings));
    } catch (err) {
      console.error('Failed to cache text size immediately:', err);
    }

    if (user) {
      try {
        const normalizedSize = nextSize === 'default' ? 'medium' : 'large';
        const updatedSettings = await api.updateSettings({ fontSize: normalizedSize });
        if (updatedSettings) {
          const serverTextSize = updatedSettings.font_size === 'large' ? 'large' : 'default';
          const finalSettings = {
            ...settings,
            textSize: serverTextSize,
          };
          setSettings(finalSettings);
          updateAccessibility({ textSize: serverTextSize });
          // Update localStorage with server response
          try {
            localStorage.setItem('xora_user_settings', JSON.stringify(finalSettings));
          } catch (err) {
            console.error('Failed to cache updated text size:', err);
          }
        }
      } catch (error) {
        // Revert on error
        const revertSize = nextSize === 'default' ? 'large' : 'default';
        const revertSettings = {
          ...settings,
          textSize: revertSize,
        };
        setSettings(revertSettings);
        updateAccessibility({ textSize: revertSize });
        // Revert localStorage on failure
        try {
          localStorage.setItem('xora_user_settings', JSON.stringify(revertSettings));
        } catch (err) {
          console.error('Failed to revert cached text size:', err);
        }
        toast.error('Failed to update text size');
      }
    }
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutAllDevices = async () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in to use this feature');
      return;
    }

    toast.info('Logging out of all devices...');
    
    try {
      await logoutAllDevices();
      toast.success('All other devices have been logged out');
    } catch (error) {
      toast.error(error.message || 'Failed to log out all devices');
    }
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = () => {
    logout();
    navigate('/forgot-password');
  };

  const handleDownloadData = () => {
    // Navigate to the export data page which has proper implementation
    navigate('/export-data');
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteDialog) {
      setShowDeleteDialog(true);
      setDeletePassword('');
    }
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast.error('Please enter your password to confirm account deletion');
      return;
    }

    try {
      await api.deleteAccount(deletePassword);
      toast.success('Account deleted permanently');
      setShowDeleteDialog(false);
      setDeletePassword('');
      logout();
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Failed to delete account');
    }
  };

  const cancelDeleteAccount = () => {
    setShowDeleteDialog(false);
    setDeletePassword('');
    setDeleteConfirmTime(null);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h2>{t('settings.title')}</h2>
        <div></div>
      </div>

      <div className="settings-content">
        {/* Help and Support */}
        <div className="settings-section">
          <h3 className="section-title">{t('settings.helpSupport')}</h3>
          <div className="settings-list-vertical">
            <button className="setting-item-vertical" onClick={() => navigate('/about')}>
              {t('settings.aboutUs')}
            </button>
            <button className="setting-item-vertical" onClick={() => navigate('/terms')}>
              {t('settings.termsOfService')}
            </button>
            <button className="setting-item-vertical" onClick={() => navigate('/privacy')}>
              {t('settings.privacyPolicy')}
            </button>
            <button className="setting-item-vertical" onClick={() => navigate('/contact')}>
              {t('settings.contactUs')}
            </button>
          </div>
        </div>

        {/* Security and Login */}
        <div className="settings-section">
          <h3 className="section-title">{t('settings.security')}</h3>
          <div className="settings-list-vertical">
            <button className="setting-item-vertical" onClick={() => navigate('/settings/blocked')}>
              {t('settings.blockedList')}
            </button>
            <button className="setting-item-vertical" onClick={handleChangePassword}>
              {t('settings.changePassword')}
            </button>
            <div className="setting-item-toggle">
              <span>{t('settings.twoFactorAuth')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="two-factor-auth"
                    name="twoFactorAuth"
                    type="checkbox"
                    checked={settings.twoFactorAuth}
                    onChange={() => toggleSetting('twoFactorAuth')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.twoFactorAuth ? 'ON' : 'OFF'}</span>
              </div>
            </div>

            {settings.twoFactorAuth ? <div className="setting-item-vertical">
                <div className="backup-codes-header">
                  <span>2FA Backup Codes</span>
                  {backupCodesInfo ? <span className="backup-codes-status">
                      {backupCodesInfo.remaining} of {backupCodesInfo.total} remaining
                    </span> : null}
                </div>
                <div className="backup-codes-actions">
                  <button
                    type="button"
                    className="setting-item-vertical"
                    onClick={loadBackupCodesInfo}
                    disabled={backupCodesLoading}
                  >
                    {backupCodesLoading ? 'Loading…' : 'Refresh status'}
                  </button>
                  <button
                    type="button"
                    className="setting-item-vertical"
                    onClick={handleRegenerateBackupCodes}
                    disabled={backupCodesRegenerating}
                  >
                    {backupCodesRegenerating ? 'Regenerating…' : 'Regenerate codes'}
                  </button>
                </div>
                <p className="setting-description">
                  Backup codes let you access your account if you lose your authenticator app.
                </p>
              </div> : null}

            <button className="setting-item-vertical" onClick={handleLogoutAllDevices}>
              Log out of all devices
            </button>

            <button className="setting-item-vertical logout-item" onClick={handleLogout}>
              {t('common.logout')}
            </button>
          </div>
        </div>

        {/* Privacy */}
        <div className="settings-section">
          <h3 className="section-title">{t('settings.privacy')}</h3>
          <div className="settings-list-vertical">
            <div className="setting-item-toggle">
              <span>{t('settings.accountVisibility')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="private-account"
                    name="privateAccount"
                    type="checkbox"
                    checked={settings.privateAccount}
                    onChange={() => toggleSetting('privateAccount')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.privateAccount ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.turnOffComments')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="turn-off-comments"
                    name="turnOffComments"
                    type="checkbox"
                    checked={settings.turnOffComments}
                    onChange={() => toggleSetting('turnOffComments')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.turnOffComments ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.turnOffMessaging')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="turn-off-messaging"
                    name="turnOffMessaging"
                    type="checkbox"
                    checked={settings.turnOffMessaging}
                    onChange={() => toggleSetting('turnOffMessaging')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.turnOffMessaging ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-section">
          <h3 className="section-title">{t('settings.notifications')}</h3>
          <p className="setting-description" style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
            ℹ️ Most notification preferences below are client-side only and require the mobile app for full functionality.
            Download the Xora app to customize your notification experience.
          </p>
          <div className="settings-list-vertical">
            <div className="setting-item-vertical">
              <div className="setting-item-header">
                <span>Browser push notifications</span>
              </div>
              <button
                type="button"
                className="setting-item-vertical"
                onClick={requestPushPermission}
                disabled={pushLoading || pushSubscribed || !isAuthenticated}
              >
                {pushSubscribed ? 'Enabled' : (pushLoading ? 'Enabling…' : 'Enable push notifications')}
              </button>
              {pushError ? <p className="setting-description">{pushError}</p> : null}
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.pushNotifications')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="push-notifications"
                    name="pushNotifications"
                    type="checkbox"
                    checked={settings.pushNotifications}
                    onChange={() => toggleSetting('pushNotifications')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.pushNotifications ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.inAppNotifications')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="in-app-notifications"
                    name="inAppNotifications"
                    type="checkbox"
                    checked={settings.inAppNotifications}
                    onChange={() => toggleSetting('inAppNotifications')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.inAppNotifications ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.emailNotifications')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="email-notifications"
                    name="emailNotifications"
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={() => toggleSetting('emailNotifications')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.emailNotifications ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.tags')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="tag-notifications"
                    name="tagNotifications"
                    type="checkbox"
                    checked={settings.tagNotifications}
                    onChange={() => toggleSetting('tagNotifications')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.tagNotifications ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.likesReactions')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="likes-reactions"
                    name="likesReactions"
                    type="checkbox"
                    checked={settings.likesReactions}
                    onChange={() => toggleSetting('likesReactions')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.likesReactions ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.commentsReplies')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="comments-replies"
                    name="commentsReplies"
                    type="checkbox"
                    checked={settings.commentsReplies}
                    onChange={() => toggleSetting('commentsReplies')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.commentsReplies ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.newFollowers')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="new-followers"
                    name="newFollowers"
                    type="checkbox"
                    checked={settings.newFollowers}
                    onChange={() => toggleSetting('newFollowers')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.newFollowers ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.messages')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="message-notifications"
                    name="messageNotifications"
                    type="checkbox"
                    checked={settings.messageNotifications}
                    onChange={() => toggleSetting('messageNotifications')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.messageNotifications ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.liveTrendingAlerts')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="live-trending-alerts"
                    name="liveTrendingAlerts"
                    type="checkbox"
                    checked={settings.liveTrendingAlerts}
                    onChange={() => toggleSetting('liveTrendingAlerts')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.liveTrendingAlerts ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.doNotDisturb')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="do-not-disturb"
                    name="doNotDisturb"
                    type="checkbox"
                    checked={settings.doNotDisturb}
                    onChange={() => toggleSetting('doNotDisturb')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.doNotDisturb ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Preferences */}
        <div className="settings-section">
          <h3 className="section-title">{t('settings.contentPreferences')}</h3>
          <p className="setting-description" style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
            ℹ️ Sensitive content settings sync to server. Media autoplay and data saver require the mobile app.
          </p>
          <div className="settings-list-vertical">
            <div className="setting-item-toggle">
              <span>{t('settings.sensitiveContent')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="sensitive-content"
                    name="sensitiveContentVisibility"
                    type="checkbox"
                    checked={settings.sensitiveContentVisibility}
                    onChange={() => toggleSetting('sensitiveContentVisibility')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.sensitiveContentVisibility ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.sensitiveContentSuggestion')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="sensitive-content-suggestion"
                    name="sensitiveContentSuggestion"
                    type="checkbox"
                    checked={settings.sensitiveContentSuggestion}
                    onChange={() => toggleSetting('sensitiveContentSuggestion')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.sensitiveContentSuggestion ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.topicInterests')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="topic-interests"
                    name="topicInterests"
                    type="checkbox"
                    checked={settings.topicInterests}
                    onChange={() => toggleSetting('topicInterests')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.topicInterests ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.mediaAutoplayWifi')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="media-autoplay-wifi"
                    name="mediaAutoplayWifi"
                    type="checkbox"
                    checked={settings.mediaAutoplayWifi}
                    onChange={() => toggleSetting('mediaAutoplayWifi')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.mediaAutoplayWifi ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.mediaAutoplayMobile')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="media-autoplay-mobile"
                    name="mediaAutoplayMobile"
                    type="checkbox"
                    checked={settings.mediaAutoplayMobile}
                    onChange={() => toggleSetting('mediaAutoplayMobile')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.mediaAutoplayMobile ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.dataSaverMode')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    id="data-saver-mode"
                    name="dataSaverMode"
                    type="checkbox"
                    checked={settings.dataSaverMode}
                    onChange={() => toggleSetting('dataSaverMode')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.dataSaverMode ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Accessibility */}
        <div className="settings-section">
          <h3 className="section-title">{t('settings.accessibility')}</h3>
          <p className="setting-description" style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
            ℹ️ Text size and high contrast sync to server. Other accessibility features require the mobile app.
          </p>
          <div className="settings-list-vertical">
            <div className="setting-item-toggle">
              <span>{t('settings.textSize')}</span>
              <div className="toggle-wrapper">
                <button className="text-size-btn" onClick={handleTextSizeChange}>
                  {settings.textSize === 'default' ? t('settings.default') : t('settings.large')}
                </button>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.boldText')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.boldText}
                    onChange={() => toggleSetting('boldText')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.boldText ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.highContrastMode')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.highContrastMode}
                    onChange={() => toggleSetting('highContrastMode')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.highContrastMode ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.reduceMotion')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.reduceMotion}
                    onChange={() => toggleSetting('reduceMotion')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.reduceMotion ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="setting-item-toggle">
              <span>{t('settings.captionsForVideos')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.captionsForVideos}
                    onChange={() => toggleSetting('captionsForVideos')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.captionsForVideos ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data & Storage */}
        <div className="settings-section">
          <h3 className="section-title">{t('settings.dataStorage')}</h3>
          <div className="settings-list-vertical">
            <button className="setting-item-vertical" onClick={handleDownloadData}>
              {t('settings.downloadUserData')}
            </button>
          </div>
        </div>

        {/* Safety & Moderation */}
        <div className="settings-section">
          <h3 className="section-title">{t('settings.safetyModeration')}</h3>
          <div className="settings-list-vertical">
            <button className="setting-item-vertical" onClick={() => navigate('/submit-report')}>
              {t('settings.reportProblem')}
            </button>
            <button className="setting-item-vertical" onClick={() => navigate('/submit-report')}>
              {t('settings.reportUser')}
            </button>
            <button className="setting-item-vertical" onClick={() => navigate('/submit-report')}>
              {t('settings.appealDecision')}
            </button>
            <div className="setting-item-toggle">
              <span>{t('settings.contentWarnings')}</span>
              <div className="toggle-wrapper">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.contentWarnings}
                    onChange={() => toggleSetting('contentWarnings')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-status">{settings.contentWarnings ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Management */}
        <div className="settings-section">
          <h3 className="section-title">{t('settings.accountManagement')}</h3>
          <div className="settings-list-vertical">
            <button className="setting-item-vertical delete-account-item" onClick={handleDeleteAccount}>
              {deleteConfirmTime ? t('common.confirm') : t('settings.deleteAccount')}
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutDialog ? <div className="dialog-overlay" onClick={() => setShowLogoutDialog(false)}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <h3>{t('common.logout')}</h3>
            <p>{t('settings.logoutConfirm')}</p>
            <div className="dialog-actions">
              <button className="dialog-btn cancel-btn" onClick={() => setShowLogoutDialog(false)}>
                {t('common.cancel')}
              </button>
              <button className="dialog-btn confirm-btn" onClick={confirmLogout}>
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div> : null}

      {/* Delete Account Warning Dialog */}
      {showDeleteDialog ? <div className="dialog-overlay" onClick={cancelDeleteAccount}>
          <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Permanent Deletion</h3>
            <p>
              You are about to <strong>permanently delete</strong> your account.
              This action is <strong>irreversible</strong>.
            </p>
            <p className="warning-text">
              Enter your password to confirm permanent deletion.
            </p>
            <input
              type="password"
              className="delete-password-input"
              placeholder="Enter your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoFocus
            />
            <div className="dialog-actions">
              <button className="dialog-btn cancel-btn" onClick={cancelDeleteAccount}>
                Cancel
              </button>
              <button className="dialog-btn confirm-btn delete-btn" onClick={confirmDeleteAccount}>
                Delete Account
              </button>
            </div>
          </div>
        </div> : null}

      {/* Security Verification Modal */}
      {showSecurityModal ? <div className="dialog-overlay" onClick={() => setShowSecurityModal(false)}>
          <div className="dialog-box security-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {securityModalAction === 'disable2fa' ? 'Disable Two-Factor Authentication' : 'Regenerate Backup Codes'}
            </h3>
            <p>
              {securityModalAction === 'disable2fa'
                ? 'Enter your password and current 2FA code to disable two-factor authentication.'
                : 'Enter your password and current 2FA code to regenerate your backup codes.'}
            </p>
            <div className="security-form">
              <div className="form-group">
                <label htmlFor="security-password">Password</label>
                <input
                  id="security-password"
                  type="password"
                  value={securityPassword}
                  onChange={(e) => setSecurityPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </div>
              <div className="form-group">
                <label htmlFor="security-code">2FA Code</label>
                <input
                  id="security-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={securityCode}
                  onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  autoComplete="one-time-code"
                />
              </div>
            </div>
            <div className="dialog-actions">
              <button
                className="dialog-btn cancel-btn"
                onClick={() => {
                  setShowSecurityModal(false);
                  setSecurityPassword('');
                  setSecurityCode('');
                  setSecurityModalAction(null);
                }}
                disabled={securityModalLoading}
              >
                Cancel
              </button>
              <button
                className="dialog-btn confirm-btn"
                onClick={executeSecurityAction}
                disabled={securityModalLoading || !securityPassword || securityCode.length !== 6}
              >
                {securityModalLoading ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div> : null}
    </div>
  );
};

export default Settings;





