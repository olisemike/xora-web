import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../services/api';

const AdContext = createContext();

export const useAdContext = () => {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAdContext must be used within AdProvider');
  }
  return context;
};

export const AdProvider = ({ children }) => {
  const [currentAds, setCurrentAds] = useState({
    feed: null,
    banner: null,
  });

  const [adLoading, setAdLoading] = useState({
    feed: false,
    banner: false,
  });

  /**
   * Fetch ad for a position
   */
  const fetchAdForPosition = useCallback(async (position, userLocation = null) => {
    try {
      setAdLoading(prev => ({ ...prev, [position]: true }));
      
      if (process.env.NODE_ENV === 'development') {
        // Fetching ad for position
      }
      
      const response = await api.getEligibleAds(position, userLocation);
      
      // Handle different response structures from backend
      let ads = [];
      if (Array.isArray(response)) {
        ads = response;
      } else if (response && response.data && Array.isArray(response.data.ads)) {
        ads = response.data.ads;
      } else if (response && Array.isArray(response.ads)) {
        ads = response.ads;
      } else {return null;
      }
      
      // Get first available ad and normalize field names
      const rawAd = ads[0];
      if (rawAd) {
        const ad = {
          id: rawAd.id,
          title: rawAd.title || rawAd.headline || '',
          headline: rawAd.title || rawAd.headline || '',
          description: rawAd.description || '',
          mediaUrl: rawAd.mediaUrl || rawAd.media_url || rawAd.contentUrl || rawAd.content_url || rawAd.thumbnailUrl || rawAd.thumbnail_url || null,
          media_url: rawAd.mediaUrl || rawAd.media_url || rawAd.contentUrl || rawAd.content_url || rawAd.thumbnailUrl || rawAd.thumbnail_url || null,
          url: rawAd.url || rawAd.click_url || rawAd.ctaUrl || rawAd.cta_url || '',
          click_url: rawAd.url || rawAd.click_url || rawAd.ctaUrl || rawAd.cta_url || '',
          ctaText: rawAd.ctaText || rawAd.cta_text || 'Learn More',
          cta_text: rawAd.ctaText || rawAd.cta_text || 'Learn More',
          position: rawAd.position || position,
          adType: rawAd.adType || rawAd.ad_type,
          sdkProvider: rawAd.sdkProvider || rawAd.sdk_provider,
          sdkAdUnitId: rawAd.sdkAdUnitId || rawAd.sdk_ad_unit_id,
          sdkConfig: rawAd.sdkConfig || rawAd.sdk_config,
        };
        
        setCurrentAds(prev => ({ ...prev, [position]: ad }));
        if (process.env.NODE_ENV === 'development') {
          // Successfully fetched ad
        }
        return ad;
      } 
        if (process.env.NODE_ENV === 'development') {
          // No ad available for position
        }
      
      
      return null;
    } catch (err) {return null;
    } finally {
      setAdLoading(prev => ({ ...prev, [position]: false }));
    }
  }, []);

  /**
   * Track ad impression
   */
  const trackImpression = useCallback(async (adId, position) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        // Tracking impression
      }
      
      await api.trackAdImpression(adId, position);
      
      if (process.env.NODE_ENV === 'development') {
        // Successfully tracked impression
      }
    } catch (err) {
      // Ignore tracking errors
    }
  }, []);

  /**
   * Track ad click
   */
  const trackClick = useCallback(async (adId, position, url) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        // Tracking click
      }
      
      await api.trackAdClick(adId, position);
      
      if (process.env.NODE_ENV === 'development') {
        // Successfully tracked click
      }
      
      return url;
    } catch (err) {return url;
    }
  }, []);

  const value = {
    currentAds,
    adLoading,
    fetchAdForPosition,
    trackImpression,
    trackClick,
  };

  return (
    <AdContext.Provider value={value}>
      {children}
    </AdContext.Provider>
  );
};

export default AdContext;




