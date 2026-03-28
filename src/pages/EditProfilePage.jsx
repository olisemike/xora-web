import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoCamera, IoImage, IoClose } from 'react-icons/io5';
import './EditProfilePage.css';
import { useToast } from '../components/Toast';

const EditProfilePage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [uploadType, setUploadType] = useState(null); // 'avatar' or 'cover'
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  
  const [profile, setProfile] = useState({
    name: 'John Doe',
    username: 'johndoe',
    bio: 'Living life one day at a time 🌟',
    website: 'https://example.com',
    location: 'New York, USA',
    avatar: null,
    coverPhoto: null
  });

  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [previewCover, setPreviewCover] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUploadClick = (type) => {
    setUploadType(type);
    setShowUploadOptions(true);
  };

  const handleCameraCapture = () => {
    cameraInputRef.current.click();
    setShowUploadOptions(false);
  };

  const handleGallerySelect = () => {
    galleryInputRef.current.click();
    setShowUploadOptions(false);
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'avatar') {
          setPreviewAvatar(reader.result);
          setProfile(prev => ({ ...prev, avatar: file }));
        } else {
          setPreviewCover(reader.result);
          setProfile(prev => ({ ...prev, coverPhoto: file }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    // Here you would send the data to your backend
    toast.success('Profile updated successfully!');
    navigate(-1);
  };

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h1>Edit Profile</h1>
        <button className="save-btn" onClick={handleSave}>
          Save
        </button>
      </div>

      <div className="edit-profile-content">
        {/* Cover Photo */}
        <div className="cover-photo-section">
          <div className="cover-photo-container">
            {previewCover || profile.coverPhoto ? (
              <img 
                src={previewCover || profile.coverPhoto} 
                alt="Cover" 
                className="cover-photo"
              />
            ) : (
              <div className="cover-photo-placeholder">
                <IoCamera />
              </div>
            )}
            <button 
              className="upload-cover-btn"
              onClick={() => handleUploadClick('cover')}
            >
              <IoCamera />
              <span>Edit Cover Photo</span>
            </button>
          </div>

          {/* Profile Avatar */}
          <div className="avatar-section">
            <div className="avatar-container">
              {previewAvatar || profile.avatar ? (
                <img 
                  src={previewAvatar || profile.avatar} 
                  alt="Avatar" 
                  className="profile-avatar"
                />
              ) : (
                <div className="avatar-placeholder">
                  {profile.name && profile.name[0] ? profile.name[0] : 'U'}
                </div>
              )}
              <button 
                className="upload-avatar-btn"
                onClick={() => handleUploadClick('avatar')}
              >
                <IoCamera />
              </button>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="form-section">
          <div className="form-group">
            <label>Name</label>
            <input
              id="profile-name"
              type="text"
              name="name"
              value={profile.name}
              onChange={handleInputChange}
              placeholder="Your name"
            />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              id="profile-username"
              type="text"
              name="username"
              value={profile.username}
              onChange={handleInputChange}
              placeholder="Username"
            />
          </div>

          <div className="form-group">
            <label>Bio</label>
            <textarea
              id="profile-bio"
              name="bio"
              value={profile.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself"
              rows="4"
            />
          </div>

          <div className="form-group">
            <label>Website</label>
            <input
              type="url"
              name="website"
              value={profile.website}
              onChange={handleInputChange}
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              id="profile-location"
              type="text"
              name="location"
              value={profile.location}
              onChange={handleInputChange}
              placeholder="City, Country"
            />
          </div>
        </div>
      </div>

      {/* Upload Options Modal */}
      {showUploadOptions ? <div className="upload-modal-overlay" onClick={() => setShowUploadOptions(false)}>
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="upload-modal-header">
              <h3>Choose Upload Method</h3>
              <button 
                className="close-modal-btn" 
                onClick={() => setShowUploadOptions(false)}
              >
                <IoClose />
              </button>
            </div>
            <div className="upload-options">
              <button className="upload-option" onClick={handleCameraCapture}>
                <IoCamera className="upload-icon" />
                <span>Take Photo</span>
              </button>
              <button className="upload-option" onClick={handleGallerySelect}>
                <IoImage className="upload-icon" />
                <span>Choose from Gallery</span>
              </button>
            </div>
          </div>
        </div> : null}

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, uploadType)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, uploadType)}
      />
    </div>
  );
};

export default EditProfilePage;





