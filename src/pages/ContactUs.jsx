import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoMailOutline } from 'react-icons/io5';
import './LegalPages.css';

const ContactUs = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page-container">
      <div className="legal-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h1>Contact Us</h1>
      </div>

      <div className="legal-content">
        <section>
          <h2>Get in Touch</h2>
          <p>
            We&apos;re here to help! Whether you have questions, need support, or want to report an issue,
            reach out to us through the appropriate channel below.
          </p>
        </section>

        <section className="contact-section">
          <div className="contact-card">
            <div className="contact-icon">
              <IoMailOutline />
            </div>
            <h3>General Support</h3>
            <p>For general inquiries, account help, and technical support</p>
            <a href="mailto:support@xorasocial.com" className="contact-link">
              support@xorasocial.com
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-icon">
              <IoMailOutline />
            </div>
            <h3>Report Issues</h3>
            <p>Report abuse, harassment, copyright violations, and content complaints</p>
            <a href="mailto:report@xorasocial.com" className="contact-link">
              report@xorasocial.com
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-icon">
              <IoMailOutline />
            </div>
            <h3>Advertising & Partnerships</h3>
            <p>For advertising inquiries, business partnerships, and brand collaborations</p>
            <a href="mailto:advertise@xorasocial.com" className="contact-link">
              advertise@xorasocial.com
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-icon">
              <IoMailOutline />
            </div>
            <h3>Privacy Matters</h3>
            <p>For data privacy questions, GDPR requests, and data protection concerns</p>
            <a href="mailto:privacy@xorasocial.com" className="contact-link">
              privacy@xorasocial.com
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-icon">
              <IoMailOutline />
            </div>
            <h3>Legal Notices</h3>
            <p>For legal matters, DMCA takedown notices, subpoenas, and official complaints</p>
            <a href="mailto:legal@xorasocial.com" className="contact-link">
              legal@xorasocial.com
            </a>
          </div>

          <div className="contact-card">
            <div className="contact-icon">
              <IoMailOutline />
            </div>
            <h3>Copyright Complaints</h3>
            <p>For DMCA takedown requests and intellectual property infringement reports</p>
            <a href="mailto:copyright@xorasocial.com" className="contact-link">
              copyright@xorasocial.com
            </a>
          </div>
        </section>

        <section>
          <h2>Frequently Asked Questions</h2>
          <p>
            Before reaching out, you might find answers to common questions in our Help & Support section.
            Visit Settings {'>'} Help & Support for quick solutions to common issues including:
          </p>
          <ul>
            <li>Account recovery and password reset</li>
            <li>Privacy settings and account security</li>
            <li>Content posting and moderation guidelines</li>
            <li>Feature tutorials and how-to guides</li>
          </ul>
        </section>

        <section>
          <h2>Response Time</h2>
          <p>
            We aim to respond to all inquiries within <strong>24-48 hours during business days</strong>.
            Complex issues may require additional time for investigation.
          </p>
          <p>
            <strong>For urgent security, safety, or abuse issues,</strong> please use the{' '}
            <a href="mailto:report@xorasocial.com">report@xorasocial.com</a> email for faster assistance.
            Critical safety concerns are prioritized and reviewed immediately.
          </p>
        </section>

        <section>
          <h2>In-App Reporting</h2>
          <p>
            For content-specific issues (posts, comments, messages, profiles), you can also use the
            in-app reporting tools:
          </p>
          <ul>
            <li>Tap the three-dot menu (•••) on any post, comment, or profile</li>
            <li>Select &quot;Report&quot;</li>
            <li>Choose the appropriate reason for reporting</li>
            <li>Provide additional context if needed</li>
          </ul>
          <p>
            In-app reports are reviewed by our moderation team and action is taken in accordance with
            our Terms of Use and Community Guidelines.
          </p>
        </section>

        <section>
          <h2>Social Media</h2>
          <p>
            Follow us for updates, announcements, and community news:
          </p>
          <p>
            <strong>Twitter:</strong> @XoraSocial (coming soon)<br />
            <strong>Instagram:</strong> @XoraSocial (coming soon)<br />
            <strong>Official Page on Xora Social:</strong> @xora
          </p>
        </section>

        <section>
          <h2>Language Support</h2>
          <p>
            Currently, support is available in English. We&apos;re working to expand language support in the future.
            If you need assistance in another language, please let us know in your message and we&apos;ll do our
            best to accommodate.
          </p>
        </section>

        <section>
          <h2>Thank You</h2>
          <p>
            Thank you for being part of the Xora Social community. Your feedback helps us improve the
            platform for everyone. We look forward to hearing from you!
          </p>
        </section>
      </div>
    </div>
  );
};

export default ContactUs;





