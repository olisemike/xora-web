import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import './LegalPages.css';

const AboutUs = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page-container">
      <div className="legal-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h1>About Us</h1>
      </div>

      <div className="legal-content">
        <section>
          <h2>App Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <strong>App Name:</strong>
              <span>Xora Social</span>
            </div>
            <div className="info-item">
              <strong>Version:</strong>
              <span>1.0.0</span>
            </div>
            <div className="info-item">
              <strong>Release Date:</strong>
              <span>December 2025</span>
            </div>
            <div className="info-item">
              <strong>Developer / Company:</strong>
              <span>Xora Social</span>
            </div>
            <div className="info-item">
              <strong>Website:</strong>
              <span><a href="https://www.xorasocial.com" target="_blank" rel="noopener noreferrer">https://www.xorasocial.com</a></span>
            </div>
          </div>
        </section>

        <section>
          <h2>Our Mission</h2>
          <p>
            Xora Social is a community-driven social media platform enabling users to share posts, videos, and stories 
            while connecting with friends, pages, and communities worldwide. Our mission is to make social connections 
            engaging, safe, and accessible for everyone.
          </p>
        </section>

        <section>
          <h2>What We Offer</h2>
          <ul>
            <li>Share posts, photos, and videos with your network</li>
            <li>Connect with friends and discover new communities</li>
            <li>Create and manage pages for your interests</li>
            <li>Share temporary stories that disappear after 24 hours</li>
            <li>Watch and create short-form video content (Reels)</li>
            <li>Private messaging with friends and groups</li>
            <li>Explore trending topics and discover new content</li>
          </ul>
        </section>

        <section>
          <h2>Our Commitment</h2>
          <p>
            We are committed to providing a safe, inclusive, and engaging platform where users can express themselves 
            freely while respecting the rights and dignity of others. We continuously work to improve our platform and 
            ensure the best experience for our community.
          </p>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;





