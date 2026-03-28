import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IoArrowBack, IoCameraOutline, IoImageOutline, IoClose } from 'react-icons/io5';
import './EditProfile.css';
import { useAuth } from '../contexts/AuthContext';
import api, { extractError, getCloudflareImageUrl, getCsrfToken } from '../services/api';
import { useToast } from '../components/Toast';

// In development, use '/api' to proxy through Vite (same-origin for cookies)
// In production, use the actual API URL
const API_URL = import.meta.env.PROD
  ? 'https://xora-workers-api-production.xorasocial.workers.dev'
  : '/api';

const EditPage = () => {
  const { username: pageId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [uploadType, setUploadType] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const loadPage = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/pages/${encodeURIComponent(pageId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, 'Failed to load page');
        throw new Error(message);
      }
      const p = data.data;
      setPage(p);
      setName(p.name || '');
      setBio(p.bio || '');
      setProfileImage(p.avatar_url || null);
      setCoverImage(p.cover_url || null);
    } catch (err) {
      toast.error('Failed to load page');
      navigate(-1);
    }
  }, [pageId, navigate, toast]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !uploadType) return;

    // Store the file for later upload
    if (uploadType === 'avatar') {
      setAvatarFile(file);
    } else if (uploadType === 'cover') {
      setCoverFile(file);
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (uploadType === 'avatar') {
        setProfileImage(reader.result);
      } else if (uploadType === 'cover') {
        setCoverImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = (type) => {
    setUploadType(type);
    setShowUploadOptions(true);
  };

  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
    setShowUploadOptions(false);
  };

  const handleGallerySelect = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
    setShowUploadOptions(false);
  };

  const handleDeletePage = async () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in');
      return;
    }

    setShowDeleteConfirm(true);
  };

  const confirmDeletePage = async () => {
    if (deleteConfirmText !== name) {
      toast.error('Page name does not match. Deletion cancelled.');
      return;
    }

    setLoading(true);
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_URL}/pages/${encodeURIComponent(pageId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, 'Failed to delete page');
        toast.error(message);
        setLoading(false);
        return;
      }

      toast.success('Page deleted successfully');
      setLoading(false);
      setShowDeleteConfirm(false);
      navigate('/');
    } catch (error) {
      toast.error('Failed to delete page');
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in');
      return;
    }

    if (!name.trim()) {
      toast.error('Page name is required');
      return;
    }

    setLoading(true);

    try {
      const updates = {
        name: name.trim(),
        bio: bio.trim(),
      };

      // Upload avatar image if a new file was selected
      if (avatarFile) {
        try {
          // Use the correct /media/* endpoint via api method
          const uploadUrlData = await api.getImageUploadURL();

          if (uploadUrlData && uploadUrlData.uploadURL) {
            const { uploadURL, id, deliveryUrl } = uploadUrlData;

            const formData = new FormData();
            formData.append('file', avatarFile);

            const uploadResponse = await fetch(uploadURL, {
              method: 'POST',
              body: formData,
            });

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json().catch(() => null);
              const finalUrl =
                uploadResult?.result?.url ||
                uploadResult?.result?.variants?.[0] ||
                deliveryUrl ||
                (id ? getCloudflareImageUrl(id) : null);

              if (finalUrl) {
                updates.avatarUrl = finalUrl;
              }
            }
          }
        } catch (err) {
          console.error('Avatar upload failed:', err);
        }
      }

      // Upload cover image if a new file was selected
      if (coverFile) {
        try {
          // Use the correct /media/* endpoint via api method
          const uploadUrlData = await api.getImageUploadURL();

          if (uploadUrlData && uploadUrlData.uploadURL) {
            const { uploadURL, id, deliveryUrl } = uploadUrlData;

            const formData = new FormData();
            formData.append('file', coverFile);

            const uploadResponse = await fetch(uploadURL, {
              method: 'POST',
              body: formData,
            });

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json().catch(() => null);
              const finalUrl =
                uploadResult?.result?.url ||
                uploadResult?.result?.variants?.[0] ||
                deliveryUrl ||
                (id ? getCloudflareImageUrl(id) : null);

              if (finalUrl) {
                updates.coverUrl = finalUrl;
              }
            }
          }
        } catch (err) {
          console.error('Cover upload failed:', err);
        }
      }

      const csrfToken = getCsrfToken();
      const response = await fetch(`${API_URL}/pages/${encodeURIComponent(pageId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, 'Failed to update page');
        toast.error(message);
        setLoading(false);
        return;
      }

      toast.success('Page updated successfully');
      setLoading(false);
      navigate(`/page/${pageId}`);
    } catch (error) {
      toast.error('Failed to update page');
      setLoading(false);
    }
  };

  if (!page) {
    return (
      <div className="edit-profile-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h2>Edit Page</h2>
        <div></div>
      </div>

      <div className="edit-profile-content">
        <h3>Update Page Information</h3>

        {/* Name Input */}
        <div className="form-group">
          <label>Page Name</label>
          <input
            id="edit-page-name"
            name="pageName"
            type="text"
            value={name}
            maxLength={50}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your page name"
          />
        </div>

        {/* Bio Input */}
        <div className="form-group">
          <label>Bio</label>
          <textarea
            id="edit-page-bio"
            name="bio"
            value={bio}
            maxLength={160}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about this page"
            rows={4}
          />
        </div>

        {/* Image Uploads */}
        <div className="image-uploads-section">
          {/* Profile Picture */}
          <div className="image-upload-box">
            <div className="image-upload-label-row">
              <label>Page avatar</label>
              <span className="image-upload-hint">Shown next to your page name across Xora.</span>
            </div>
            <div className="upload-area">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Page avatar"
                  className="preview-image-round"
                />
              ) : (
                <div className="upload-placeholder">
                  <IoCameraOutline />
                  <span>Add a recognizable logo or image</span>
                </div>
              )}
            </div>
            <button
              type="button"
              className="single-upload-btn"
              onClick={() => handleUploadClick('avatar')}
            >
              <IoCameraOutline />
              <span>Upload page avatar</span>
            </button>
          </div>

          {/* Cover Photo */}
          <div className="image-upload-box">
            <div className="image-upload-label-row">
              <label>Page cover photo</label>
              <span className="image-upload-hint">A wide banner shown at the top of your page.</span>
            </div>
            <div className="upload-area cover">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt="Page cover"
                  className="preview-image-rect"
                />
              ) : (
                <div className="upload-placeholder">
                  <IoImageOutline />
                  <span>Add a vibrant header image for your page</span>
                </div>
              )}
            </div>
            <button
              type="button"
              className="single-upload-btn"
              onClick={() => handleUploadClick('cover')}
            >
              <IoImageOutline />
              <span>Upload cover photo</span>
            </button>
          </div>
        </div>

        {/* Update Button */}
        <button
          className="update-btn"
          onClick={handleUpdate}
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Update Page'}
        </button>

        {/* Delete Page Button */}
        <button
          className="delete-btn"
          onClick={handleDeletePage}
          disabled={loading}
          style={{
            marginTop: '20px',
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Delete Page
        </button>
      </div>

      {/* Upload Options Modal */}
      {showUploadOptions ? <div className="upload-modal-overlay" onClick={() => setShowUploadOptions(false)}>
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="upload-modal-header">
              <h3>Choose Upload Method</h3>
              <button
                className="close-modal-btn"
                type="button"
                onClick={() => setShowUploadOptions(false)}
              >
                <IoClose />
              </button>
            </div>
            <div className="upload-options-modal">
              <button className="upload-option" type="button" onClick={handleCameraCapture}>
                <IoCameraOutline className="upload-icon" />
                <span>Use camera</span>
              </button>
              <button className="upload-option" type="button" onClick={handleGallerySelect}>
                <IoImageOutline className="upload-icon" />
                <span>Choose from gallery</span>
              </button>
            </div>
          </div>
        </div> : null}

      {/* Hidden file inputs for camera/gallery */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm ? <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Page</h3>
              <button
                className="close-modal-btn"
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <IoClose />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this page? This action cannot be undone.</p>
              <p><strong>Type the page name to confirm: {name}</strong></p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Enter page name"
                className="confirm-input"
              />
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="delete-btn"
                type="button"
                onClick={confirmDeletePage}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete Page'}
              </button>
            </div>
          </div>
        </div> : null}
    </div>
  );
};

export default EditPage;





