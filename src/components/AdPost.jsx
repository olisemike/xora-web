import React, { useEffect, useRef } from 'react';
import './AdPost.css';
import AdSDK from './AdSDK';
import { api } from '../services/api';

const AdPost = ({ adData, onImpression }) => {
  const viewRef = useRef(null);
  const impressionTrackedRef = useRef(false);

  useEffect(() => {
    if (!impressionTrackedRef.current && adData?.id) {
      impressionTrackedRef.current = true;
      const position = adData?.position || 'feed';
      if (onImpression) {
        onImpression(adData.id, position);
      }
      api.trackAdImpression(adData.id, position).catch(() => {});
    }
  }, [adData?.id, adData?.position, onImpression]);

  if (!adData) return null;

  // Handle SDK ads
  if (adData.adType === 'sdk' || adData.sdkProvider) {
    return (
      <AdSDK
        adData={adData}
        onImpression={onImpression}
        onClick={(_adId) => {
          // Handle SDK ad clicks if needed
        }}
      />
    );
  }

  const handleClick = () => {
    const clickUrl = adData.url || adData.click_url || adData.redirectUrl || '';
    if (adData.id && clickUrl) {
      api.trackAdClick(adData.id, adData?.position || 'feed').catch(() => {});
      window.open(clickUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const title = adData.title || adData.headline || '';
  const description = adData.description || adData.content || '';
  const mediaUrl = adData.mediaUrl || adData.media_url || adData.image_url || '';
  const ctaText = adData.ctaText || adData.cta_text || 'Learn More';

  return (
    <article
      className="ad-post"
      ref={viewRef}
      role="article"
      aria-label={`Sponsored advertisement from ${adData.advertiser_name || 'advertiser'}`}
    >
      <div className="ad-post-header">
        <div className="ad-post-user">
          <div className="ad-post-avatar" aria-hidden="true">
            {adData.advertiser_avatar ? (
              <img src={adData.advertiser_avatar} alt="" />
            ) : (
              <div className="avatar-placeholder">
                {(adData.advertiser_name || 'A')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="ad-post-user-info">
            <span className="ad-post-name">{adData.advertiser_name || 'Sponsored Ad'}</span>
            <span className="ad-post-username" aria-hidden="true">@{(adData.advertiser_name || 'advertisement').toLowerCase().replace(/\s+/g, '')}</span>
          </div>
        </div>
        <div className="ad-badge" role="status" aria-label="Sponsored content">
          <span>Sponsored</span>
        </div>
      </div>

      <div
        className="ad-post-content"
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        role="button"
        tabIndex={0}
        aria-label={`View advertisement: ${title || 'Sponsored content'}`}
      >
        {title ? <p className="ad-post-title">{title}</p> : null}
        {description ? <p>{description}</p> : null}

        {mediaUrl ? <div className="ad-post-media">
            <img src={mediaUrl} alt={title || 'Advertisement image'} onError={() => {}} />
          </div> : null}

        <div className="ad-post-cta">
          <button
            className="ad-cta-button"
            aria-label={`${ctaText} - opens in new tab`}
          >
            {ctaText}
          </button>
        </div>
      </div>
    </article>
  );
};

export default AdPost;




