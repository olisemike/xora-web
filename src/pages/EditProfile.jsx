import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IoArrowBack, IoCameraOutline, IoImageOutline, IoClose } from 'react-icons/io5';
import './EditProfile.css';
import api, { extractError, getCloudflareImageUrl } from '../services/api';
import { useToast } from '../components/Toast';

const EditProfile = () => {
  const { user, isAuthenticated, updateProfile, getCurrentUserId } = useAuth();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState(null); // preview data URL for avatar
  const [coverImage, setCoverImage] = useState(null); // preview data URL for cover
  const [profileFile, setProfileFile] = useState(null); // actual File for avatar upload
  const [coverFile, setCoverFile] = useState(null); // actual File for cover upload
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [uploadType, setUploadType] = useState(null); // 'avatar' | 'cover'
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setLocation(user.location || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !uploadType) return;

    // Store the file so we can upload it to Cloudflare Images
    if (uploadType === 'avatar') {
      setProfileFile(file);
      setRemoveAvatar(false);
    } else if (uploadType === 'cover') {
      setCoverFile(file);
      setRemoveCover(false);
    }

    // Also generate a quick preview for the UI
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

  const handleUpdate = async () => {
    if (!isAuthenticated) {
      toast.error('You must be logged in');
      return;
    }

    setLoading(true);

    try {
      // In development, use '/api' to proxy through Vite (same-origin for cookies)
      // In production, use the actual API URL
      const API_URL = import.meta.env.PROD
        ? 'https://xora-workers-api-production.xorasocial.workers.dev'
        : '/api';

      const updates = {
        name,
        location,
        bio,
      };

      // If user chose to remove avatar and did not select a new one, clear it
      if (removeAvatar && !profileFile) {
        updates.avatarUrl = null;
      }

      // If user chose to remove cover and did not select a new one, clear it
      if (removeCover && !coverFile) {
        updates.coverUrl = null;
      }

      // Upload avatar image if a new file was selected
      if (profileFile) {
        try {
          // Use the correct /media/* endpoint via api method
          const uploadUrlData = await api.getImageUploadURL();

          if (uploadUrlData && uploadUrlData.uploadURL) {
            const { uploadURL, id, deliveryUrl } = uploadUrlData;

            const formData = new FormData();
            formData.append('file', profileFile);

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
            } else {
              // No avatar file selected
            }
          } else {
            // No avatar file
          }
        } catch (err) {
          // Ignore avatar upload errors
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
            } else {
              // No cover file selected
            }
          } else {
            // No cover file
          }
        } catch (err) {
          // Ignore cover upload errors
        }
      }

      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        const message = extractError(data, response.status, 'Failed to update profile');
        toast.error(message);
        setLoading(false);
        return;
      }

      // Update context with new profile data
      if (data.data?.user) {
        updateProfile(data.data.user);
      } else {
        updateProfile(updates);
      }

      setLoading(false);
      navigate(user ? `/profile/${user.username || getCurrentUserId()}` : '/');
    } catch (error) {
      toast.error('Failed to update profile');
      setLoading(false);
    }
  };

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h2>Edit Profile</h2>
        <div></div>
      </div>

      <div className="edit-profile-content">
        <h3>Update Profile Information</h3>

        {/* Name Input */}
        <div className="form-group">
          <label>Name</label>
          <input
            id="edit-name"
            name="name"
            type="text"
            value={name}
            maxLength={30}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        {/* Location Input */}
        <div className="form-group">
          <label>Location</label>
          <input
            id="edit-location"
            name="location"
            type="text"
            value={location}
            maxLength={40}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Brooklyn NY"
          />
        </div>

        {/* Bio Input */}
        <div className="form-group">
          <label>Bio</label>
          <textarea
            id="edit-profile-bio"
            name="bio"
            value={bio}
            maxLength={160}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Writer by Profession. Artist by passion!"
            rows={4}
          />
        </div>

        {/* Image Uploads */}
        <div className="image-uploads-section">
          {/* Profile Picture */}
          <div className="image-upload-box">
            <div className="image-upload-label-row">
              <label>Your profile photo</label>
              <span className="image-upload-hint">This appears on your posts and profile.</span>
            </div>
            <div className="upload-area">
              {(!removeAvatar && (profileImage || user?.avatar_url || user?.avatar)) ? (
                <img
                  src={profileImage || user?.avatar_url || user?.avatar}
                  alt="Profile"
                  className="preview-image-round"
                />
              ) : (
                <div className="upload-placeholder">
                  <IoCameraOutline />
                  <span>Add a clear photo of yourself</span>
                </div>
              )}
            </div>
            <div className="image-upload-actions-row">
              <button
                type="button"
                className="single-upload-btn"
                onClick={() => handleUploadClick('avatar')}
              >
                <IoCameraOutline />
                <span>Upload profile photo</span>
              </button>
              {(user?.avatar_url || user?.avatar || profileImage) ? <button
                  type="button"
                  className="single-upload-btn danger"
                  onClick={() => {
                    setProfileImage(null);
                    setProfileFile(null);
                    setRemoveAvatar(true);
                  }}
                >
                  <IoClose />
                  <span>Remove photo</span>
                </button> : null}
            </div>
          </div>

          {/* Cover Photo */}
          <div className="image-upload-box">
            <div className="image-upload-label-row">
              <label>Your cover photo</label>
              <span className="image-upload-hint">Show your style with a wide header image.</span>
            </div>
            <div className="upload-area cover">
              {(!removeCover && (coverImage || user?.cover_url || user?.coverImage)) ? (
                <img
                  src={coverImage || user?.cover_url || user?.coverImage}
                  alt="Cover"
                  className="preview-image-rect"
                />
              ) : (
                <div className="upload-placeholder">
                  <IoImageOutline />
                  <span>Add a wide photo for the top of your profile</span>
                </div>
              )}
            </div>
            <div className="image-upload-actions-row">
              <button
                type="button"
                className="single-upload-btn"
                onClick={() => handleUploadClick('cover')}
              >
                <IoImageOutline />
                <span>Upload cover photo</span>
              </button>
              {(user?.cover_url || user?.coverImage || coverImage) ? <button
                  type="button"
                  className="single-upload-btn danger"
                  onClick={() => {
                    setCoverImage(null);
                    setCoverFile(null);
                    setRemoveCover(true);
                  }}
                >
                  <IoClose />
                  <span>Remove cover</span>
                </button> : null}
            </div>
          </div>
        </div>

        {/* Update Button */}
        <button 
          className="update-btn" 
          onClick={handleUpdate}
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Update'}
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
    </div>
  );
};

export default EditProfile;





