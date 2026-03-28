import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import './LegalPages.css';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page-container">
      <div className="legal-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h1>Privacy Policy</h1>
      </div>

      <div className="legal-content">
        <p className="effective-date">
          <strong>Effective Date:</strong> 1st of December, 2025<br />
          <strong>Last Updated:</strong> 1st of December, 2025
        </p>

        <section>
          <h2>1. Purpose and Regulatory Alignment</h2>
          <p>
            This Privacy Policy (&quot;Policy&quot;) explains how Xora Social (&quot;Platform,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), operated by
            Xora Social (&quot;Company&quot;), collects, uses, stores, shares, and protects personal
            information. This Policy is intended to comply with:
          </p>
          <ul>
            <li>General Data Protection Regulation (GDPR) / UK GDPR</li>
            <li>California Consumer Privacy Act (CCPA) / California Privacy Rights Act (CPRA)</li>
            <li>Lei Geral de Proteção de Dados (LGPD – Brazil)</li>
            <li>Personal Information Protection and Electronic Documents Act (PIPEDA – Canada)</li>
            <li>Other applicable data protection and privacy laws globally</li>
          </ul>
          <p>
            By using the Platform, you consent to the data practices described in this Policy. If you do not agree, you
            must not access or use the Platform.
          </p>
        </section>

        <section>
          <h2>2. Categories of Data We Collect</h2>
          <h3>2.1 Account and Profile Data</h3>
          <ul>
            <li>Username</li>
            <li>Email address</li>
            <li>Display name</li>
            <li>Profile picture and bio</li>
            <li>Optional contact information (if provided by user)</li>
          </ul>

          <h3>2.2 Content Data</h3>
          <ul>
            <li>Posts, comments, and replies</li>
            <li>Messages and conversations</li>
            <li>Images, videos, and other uploaded media</li>
            <li>Stories and reels</li>
            <li>Pages created and managed</li>
          </ul>

          <h3>2.3 Interaction Data</h3>
          <ul>
            <li>Likes, shares, bookmarks, and follows</li>
            <li>Search queries</li>
            <li>User-to-user interactions (e.g., tags, mentions)</li>
          </ul>

          <h3>2.4 Log and Technical Data</h3>
          <ul>
            <li>IP address</li>
            <li>Device information (operating system, browser type, device ID)</li>
            <li>Timestamps of activity</li>
            <li>Session tokens and cookies</li>
            <li>Abuse and security signals (e.g., failed login attempts, reported content)</li>
          </ul>

          <h3>2.5 Push Notification Tokens</h3>
          <ul>
            <li>Expo push tokens (for mobile notifications)</li>
            <li>VAPID tokens (for web push notifications)</li>
          </ul>

          <h3>2.6 Data We Do NOT Collect</h3>
          <p>We do not currently collect:</p>
          <ul>
            <li>Precise geolocation data</li>
            <li>Behavioral analytics or advertising identifiers</li>
            <li>Sensitive personal data (government IDs, biometric data, health data) unless voluntarily shared by users in content</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Collect Data</h2>
          <ul>
            <li><strong>Directly from You:</strong> When you register, post content, or interact with features</li>
            <li><strong>Automatically:</strong> Through cookies, logs, and device telemetry when you use the Platform</li>
            <li><strong>From Other Users:</strong> When users tag, mention, or interact with your content</li>
          </ul>
        </section>

        <section>
          <h2>4. Purposes of Processing</h2>
          <p>We use your data for the following purposes:</p>
          <ul>
            <li><strong>Service Provision:</strong> To operate the Platform, authenticate users, and deliver features (messaging, feeds, stories, etc.)</li>
            <li><strong>Security and Fraud Prevention:</strong> To detect abuse, enforce Terms of Use, prevent spam, and protect user safety</li>
            <li><strong>Legal Compliance:</strong> To comply with applicable laws, respond to lawful government requests, and enforce our rights</li>
            <li><strong>Communications:</strong> To send notifications, updates, and support messages (subject to user preferences)</li>
            <li><strong>Platform Integrity:</strong> To monitor and improve content quality, combat misinformation, and maintain community standards</li>
            <li><strong>Advertising:</strong> To display ads (currently without behavioral targeting or profiling)</li>
          </ul>
        </section>

        <section>
          <h2>5. Legal Bases for Processing (GDPR)</h2>
          <p>For users in the EU/UK, we process personal data based on the following lawful bases:</p>
          <ul>
            <li><strong>Contractual Necessity:</strong> To perform the contract (Terms of Use) between you and us</li>
            <li><strong>Legitimate Interest:</strong> For security, fraud prevention, and Platform improvement (balanced against user rights)</li>
            <li><strong>Legal Obligation:</strong> To comply with laws and regulatory requirements</li>
            <li><strong>Consent:</strong> Where you have explicitly consented (e.g., push notifications, marketing communications)</li>
          </ul>
        </section>

        <section>
          <h2>6. Advertising and Profiling Disclosure</h2>
          <p>
            <strong>Current Practice:</strong> Advertisements may be displayed on the Platform, but we do not currently engage
            in behavioral profiling or targeted advertising based on user behavior.
          </p>
          <p>
            <strong>Future Changes:</strong> If we implement behavioral advertising or profiling, we will update this Policy and
            provide opt-out mechanisms as required by law (e.g., GDPR Article 21 objection right, CCPA opt-out).
          </p>
        </section>

        <section>
          <h2>7. Data Sharing and Disclosure</h2>
          <h3>7.1 We Do NOT Sell Personal Data</h3>
          <p>We do not sell personal data to third parties for monetary or other valuable consideration.</p>

          <h3>7.2 Sharing with Service Providers</h3>
          <p>We may share data with trusted service providers who assist us in operating the Platform, including:</p>
          <ul>
            <li><strong>Infrastructure Providers:</strong> Cloudflare (hosting, databases, CDN, security)</li>
            <li><strong>Storage Providers:</strong> Cloudflare R2 (media and data storage)</li>
            <li><strong>Push Notification Services:</strong> Expo (mobile push notifications)</li>
          </ul>
          <p>These providers are contractually bound to use data only for specified purposes and to protect it.</p>

          <h3>7.3 Legal and Safety Disclosures</h3>
          <p>We may disclose data when required or permitted by law, including:</p>
          <ul>
            <li>In response to subpoenas, court orders, or lawful government requests</li>
            <li>To prevent imminent harm, fraud, or violations of law</li>
            <li>To enforce our Terms of Use and protect our rights</li>
            <li>In connection with investigations of abuse or illegal activity</li>
          </ul>

          <h3>7.4 Corporate Transactions</h3>
          <p>
            In the event of a merger, acquisition, or sale of assets, user data may be transferred to a successor entity.
            You will be notified via email or prominent notice on the Platform.
          </p>

          <h3>7.5 Public Content</h3>
          <p>
            Content you post publicly (including posts, comments, pages, stories, and reels) may be viewed by anyone,
            including non-users and search engines. We have no control over how third parties use publicly available information.
          </p>
        </section>

        <section>
          <h2>8. International Data Transfers</h2>
          <p>
            The Platform is operated from the United States, and data may be processed in the U.S. and other jurisdictions
            where our service providers operate. These jurisdictions may not provide the same level of data protection as
            your home country.
          </p>
          <p>
            For data transfers from the EU/UK to non-adequate countries, we rely on appropriate safeguards such as Standard
            Contractual Clauses (SCCs) approved by the European Commission or UK authorities.
          </p>
        </section>

        <section>
          <h2>9. Data Retention</h2>
          <p>
            We retain personal data only as long as reasonably necessary to fulfill the purposes described in this Policy,
            comply with legal obligations, resolve disputes, and enforce our agreements.
          </p>
          <p><strong>Retention Periods:</strong></p>
          <ul>
            <li><strong>Active Accounts:</strong> Data is retained as long as your account is active and operational</li>
            <li><strong>Deleted Accounts:</strong> Upon account deletion, most data is deleted within 90 days. Some data may be retained longer for legal compliance, fraud prevention, or security purposes (e.g., IP logs, moderation records)</li>
            <li><strong>Archived Data:</strong> Data older than 18 months may be archived to long-term storage and deleted after legal retention periods expire</li>
            <li><strong>Backups:</strong> Data may persist in encrypted backups for up to 30 days after deletion</li>
          </ul>
          <p>
            <strong>Note:</strong> If your account is suspended for violations, we may retain data longer to prevent ban evasion
            and protect Platform integrity.
          </p>
        </section>

        <section>
          <h2>10. User Rights</h2>
          <p>Depending on your jurisdiction, you may have the following rights:</p>

          <h3>10.1 GDPR / UK GDPR Rights (EU/UK Users)</h3>
          <ul>
            <li><strong>Right of Access:</strong> Request a copy of your personal data</li>
            <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
            <li><strong>Right to Erasure (&quot;Right to be Forgotten&quot;):</strong> Request deletion of your data (subject to legal exceptions)</li>
            <li><strong>Right to Restriction of Processing:</strong> Limit how we use your data in certain circumstances</li>
            <li><strong>Right to Data Portability:</strong> Receive your data in a machine-readable format</li>
            <li><strong>Right to Object:</strong> Object to processing based on legitimate interest (including for direct marketing)</li>
            <li><strong>Right to Withdraw Consent:</strong> Where processing is based on consent</li>
            <li><strong>Right to Lodge a Complaint:</strong> File a complaint with a supervisory authority (e.g., ICO in the UK)</li>
          </ul>

          <h3>10.2 CCPA / CPRA Rights (California Users)</h3>
          <ul>
            <li><strong>Right to Know:</strong> Request disclosure of categories and specific pieces of personal data collected, sold, or shared</li>
            <li><strong>Right to Delete:</strong> Request deletion of personal data (subject to exceptions)</li>
            <li><strong>Right to Opt-Out:</strong> Opt out of the &quot;sale&quot; or &quot;sharing&quot; of personal data (Note: We do not currently sell or share data for cross-context behavioral advertising)</li>
            <li><strong>Right to Correct:</strong> Correct inaccurate personal data</li>
            <li><strong>Right to Limit Use of Sensitive Personal Information:</strong> Limit use of sensitive data (if applicable)</li>
            <li><strong>Right to Non-Discrimination:</strong> You will not be discriminated against for exercising your rights</li>
          </ul>

          <h3>10.3 Other Jurisdictions</h3>
          <p>
            Users in other jurisdictions (e.g., Brazil, Canada, Australia) may have similar rights under local laws.
            Contact us to exercise your rights.
          </p>

          <h3>10.4 How to Exercise Your Rights</h3>
          <p>
            To exercise any of the above rights, please contact us at:
          </p>
          <p><a href="mailto:privacy@xorasocial.com">privacy@xorasocial.com</a></p>
          <p>
            We may require verification of your identity before processing requests. Verification may involve confirming
            account ownership or providing additional information.
          </p>
        </section>

        <section>
          <h2>11. Children&apos;s Privacy (COPPA Compliance)</h2>
          <p>
            The Platform is not intended for children under 13 years of age (or the minimum age in your jurisdiction).
            We do not knowingly collect personal data from children under 13.
          </p>
          <p>
            If we become aware that we have collected data from a child under 13 without parental consent, we will take
            steps to delete such data promptly.
          </p>
          <p>
            Parents or guardians who believe their child has provided personal data may contact us at
            <a href="mailto:support@xorasocial.com"> support@xorasocial.com</a> to request deletion.
          </p>
        </section>

        <section>
          <h2>12. Security Measures</h2>
          <p>
            We implement technical and organizational measures designed to protect personal data against unauthorized
            access, loss, misuse, alteration, or destruction, including:
          </p>
          <ul>
            <li>Encryption of data in transit (HTTPS/TLS)</li>
            <li>Encryption of data at rest (database encryption)</li>
            <li>Access controls and authentication mechanisms</li>
            <li>Regular security audits and monitoring</li>
            <li>Secure coding practices and vulnerability management</li>
          </ul>
          <p>
            <strong>No system is 100% secure.</strong> We cannot guarantee absolute security. You are responsible for
            protecting your login credentials and notifying us of any suspected unauthorized access.
          </p>
        </section>

        <section>
          <h2>13. Cookies and Tracking Technologies</h2>
          <h3>13.1 Types of Cookies We Use</h3>
          <ul>
            <li><strong>Essential Cookies:</strong> Required for authentication and platform operation</li>
            <li><strong>Functional Cookies:</strong> Remember your preferences (e.g., theme, language)</li>
            <li><strong>Analytics Cookies:</strong> Help us understand usage patterns (currently limited)</li>
          </ul>

          <h3>13.2 Third-Party Cookies</h3>
          <p>
            We may use third-party services (e.g., Cloudflare, analytics providers) that set cookies for security,
            performance, or analytics purposes. These third parties have their own privacy policies.
          </p>

          <h3>13.3 Managing Cookies</h3>
          <p>
            You can control cookies through your browser settings. Note that disabling essential cookies may affect
            platform functionality (e.g., you may not be able to log in).
          </p>
        </section>

        <section>
          <h2>14. Do Not Track (DNT) Signals</h2>
          <p>
            We do not currently respond to &quot;Do Not Track&quot; (DNT) browser signals because there is no industry-wide standard
            for how to interpret them. If a DNT standard is established, we will reassess our approach.
          </p>
        </section>

        <section>
          <h2>15. Automated Decision-Making and Profiling</h2>
          <p>
            We may use automated systems to moderate content, detect spam, and enforce community standards (e.g., automated
            flagging of prohibited content). These systems do not involve profiling that produces legal or similarly significant
            effects concerning you.
          </p>
          <p>
            If we implement profiling or automated decision-making with significant effects, we will provide transparency
            and opt-out options as required by law (e.g., GDPR Article 22).
          </p>
        </section>

        <section>
          <h2>16. Sensitive Personal Data</h2>
          <p>
            We do not intentionally collect sensitive personal data (such as government IDs, precise geolocation,
            biometric data, or health data).
          </p>
          <p>
            <strong>User Responsibility:</strong> Users are strongly discouraged from voluntarily sharing sensitive data
            through public content or messages. We are not responsible for sensitive data users choose to disclose publicly.
          </p>
        </section>

        <section>
          <h2>17. User-Generated Content and Public Visibility</h2>
          <p>
            Content you post publicly (posts, comments, pages, stories, reels) may be visible to anyone, including
            non-users, search engines, and third-party platforms.
          </p>
          <p>
            <strong>We are not responsible for how third parties use publicly available information.</strong> Once content
            is shared publicly, it may be copied, reposted, or archived by third parties beyond our control.
          </p>
          <p>
            Consider using privacy settings (e.g., private accounts, direct messages) for sensitive communications.
          </p>
        </section>

        <section>
          <h2>18. Data Breach Notification</h2>
          <p>
            In the event of a data breach that poses a risk to your rights and freedoms, we will notify affected users
            and relevant authorities as required by law (e.g., within 72 hours under GDPR).
          </p>
          <p>
            Notifications will be sent via email and/or in-app message and will include information about the nature of
            the breach, its likely consequences, and measures taken to address it.
          </p>
        </section>

        <section>
          <h2>19. Third-Party Links and Services</h2>
          <p>
            The Platform may contain links to third-party websites, services, or content (e.g., YouTube, external news sites).
            We are not responsible for the privacy practices of third parties. Please review their privacy policies before
            providing personal data to them.
          </p>
        </section>

        <section>
          <h2>20. Changes to This Privacy Policy</h2>
          <p>
            We may update this Policy from time to time to reflect changes in our practices, legal requirements, or
            platform features. Changes will be posted on this page with an updated &quot;Last Updated&quot; date.
          </p>
          <p>
            <strong>Material changes</strong> will be communicated via email or prominent in-app notification. Continued
            use of the Platform after changes constitutes acceptance of the updated Policy.
          </p>
          <p>
            We encourage you to review this Policy periodically.
          </p>
        </section>

        <section>
          <h2>21. Data Controller Information</h2>
          <p>
            For the purposes of GDPR and other data protection laws, the data controller is:
          </p>
          <p>
            <strong>Automatons mobility and software services</strong><br />
            Email: <a href="mailto:legal@xorasocial.com">legal@xorasocial.com</a>
          </p>
        </section>

        <section>
          <h2>22. Data Protection Officer (DPO)</h2>
          <p>
            If required by law, we will appoint a Data Protection Officer. Currently, privacy inquiries should be directed to:
          </p>
          <p><a href="mailto:privacy@xorasocial.com">privacy@xorasocial.com</a></p>
        </section>

        <section>
          <h2>23. Complaint and Enforcement</h2>
          <h3>23.1 EU/UK Users</h3>
          <p>
            If you are not satisfied with how we handle your personal data, you have the right to lodge a complaint with
            your local supervisory authority (e.g., ICO in the UK, CNIL in France).
          </p>

          <h3>23.2 California Users</h3>
          <p>
            California residents may file complaints with the California Attorney General&apos;s Office:
            <a href="https://oag.ca.gov/contact/consumer-complaint-against-business-or-company" target="_blank" rel="noopener noreferrer"> https://oag.ca.gov/contact</a>
          </p>

          <h3>23.3 Other Jurisdictions</h3>
          <p>
            Users in other jurisdictions may contact their local data protection authorities or consumer protection agencies.
          </p>
        </section>

        <section>
          <h2>24. Your Consent</h2>
          <p>
            By using the Platform, you consent to the collection, use, and sharing of your personal data as described in
            this Policy. You may withdraw consent at any time by deleting your account or contacting us at
            <a href="mailto:privacy@xorasocial.com"> privacy@xorasocial.com</a>.
          </p>
          <p>
            Note that withdrawal of consent may result in inability to use certain features or complete account deletion.
          </p>
        </section>

        <section>
          <h2>25. Legal Basis Summary Table (GDPR)</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Purpose</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Legal Basis</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>Service Provision</td>
                <td style={{ padding: '8px' }}>Contractual Necessity</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>Security & Fraud Prevention</td>
                <td style={{ padding: '8px' }}>Legitimate Interest</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>Legal Compliance</td>
                <td style={{ padding: '8px' }}>Legal Obligation</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>Push Notifications</td>
                <td style={{ padding: '8px' }}>Consent</td>
              </tr>
              <tr>
                <td style={{ padding: '8px' }}>Marketing Communications</td>
                <td style={{ padding: '8px' }}>Consent</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>26. Contact for Privacy Matters</h2>
          <p>
            For questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> <a href="mailto:privacy@xorasocial.com">privacy@xorasocial.com</a><br />
            <strong>Legal Inquiries:</strong> <a href="mailto:legal@xorasocial.com">legal@xorasocial.com</a>
          </p>
          <p>
            We will respond to your inquiry within a reasonable timeframe (typically within 30 days, or as required by
            applicable law).
          </p>
        </section>

        <section>
          <h2>27. Acknowledgment</h2>
          <p>
            BY USING THE PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS PRIVACY POLICY AND AGREE TO ITS TERMS.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;





