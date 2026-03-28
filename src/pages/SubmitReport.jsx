import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import { useToast } from '../components/Toast';
import { api } from '../services/api';
import './SubmitReport.css';

const SubmitReport = () => {
  const location = useLocation();
  const { entityType, entityId } = location.state || {};
  const [reportType, setReportType] = useState(entityType || 'problem');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const reportTypes = [
    { value: 'problem', label: 'Report a Problem' },
    { value: 'user', label: 'Report User' },
    { value: 'post', label: 'Report Post' },
    { value: 'appeal', label: 'Appeal Moderation Decision' },
  ];

  const categories = {
    problem: [
      'App not working',
      'Feature not working',
      'Slow performance',
      'Login issues',
      'Other technical issue',
    ],
    user: [
      'Harassment or bullying',
      'Spam or fake account',
      'Inappropriate content',
      'Impersonation',
      'Self-harm or dangerous behavior',
      'Other',
    ],
    post: [
      'Spam or misleading',
      'Hate speech or discrimination',
      'Violence or dangerous content',
      'Nudity or sexual content',
      'Intellectual property violation',
      'Other',
    ],
    appeal: [
      'Post was removed incorrectly',
      'Account was suspended incorrectly',
      'Content warning was incorrect',
      'Other',
    ],
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!category) {
      toast.error('Please select a category');
      return;
    }

    if (!description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    setLoading(true);

    try {
      // Map reportType to targetType for API
      const targetType = reportType === 'problem' ? 'app' : reportType;
      const targetId = entityId || 'general';

      await api.reportContent(targetType, targetId, category, description.trim());
      toast.success('Report submitted successfully! We will review it shortly.');
      navigate('/settings');
    } catch (error) {
      toast.error(error.message || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="submit-report-container">
      <div className="submit-report-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h2>Submit Report</h2>
        <div></div>
      </div>

      <div className="submit-report-content">
        <form onSubmit={handleSubmit}>
          {/* Report Type */}
          <div className="form-group">
            <label>Report Type</label>
            <div className="report-type-buttons">
              {reportTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`report-type-btn ${reportType === type.value ? 'active' : ''}`}
                  onClick={() => {
                    setReportType(type.value);
                    setCategory('');
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="form-group">
            <label htmlFor="report-category">Category</label>
            <select
              id="report-category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="category-select"
              required
            >
              <option value="">Select a category</option>
              {categories[reportType].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="report-description">Description</label>
            <textarea
              id="report-description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about your report..."
              rows={6}
              className="description-textarea"
              required
            />
            <div className="char-count">
              {description.length} / 1000
            </div>
          </div>

          {/* Info Box */}
          <div className="info-box">
            <p>
              <strong>Note:</strong> False reports or abuse of this system may result in 
              action against your account. Please provide accurate information.
            </p>
          </div>

          {/* Submit Button */}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubmitReport;





