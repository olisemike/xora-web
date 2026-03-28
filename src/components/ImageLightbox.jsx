import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoChevronBack, IoChevronForward, IoDownloadOutline, IoShareOutline } from 'react-icons/io5';
import './ImageLightbox.css';
import { useToast } from '../components/Toast';

const ImageLightbox = ({ images, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const toast = useToast();

  const minSwipeDistance = 50;

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setIsZoomed(false);
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setIsZoomed(false);
  }, [images.length]);

  useEffect(() => {
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, onClose, handlePrevious, handleNext]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = images[currentIndex].url;
    link.download = `image-${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Share Image',
          text: 'Check out this image!',
          url: images[currentIndex].url,
        });
      } catch (error) {
        // Share cancelled or not supported
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(images[currentIndex].url);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    }
    if (isRightSwipe) {
      handlePrevious();
    }
  };

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="lightbox-header">
          <div className="lightbox-counter">
            {currentIndex + 1} / {images.length}
          </div>
          <div className="lightbox-actions">
            <button className="lightbox-btn" onClick={handleDownload} title="Download">
              <IoDownloadOutline />
            </button>
            <button className="lightbox-btn" onClick={handleShare} title="Share">
              <IoShareOutline />
            </button>
            <button className="lightbox-btn" onClick={onClose} title="Close">
              <IoClose />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div 
          className="lightbox-image-container"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={images[currentIndex].url}
            alt={`Image ${currentIndex + 1}`}
            className={`lightbox-image ${isZoomed ? 'zoomed' : ''}`}
            onClick={() => setIsZoomed(!isZoomed)}
            draggable={false}
          />
        </div>

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button 
              className="lightbox-nav lightbox-nav-prev" 
              onClick={handlePrevious}
              title="Previous"
            >
              <IoChevronBack />
            </button>
            <button 
              className="lightbox-nav lightbox-nav-next" 
              onClick={handleNext}
              title="Next"
            >
              <IoChevronForward />
            </button>
          </>
        )}

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="lightbox-thumbnails">
            {images.map((image, index) => (
              <div
                key={index}
                className={`lightbox-thumbnail ${index === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsZoomed(false);
                }}
              >
                <img src={image.url} alt={`Thumbnail ${index + 1}`} />
              </div>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="lightbox-instructions">
          Click image to zoom • ESC to close • Arrow keys to navigate
        </div>
      </div>
    </div>
  );
};

export default ImageLightbox;





