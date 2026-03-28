import React, { useRef, useCallback, useEffect } from 'react';
import './AdSDK.css';

/**
 * Generic SDK Ad Component for Web
 * Renders ads from various SDK providers (AdMob, Meta, etc.)
 * Provider-specific logic is handled here
 */

// Safe helper to escape HTML entities to prevent XSS
const escapeHtml = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Safe DOM element creation helper
const createSafeElement = (tag, className, textContent) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (textContent) el.textContent = textContent;
  return el;
};

const AdSDK = ({ adData, onImpression: _onImpression }) => {
  const adRef = useRef(null);

  const renderPlaceholderAd = useCallback((title, message) => {
    // Render a placeholder until SDK is installed
    // This allows the app to work without SDKs during development
    if (adRef.current) {
      adRef.current.innerHTML = '';
      const container = createSafeElement('div', 'sdk-ad-placeholder');
      container.appendChild(createSafeElement('div', 'sdk-ad-placeholder-title', title));
      container.appendChild(createSafeElement('div', 'sdk-ad-placeholder-message', message));
      adRef.current.appendChild(container);
    }
  }, []);

  const renderFallbackAd = useCallback((ad) => {
    // Render as regular ad if SDK not available
    if (adRef.current) {
      adRef.current.innerHTML = '';
      const container = createSafeElement('div', 'sdk-ad-fallback');
      container.appendChild(createSafeElement('div', 'sdk-ad-fallback-title', ad.headline || 'Advertisement'));
      container.appendChild(createSafeElement('div', 'sdk-ad-fallback-description', ad.description || 'SDK not configured'));
      container.appendChild(createSafeElement('div', 'sdk-ad-fallback-cta', ad.ctaText || 'Learn More'));
      adRef.current.appendChild(container);
    }
  }, []);

  // Helper to create AdMob ins element safely
  const createAdMobElement = useCallback((adClient, adSlot, config) => {
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', escapeHtml(adClient));
    ins.setAttribute('data-ad-slot', escapeHtml(adSlot));
    ins.setAttribute('data-ad-format', escapeHtml(config?.format || 'auto'));
    ins.setAttribute('data-full-width-responsive', 'true');
    return ins;
  }, []);

  const initializeAdMobAd = useCallback((adUnitId, config) => {
    // Real AdMob SDK integration
    if (adRef.current) {
      try {
        const adClient = config?.client || config?.adClient || config?.publisherId || config?.dataAdClient || '';
        const adSlot = config?.slot || config?.adSlot || adUnitId || '';

        if (!adClient || !adSlot) {
          renderPlaceholderAd('AdMob Ad', 'Missing ad client or slot configuration');
          return;
        }

        const renderAd = () => {
          if (!adRef.current) return;
          adRef.current.innerHTML = '';
          adRef.current.appendChild(createAdMobElement(adClient, adSlot, config));
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        };

        if (!window.adsbygoogle) {
          if (!window.__admobScriptLoading) {
            window.__admobScriptLoading = new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adClient)}`;
              script.async = true;
              script.crossOrigin = 'anonymous';
              script.onload = () => resolve();
              script.onerror = () => reject(new Error('AdMob script failed to load'));
              document.head.appendChild(script);
            });
          }

          window.__admobScriptLoading
            .then(() => renderAd())
            .catch(() => renderPlaceholderAd('AdMob Ad', 'Failed to load AdMob SDK'));
        } else {
          renderAd();
        }
      } catch (error) {
        renderPlaceholderAd('AdMob Ad', 'Failed to load AdMob SDK');
      }
    }
  }, [renderPlaceholderAd, createAdMobElement]);

  const initializeMetaAd = useCallback((_adUnitId, _config) => {
    // Meta Audience Network - requires manual setup
    renderPlaceholderAd('Meta Audience Ad', 'Meta SDK requires manual setup');
  }, [renderPlaceholderAd]);

  const initializeUnityAd = useCallback((_adUnitId, _config) => {
    // Unity Ads - requires manual setup
    renderPlaceholderAd('Unity Ad', 'Unity SDK requires manual setup');
  }, [renderPlaceholderAd]);

  // Helper to create AppLovin container element safely
  const createAppLovinContainer = useCallback((containerId) => {
    const div = document.createElement('div');
    div.id = containerId;
    div.style.width = '100%';
    div.style.height = '50px';
    return div;
  }, []);

  const initializeAppLovinAd = useCallback((adUnitId, config) => {
    // AppLovin MAX SDK integration
    if (adRef.current) {
      try {
        // Load AppLovin MAX script if not already loaded
        if (!window.ATTrackingAuthorizationRequest && !window.AppLovinMAX) {
          // Load AppLovin MAX SDK
          const script = document.createElement('script');
          script.src = 'https://sf16-scmcdn-sg.ibytedtos.com/goofy/applovin/web-max.js';
          script.async = true;
          document.head.appendChild(script);

          script.onload = () => {
            if (window.AppLovinMAX && adRef.current) {
              // Initialize AppLovin MAX
              window.AppLovinMAX.initialize(adUnitId, () => {
                // SDK initialized successfully
                const adFormat = config?.format || 'banner';
                const containerId = `applovin-ad-${Date.now()}`;

                adRef.current.innerHTML = '';
                adRef.current.appendChild(createAppLovinContainer(containerId));

                // Load and show ad
                window.AppLovinMAX.loadAd(adFormat, containerId);
              });
            }
          };

          script.onerror = () => {
            renderPlaceholderAd('AppLovin Ad', 'Failed to load AppLovin SDK');
          };
        } else if (window.AppLovinMAX) {
          // AppLovin already loaded
          const adFormat = config?.format || 'banner';
          const containerId = `applovin-ad-${Date.now()}`;

          adRef.current.innerHTML = '';
          adRef.current.appendChild(createAppLovinContainer(containerId));

          // Load and show ad
          window.AppLovinMAX.loadAd(adFormat, containerId);
        } else {
          renderPlaceholderAd('AppLovin Ad', 'AppLovin SDK not available');
        }
      } catch (error) {
        renderPlaceholderAd('AppLovin Ad', 'Failed to load AppLovin SDK');
      }
    }
  }, [renderPlaceholderAd, createAppLovinContainer]);

  const initializeSDKAd = useCallback((ad) => {
    const providerRaw = ad.sdkProvider || ad.sdk_provider || '';
    const sdkProvider = String(providerRaw).toLowerCase();
    const sdkAdUnitId = ad.sdkAdUnitId || ad.sdk_ad_unit_id || '';

    let sdkConfig = ad.sdkConfig || ad.sdk_config || {};
    if (typeof sdkConfig === 'string') {
      try {
        sdkConfig = JSON.parse(sdkConfig);
      } catch {
        sdkConfig = {};
      }
    }

    switch (sdkProvider) {
      case 'admob':
        // AdMob SDK integration
        initializeAdMobAd(sdkAdUnitId, sdkConfig);
        break;
      case 'meta':
      case 'meta_audience':
        // Meta Audience Network SDK integration
        initializeMetaAd(sdkAdUnitId, sdkConfig);
        break;
      case 'unity':
        // Unity Ads SDK integration
        initializeUnityAd(sdkAdUnitId, sdkConfig);
        break;
      case 'applovin':
      case 'applovin_max':
        // AppLovin SDK integration
        initializeAppLovinAd(sdkAdUnitId, sdkConfig);
        break;
      default:
        // Render fallback ad
        renderFallbackAd(ad);
    }
  }, [initializeAdMobAd, initializeMetaAd, initializeUnityAd, initializeAppLovinAd, renderFallbackAd]);

  useEffect(() => {
    if (adData && adRef.current) {
      // Initialize SDK ad based on provider
      initializeSDKAd(adData);
    }
  }, [adData, initializeSDKAd]);

  if (!adData) {
    return (
      <div
        ref={adRef}
        className="ad-sdk-container"
        role="complementary"
        aria-label="Advertisement"
      />
    );
  }

  return (
    <aside
      ref={adRef}
      className="ad-sdk-container"
      role="complementary"
      aria-label={`Sponsored content from ${adData.sdkProvider || 'advertising partner'}`}
    />
  );
};

export default AdSDK;




