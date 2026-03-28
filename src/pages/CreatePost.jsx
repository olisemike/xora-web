import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IoClose, IoImageOutline, IoVideocamOutline, IoHappyOutline } from 'react-icons/io5';
import AvatarPlaceholder from '../assets/avatar-placeholder.svg';
import './CreatePost.css';
import api, { extractError, getCloudflareImageUrl, getCloudflareVideoUrl } from '../services/api';
import { useToast } from '../components/Toast';

// Allowed media extensions (frontend validation, backend must also enforce)
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'bmp'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', 'mpeg', 'mpg'];

// File size limits (matching backend config)
const MAX_IMAGE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB

// Helper to format file size for display
const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// API URL configuration - Fixed 2024-01-18
// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api');

const isDev = import.meta.env.DEV;

const CreatePost = () => {
  const { user, loading: authLoading, getCurrentUserId, isAuthenticated } = useAuth();
  const activeIdentity = { type: 'user', id: getCurrentUserId() };
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const searchParams = new URLSearchParams(location.search);
  const editPostId = searchParams.get('edit');
  const [content, setContent] = useState('');
  // Store media with type and name so we can render a clean list similar to mobile
  const [media, setMedia] = useState([]); // { type: 'image' | 'video', previewUrl: string, name: string }
  const [postType, setPostType] = useState('POST');
  const [loading, setLoading] = useState(false);
  const [isSensitive, setIsSensitive] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [deletingMediaIndex, setDeletingMediaIndex] = useState(null); // Track which media is being deleted with animation
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const isPageIdentity = false;
  const displayName = user?.name;
  const displayAvatar = user?.avatar;
  const mediaRef = useRef(media);

  // Keep ref in sync with current media
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  // Cleanup: Revoke all object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      mediaRef.current.forEach(item => {
        if (item?.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []); // Empty deps - only cleanup on unmount

  const handleMediaUpload = (e) => {
    const selected = Array.from(e.target.files || []);
    const files = postType === 'STORY' ? selected.slice(0, 1) : selected;
    if (postType === 'STORY' && selected.length > 1) {
      toast.info('Stories can only include one photo or video.');
    }
    if (!files.length) return;

    const newItems = [];

    files.forEach((file, index) => {
      const rawName = file.name || '';
      const ext = rawName.includes('.') ? rawName.split('.').pop().toLowerCase() : '';

      let type = null;
      if (IMAGE_EXTENSIONS.includes(ext)) {
        type = 'image';
      } else if (VIDEO_EXTENSIONS.includes(ext)) {
        type = 'video';
      }

      // Fallback: try MIME type if extension is missing/odd
      if (!type && file.type) {
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
      }

      if (!type) {
        toast.error(
          'Unsupported file type. Supported formats: JPG/PNG/WEBP/GIF/HEIC/HEIF/BMP/MP4/MOV/AVI/MKV/WebM/WMV/FLV/MPEG'
        );
        return;
      }

      // File size validation
      const maxSize = type === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (file.size > maxSize) {
        toast.error(`${rawName} is too large (${formatFileSize(file.size)}). Max size: ${formatFileSize(maxSize)}`);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      const name = rawName || `Media ${media.length + newItems.length + index + 1}`;
      newItems.push({ type, previewUrl, name, file }); // Store the actual file for upload
    });

    if (newItems.length) {
      setMedia((prev) => [...prev, ...newItems]);
    }

    // Allow re-selecting the same file(s)
    if (e.target) {
      e.target.value = '';
    }
  };

  const openMediaChooser = () => {
    setShowUploadOptions(true);
  };

  const handleCameraClick = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
    setShowUploadOptions(false);
  };

  const handleGalleryClick = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
    setShowUploadOptions(false);
  };

  const removeMediaItem = async (index) => {
    // Start deletion animation: set loading state
    setDeletingMediaIndex(index);
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 300));
    // Remove from list and revoke object URL
    setMedia((prev) => {
      const removed = prev[index];
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
    // Clear loading state
    setDeletingMediaIndex(null);
  };

  const handleSubmit = async () => {
    // Story validation: must have media, content is optional (for description)
    if (postType === 'STORY') {
      if (media.length === 0) {
        toast.error('Stories require at least one image or video');
        return;
      }
      // Content is allowed but limited for stories (caption/description)
      if (content.trim().length > 200) {
        toast.error('Story descriptions must be under 200 characters');
        return;
      }
    } else {
      // Post validation: must have content or media
      if (!content.trim() && media.length === 0) {
        toast.error('Please add some content or media');
        return;
      }
    }

    if (!isAuthenticated) {
      toast.error('You must be logged in to create a post');
      return;
    }

    const actorType = 'user';
    const actorId = getCurrentUserId();

    setLoading(true);

    try {
      // If we're editing an existing post, just send an update payload (no media editing yet)
      if (editPostId) {
        try {
          const updates = {
            content: content.trim(),
            isSensitive,
          };
          const response = await fetch(`${API_URL}/posts/${encodeURIComponent(editPostId)}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(updates),
          });
          const data = await response.json();
          if (!response.ok || !data?.success) {
            const message = extractError(data, response.status, 'Failed to update post');
            toast.error(message);
            setLoading(false);
            return;
          }
          navigate(`/post/${editPostId}`);
          return;
        } catch (err) {
          toast.error('Something went wrong while updating your post. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Upload media files to backend storage first
      const uploadedMediaUrls = [];

      // Process all media uploads in parallel
      const mediaToUpload = postType === 'STORY' ? media.slice(0, 1) : media;
      const uploadPromises = mediaToUpload.map(async (item) => {
        if (!item.file) return null; // Skip if no file object

        try {
          // Get upload URL from backend using the correct /media/* endpoints
          const uploadUrlData = item.type === 'image'
            ? await api.getImageUploadURL()
            : await api.getVideoUploadURL(3600);

          if (!uploadUrlData || !uploadUrlData.uploadURL) {
            console.error('Failed to get upload URL for', item.name);
            return null;
          }

          const { uploadURL, id, deliveryUrl, playbackUrl } = uploadUrlData;

          // Upload file to storage
          const formData = new FormData();
          formData.append('file', item.file);

          const uploadResponse = await fetch(uploadURL, {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            return null;
          }

          let uploadResult = null;
          try {
            uploadResult = await uploadResponse.json();
          } catch {
            uploadResult = null;
          }

          // Extract the final URL from the upload response
          let finalUrl = null;
          if (item.type === 'image') {
            finalUrl = uploadResult?.result?.url ||
                      uploadResult?.result?.variants?.[0] ||
                      deliveryUrl ||
                      getCloudflareImageUrl(id);
          } else {
            finalUrl = uploadResult?.result?.url ||
                      uploadResult?.result?.playback ||
                      uploadResult?.result?.variants?.[0] ||
                      playbackUrl ||
                      getCloudflareVideoUrl(id);
          }

          return {
            type: item.type,
            url: finalUrl,
            name: item.name,
            cloudflareId: id, // Track the Cloudflare media ID for cleanup on deletion
          };
        } catch (uploadError) {
          console.error(`Failed to upload ${item.name}:`, uploadError);
          return { error: true, name: item.name, type: item.type };
        }
      });

      // Wait for all uploads to complete
      const uploadResults = await Promise.allSettled(uploadPromises);

      // Collect successful uploads and track failures
      const failedUploads = [];
      uploadResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          if (result.value.error) {
            failedUploads.push(result.value.name);
          } else {
            uploadedMediaUrls.push(result.value);
          }
        } else if (result.status === 'rejected') {
          failedUploads.push('Unknown file');
        }
      });

      // Warn user about failed uploads
      if (failedUploads.length > 0) {
        toast.error(`Failed to upload: ${failedUploads.join(', ')}`);
      }

      // Collect Cloudflare IDs for cleanup on deletion
      const cloudflareImageIds = uploadedMediaUrls
        .filter(media => media.type === 'image' && media.cloudflareId)
        .map(media => media.cloudflareId);
      
      const cloudflareVideoIds = uploadedMediaUrls
        .filter(media => media.type === 'video' && media.cloudflareId)
        .map(media => media.cloudflareId);

      // Branch between creating a story vs a post
      if (postType === 'STORY') {
        // Stories use a separate endpoint
        const storyPayload = {
          actorType,
          actorId,
          mediaType: uploadedMediaUrls.length > 0 ? uploadedMediaUrls[0].type : 'image',
          mediaUrl: uploadedMediaUrls.length > 0 ? uploadedMediaUrls[0].url : null,
          duration: uploadedMediaUrls.length > 0 && uploadedMediaUrls[0]?.type === 'video' ? 15 : 5,
          isSensitive,
          content: content.trim(), // Story caption/description
        };

        if (isDev) {
          console.info('Creating story payload ready');
        }

        await api.createStory(storyPayload);
        toast.success('Story created!');
        setLoading(false);
        navigate('/');
      } else {
        // Regular post creation
        const payload = {
          actorType,
          actorId,
          content: content.trim(),
          mediaType: uploadedMediaUrls.length > 0 ? uploadedMediaUrls[0].type : null,
          mediaUrls: uploadedMediaUrls.length > 0 ? uploadedMediaUrls : null,
          ...(cloudflareImageIds.length > 0 ? { cloudflareImageIds } : {}),
          ...(cloudflareVideoIds.length > 0 ? { cloudflareVideoIds } : {}),
          sensitive: isSensitive,
        };

        if (isDev) {
          console.info('Creating post payload ready');
        }

        const response = await api.createPost(payload);

        // On success, navigate to the new post or back to home/feed
        setLoading(false);
        const newPostId = response.data?.id;
        if (newPostId) {
          navigate(`/post/${newPostId}`);
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      toast.error('Something went wrong while creating your post. Please try again.');
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="create-post-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-post-container">
      <div className="create-post-header">
        <button className="discard-btn" onClick={() => navigate(-1)}>
          Discard
        </button>
        <h2>{editPostId ? 'EDIT POST' : 'CREATE'}</h2>
        <button
          className="publish-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (editPostId ? 'Updating...' : 'Publishing...') : (editPostId ? 'Update' : 'Publish')}
        </button>
      </div>

      <div className="create-post-content">
        <div className="user-info-create">
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayName || 'You'}
              className="user-avatar-create"
            />
          ) : (
            <img
              src={AvatarPlaceholder}
              alt="Default avatar"
              className="user-avatar-create"
            />
          )}
          <span className="user-name-create">
            {displayName || user?.name || 'You'}
            {Boolean(isPageIdentity) && (
              <span style={{ marginLeft: 8, fontSize: '0.8em', color: '#666' }}>
                (Page identity)
              </span>
            )}
          </span>
        </div>

        <textarea
          id="post-content"
          name="content"
          placeholder={postType === 'STORY' ? "Add a description (optional, max 200 chars)" : "What's on your mind?"}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="post-textarea"
          rows="6"
          maxLength={postType === 'STORY' ? 200 : 5000}
        />
        {postType === 'STORY' && (
          <p className="story-hint" style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
            {content.length}/200 characters {media.length === 0 && '• Stories require at least one image or video'}
          </p>
        )}

        <div className="sensitive-row">
          <label className="sensitive-label">
            <input
              type="checkbox"
              id="sensitive"
              name="sensitive"
              checked={isSensitive}
              onChange={(e) => setIsSensitive(e.target.checked)}
            />
            <span>Mark this post as sensitive content</span>
          </label>
          <p className="sensitive-help">
            For nudity, violence, or other content that should be blurred or hidden.
          </p>
        </div>

        {media.length > 0 && (
          <>
            {/* Media Preview Gallery */}
            <div className="media-preview-gallery">
              {media.map((item, index) => (
                <div 
                  key={`preview-${index}`}
                  className={`media-preview-item ${deletingMediaIndex === index ? 'media-deleting' : ''}`}
                  style={{
                    position: 'relative',
                    opacity: deletingMediaIndex === index ? 0.5 : 1,
                    transform: deletingMediaIndex === index ? 'scale(0.95)' : 'scale(1)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {item.type === 'image' ? (
                    <img 
                      src={item.previewUrl} 
                      alt={item.name}
                      className="media-preview-image"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  ) : (
                    <video 
                      src={item.previewUrl}
                      className="media-preview-video"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  )}
                  <button
                    type="button"
                    className="media-delete-overlay-btn"
                    onClick={() => removeMediaItem(index)}
                    aria-label="Remove media"
                    disabled={deletingMediaIndex === index}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: deletingMediaIndex === index ? 'wait' : 'pointer',
                      opacity: deletingMediaIndex === index ? 0.5 : 1
                    }}
                  >
                    <IoClose size={18} />
                  </button>
                </div>
              ))}
            </div>

            {/* Media List / Info */}
            <div className="media-list">
              {media.map((item, index) => (
                <div 
                  key={index} 
                  className={`media-list-item ${deletingMediaIndex === index ? 'media-deleting' : ''}`}
                  style={{
                    opacity: deletingMediaIndex === index ? 0.5 : 1,
                    transform: deletingMediaIndex === index ? 'scale(0.95)' : 'scale(1)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div className="media-icon">
                    {item.type === 'image' ? <IoImageOutline /> : <IoVideocamOutline />}
                  </div>
                  <div className="media-meta">
                    <div className="media-name" title={item.name}>
                      {item.name}
                    </div>
                    <div className="media-type">
                      {item.type === 'image' ? 'Image' : 'Video'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="media-remove-btn"
                    onClick={() => removeMediaItem(index)}
                    aria-label="Remove media"
                    disabled={deletingMediaIndex === index}
                    style={{ opacity: deletingMediaIndex === index ? 0 : 1 }}
                  >
                    {deletingMediaIndex === index ? (
                      <div className="spinner-inline" />
                    ) : (
                      <IoClose />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="post-actions-create">
          <button
            type="button"
            className="upload-btn"
            onClick={openMediaChooser}
          >
            <IoImageOutline />
            <span>Upload media</span>
          </button>

          <button className="upload-btn" type="button">
            <IoHappyOutline />
            <span>Add Emoji</span>
          </button>
        </div>

        <div className="post-type-toggle">
          <button
            className={`toggle-btn ${postType === 'POST' ? 'active' : ''}`}
            onClick={() => setPostType('POST')}
          >
            POST
          </button>
          <button
            className={`toggle-btn ${postType === 'STORY' ? 'active' : ''}`}
            onClick={() => setPostType('STORY')}
          >
            STORY
          </button>
        </div>
      </div>

      {/* Media source chooser (Camera vs Gallery) */}
      {Boolean(showUploadOptions) && (
        <div className="upload-modal-overlay" onClick={() => setShowUploadOptions(false)}>
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="upload-modal-header">
              <h3>Choose Upload Method</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowUploadOptions(false)}
              >
                <IoClose />
              </button>
            </div>
            <div className="upload-options-modal">
              <button type="button" className="upload-option" onClick={handleCameraClick}>
                <IoVideocamOutline className="upload-icon" />
                <span>Use camera</span>
              </button>
              <button type="button" className="upload-option" onClick={handleGalleryClick}>
                <IoImageOutline className="upload-icon" />
                <span>Choose from gallery</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs for camera/gallery */}
      <input
        ref={cameraInputRef}
        id="camera-input"
        name="camera"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.bmp,image/*,.mp4,.mov,.avi,.mkv,.webm,.wmv,.flv,.mpeg,.mpg,video/*"
        capture="environment"
        multiple
        style={{ display: 'none' }}
        onChange={handleMediaUpload}
      />
      <input
        ref={galleryInputRef}
        id="gallery-input"
        name="gallery"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.bmp,image/*,.mp4,.mov,.avi,.mkv,.webm,.wmv,.flv,.mpeg,.mpg,video/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleMediaUpload}
      />
    </div>
  );
};

export default CreatePost;




