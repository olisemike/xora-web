import React, { useEffect, useMemo, useState } from 'react';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import LazyImage from './LazyImage';
import LazyVideo from './LazyVideo';
import MediaErrorBoundary from './MediaErrorBoundary';
import {
  getCloudflareImageUrl,
  getCloudflareVideoThumbnailUrl,
  getCloudflareVideoUrl,
} from '../services/api';
import './LazyMedia.css';

const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'm3u8'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'aac'];

const getMediaType = (item) => {
  if (!item) return 'image';
  if (item.type) return item.type;
  if (item.media_type) return item.media_type;
  if (item.mediaType) return item.mediaType;
  if (item.videoId || item.cloudflareVideoId || item.cloudflareStreamId) return 'video';
  if (item.cloudflareId || item.imageId || item.cloudflareImageId) return 'image';

  const url =
    item.url ||
    item.uri ||
    item.image_url ||
    item.media_url ||
    item.mediaUrl ||
    item.video_url ||
    item.videoUrl ||
    item.playbackUrl ||
    item.playback_url ||
    '';

  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();

  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (ext === 'gif') return 'gif';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  return 'image';
};

const getStreamId = (value) => {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/cloudflarestream\.com\/([^/]+)\/(manifest|thumbnails)|videodelivery\.net\/([^/]+)\//i);
  return match?.[1] || match?.[3] || null;
};

const getMediaUrl = (item) => {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';

  const direct =
    item.url ||
    item.uri ||
    item.image_url ||
    item.media_url ||
    item.mediaUrl ||
    item.video_url ||
    item.videoUrl ||
    item.playbackUrl ||
    item.playback_url ||
    item.deliveryUrl ||
    item.delivery_url ||
    '';

  if (direct) return direct;

  const imageId = item.cloudflareId || item.imageId || item.cloudflareImageId;
  if (imageId) return getCloudflareImageUrl(imageId);

  const videoId = item.videoId || item.cloudflareVideoId || item.cloudflareStreamId;
  if (videoId) return getCloudflareVideoUrl(videoId);

  return '';
};

const getMediaPoster = (item, url = '') => {
  if (!item || typeof item !== 'object') return '';

  const direct =
    item.thumbnail ||
    item.poster ||
    item.thumbnailUrl ||
    item.thumbnail_url ||
    item.thumbnailUri ||
    item.posterUrl ||
    item.poster_url ||
    item.previewImage ||
    item.preview_image ||
    '';

  if (direct) return direct;

  const videoId = item.videoId || item.cloudflareVideoId || item.cloudflareStreamId || getStreamId(url);
  if (videoId) return getCloudflareVideoThumbnailUrl(videoId);

  return '';
};

const normalizeMedia = (media) => {
  const items = Array.isArray(media) ? media : media ? [media] : [];

  return items
    .map((item) => {
      const url = getMediaUrl(item);
      if (!url) return null;
      const type = getMediaType(item);
      return {
        ...(typeof item === 'object' ? item : { url: item }),
        url,
        type,
        poster: getMediaPoster(item, url),
      };
    })
    .filter(Boolean);
};

const renderMediaItem = ({ item, index, isActive, handleClick, showVideoControls, autoPlayVideo, allowInlineVideoPlayback }) => {
  const { url, type, poster } = item;
  const useInlineVideo = allowInlineVideoPlayback && (type === 'video' || type === 'gif');

  if (type === 'video' || type === 'gif') {
    return (
      <LazyVideo
        src={url}
        poster={poster}
        alt={`Post video ${index + 1}`}
        autoPlay={isActive && (type === 'gif' || autoPlayVideo)}
        loop={type === 'gif'}
        muted
        controls={showVideoControls}
        showPlayButton={type === 'video'}
        disableInlinePlayback={!useInlineVideo}
        stopPropagationOnClick
        onClick={useInlineVideo ? undefined : (e) => handleClick(e, index, item)}
      />
    );
  }

  if (type === 'audio') {
    return (
      <div className="post-media-audio" onClick={(e) => handleClick(e, index, item)}>
        <span className="post-media-audio-text">Audio</span>
      </div>
    );
  }

  return <LazyImage src={url} alt={`Post media ${index + 1}`} onClick={(e) => handleClick(e, index, item)} />;
};

const PostMedia = ({
  media,
  className = '',
  onMediaClick,
  showVideoControls = false,
  autoPlayVideo = false,
  allowInlineVideoPlayback = true,
}) => {
  const validMedia = useMemo(() => normalizeMedia(media), [media]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [media]);

  if (validMedia.length === 0) {
    return null;
  }

  const handleClick = (e, index, item) => {
    e.stopPropagation();
    onMediaClick?.(index, item);
  };

  if (validMedia.length === 1) {
    const item = validMedia[0];
    return (
      <MediaErrorBoundary className={`post-media ${className}`}>
        <div className={`post-media-single ${className}`.trim()} data-media-type={item.type}>
          {renderMediaItem({
            item,
            index: 0,
            isActive: true,
            handleClick,
            showVideoControls,
            autoPlayVideo,
            allowInlineVideoPlayback,
          })}
        </div>
      </MediaErrorBoundary>
    );
  }

  const activeItem = validMedia[currentIndex] || validMedia[0];
  const goPrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + validMedia.length) % validMedia.length);
  };
  const goNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % validMedia.length);
  };

  return (
    <MediaErrorBoundary className={`post-media ${className}`}>
      <div className={`post-media-carousel ${className}`.trim()} data-media-count={validMedia.length}>
        <div className="post-media-carousel-stage" data-media-type={activeItem.type}>
          {renderMediaItem({
            item: activeItem,
            index: currentIndex,
            isActive: true,
            handleClick,
            showVideoControls,
            autoPlayVideo,
            allowInlineVideoPlayback,
          })}

          <button type="button" className="post-media-nav prev" onClick={goPrev} aria-label="Previous media">
            <IoChevronBack />
          </button>
          <button type="button" className="post-media-nav next" onClick={goNext} aria-label="Next media">
            <IoChevronForward />
          </button>

          <div className="post-media-counter">{currentIndex + 1}/{validMedia.length}</div>
        </div>

        <div className="post-media-dots">
          {validMedia.map((item, index) => (
            <button
              key={`${item.url}-${index}`}
              type="button"
              className={`post-media-dot ${index === currentIndex ? 'active' : ''}`}
              aria-label={`Show media ${index + 1}`}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
            />
          ))}
        </div>
      </div>
    </MediaErrorBoundary>
  );
};

export default PostMedia;


