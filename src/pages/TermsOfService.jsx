import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack } from 'react-icons/io5';
import './LegalPages.css';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="legal-page-container">
      <div className="legal-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </button>
        <h1>Terms of Use</h1>
      </div>

      <div className="legal-content">
        <p className="effective-date">
          <strong>Effective Date:</strong> 1st of December, 2025<br />
          <strong>Last Updated:</strong> 1st of December, 2025
        </p>

        <section>
          <h2>1. Introduction and Binding Agreement</h2>
          <p>
            Welcome to Xora Social (&quot;Platform&quot;), a social networking platform operated by Xora Social
            (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). These Terms of Use (&quot;Terms&quot;) constitute a legally binding agreement
            between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and the Company governing your access to and use of the Platform.
          </p>
          <p>
            By creating an account, accessing, browsing, or otherwise using the Platform, you acknowledge that you have
            read, understood, and agreed to be bound by these Terms, our Privacy Policy, and any supplemental policies
            incorporated by reference.
          </p>
          <p><strong>If you do not agree, you must not access or use the Platform.</strong></p>
        </section>

        <section>
          <h2>2. Scope of Services</h2>
          <p>The Platform provides a digital environment enabling users to:</p>
          <ul>
            <li>Create personal profiles</li>
            <li>Publish text, image, and video content</li>
            <li>Interact through comments, likes, and follows</li>
            <li>Exchange private messages</li>
            <li>Publish temporary content (stories)</li>
            <li>Publish video content (reels)</li>
            <li>Create and manage pages</li>
            <li>Discover content and users through search and recommendations</li>
            <li>Receive system notifications</li>
          </ul>
          <p>We reserve the right to modify, suspend, or discontinue any part of the Platform at any time without prior notice or liability.</p>
        </section>

        <section>
          <h2>3. Eligibility, Age, and Legal Capacity</h2>
          <h3>3.1 Minimum Age</h3>
          <p>You must be at least 13 years old, or the minimum age required by your jurisdiction, whichever is higher, to use the Platform.</p>

          <h3>3.2 Minors (Under 18)</h3>
          <p>If you are under 18 years of age:</p>
          <ul>
            <li>You confirm that your use of the Platform is lawful in your jurisdiction</li>
            <li>You represent that you have obtained any required parental or guardian consent</li>
          </ul>

          <h3>3.3 Prohibited Users</h3>
          <p>You may not use the Platform if:</p>
          <ul>
            <li>You are legally prohibited from receiving services under applicable law</li>
            <li>You have been permanently suspended from the Platform for prior violations</li>
            <li>Your use would violate export control or sanctions laws</li>
          </ul>
        </section>

        <section>
          <h2>4. Account Registration and Integrity</h2>
          <h3>4.1 Accuracy and Truthfulness</h3>
          <p>You agree to provide accurate, current, and complete information during registration and to promptly update such information to keep it accurate and current.</p>

          <h3>4.2 One Account Rule</h3>
          <p>Unless expressly authorized in writing by the Company, users may not create or operate multiple accounts for deceptive, abusive, or ban-evasion purposes.</p>

          <h3>4.3 Account Security</h3>
          <p>You are solely responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your login credentials</li>
            <li>All actions occurring under your account, whether authorized by you or not</li>
          </ul>
          <p>
            Notify us immediately of any suspected unauthorized use. We disclaim liability for loss or damage arising
            from unauthorized access resulting from user negligence.
          </p>
        </section>

        <section>
          <h2>5. Content Visibility and Privacy Controls</h2>
          <p>By default, content posted to the Platform is publicly accessible.</p>
          <ul>
            <li>Users may enable account-level privacy controls to restrict visibility (e.g., private account settings)</li>
            <li>Private messages are intended to be visible only to designated participants</li>
          </ul>
          <p>
            <strong>We do not guarantee absolute confidentiality of any content.</strong> Users should exercise discretion
            when posting sensitive or private information.
          </p>
        </section>

        <section>
          <h2>6. User Content: Ownership and License</h2>
          <h3>6.1 Ownership</h3>
          <p>You retain all ownership rights in content you create and upload to the Platform (&quot;User Content&quot;).</p>

          <h3>6.2 License Grant to the Company</h3>
          <p>
            By submitting User Content, you grant the Company a worldwide, perpetual (for operational needs),
            royalty-free, sublicensable, transferable license to:
          </p>
          <ul>
            <li>Host</li>
            <li>Store</li>
            <li>Reproduce</li>
            <li>Display</li>
            <li>Adapt</li>
            <li>Distribute</li>
            <li>Create derivative works from</li>
          </ul>
          <p>
            User Content solely for the purpose of operating, improving, promoting, and securing the Platform.
          </p>

          <h3>6.3 Survival of License</h3>
          <p>
            This license survives account termination where necessary for legal compliance, dispute resolution,
            or enforcement of these Terms.
          </p>
        </section>

        <section>
          <h2>7. Content Standards and Prohibited Conduct</h2>
          <p>Users may not post, upload, transmit, or engage in content or behavior that:</p>
          <ul>
            <li>Violates any applicable law or regulation (including intellectual property, privacy, or defamation laws)</li>
            <li>Infringes on the intellectual property rights of others</li>
            <li>Contains hate speech, incites violence, or promotes discrimination based on race, ethnicity, religion, gender, sexual orientation, or disability</li>
            <li>Harasses, threatens, bullies, or intimidates any individual or group</li>
            <li>Exploits, sexualizes, or harms minors</li>
            <li>Promotes or glorifies violence, terrorism, or extremism</li>
            <li>Contains malware, viruses, scripts, or exploits designed to harm or compromise systems</li>
            <li>Engages in spam, phishing, fraud, or impersonation</li>
            <li>Attempts to circumvent platform safeguards, access restrictions, or moderation systems</li>
            <li>Engages in any unlawful, fraudulent, or deceptive conduct</li>
          </ul>
        </section>

        <section>
          <h2>8. Moderation, Enforcement, and Platform Status</h2>
          <h3>8.1 Intermediary Status</h3>
          <p>
            The Platform functions as an interactive computer service under 47 U.S.C. § 230 and similar laws globally.
            We are not the publisher or speaker of User Content.
          </p>

          <h3>8.2 Moderation Discretion</h3>
          <p>We reserve the right, but assume no obligation, to:</p>
          <ul>
            <li>Remove or restrict access to content</li>
            <li>Limit content visibility or distribution</li>
            <li>Suspend or terminate user accounts with or without notice</li>
            <li>Take any action we deem necessary to comply with law, protect the Platform, or preserve user safety</li>
          </ul>
          <p>
            Moderation decisions are discretionary and may be automated or manual. Users have no entitlement to
            prior notice, hearing, or appeal, though we may provide such processes at our discretion.
          </p>
        </section>

        <section>
          <h2>9. Intellectual Property and Copyright Policy</h2>
          <h3>9.1 Proprietary Rights</h3>
          <p>
            All Platform software, design, trademarks, and proprietary content (excluding User Content) are owned by
            the Company or our licensors and are protected by intellectual property law.
          </p>

          <h3>9.2 DMCA Compliance (U.S.)</h3>
          <p>
            We comply with the Digital Millennium Copyright Act. Copyright holders may submit takedown notices to:
          </p>
          <p><a href="mailto:copyright@xorasocial.com">copyright@xorasocial.com</a></p>
          <p>Notices must comply with 17 U.S.C. § 512(c)(3). Repeat infringers will be terminated.</p>

          <h3>9.3 Global Copyright Policy</h3>
          <p>
            Even outside the U.S., we honor intellectual property rights and will respond to valid complaints
            in accordance with applicable law.
          </p>
        </section>

        <section>
          <h2>10. Termination and Suspension</h2>
          <h3>10.1 By the Company</h3>
          <p>We may suspend or terminate your account at any time for:</p>
          <ul>
            <li>Violation of these Terms</li>
            <li>Unlawful conduct</li>
            <li>Legal or regulatory requirement</li>
            <li>Risk to Platform security or integrity</li>
            <li>Any other reason in our sole discretion</li>
          </ul>

          <h3>10.2 By the User</h3>
          <p>
            You may terminate your account at any time through account settings. Upon termination, your data may be
            deleted subject to legal retention requirements.
          </p>

          <h3>10.3 Effect of Termination</h3>
          <p>
            Upon termination, your right to access the Platform ceases immediately. Sections of these Terms that
            naturally survive (including intellectual property, liability disclaimers, and dispute resolution) remain in effect.
          </p>
        </section>

        <section>
          <h2>11. Third-Party Links and Services</h2>
          <p>
            The Platform may contain links to third-party websites, services, or content. We do not endorse, control,
            or assume responsibility for third-party offerings. Your use of third-party services is at your own risk
            and subject to their terms.
          </p>
        </section>

        <section>
          <h2>12. User Disputes</h2>
          <p>
            Users are solely responsible for their interactions with other users. We are not a party to disputes
            between users and assume no liability for such disputes.
          </p>
        </section>

        <section>
          <h2>13. Assumption of Risk</h2>
          <p>
            You acknowledge that using the Platform involves inherent risks, including exposure to offensive or
            harmful content, the possibility of encountering malicious actors, and potential security vulnerabilities.
            You assume all such risks.
          </p>
        </section>

        <section>
          <h2>14. Disclaimers of Warranties</h2>
          <p><strong>THE PLATFORM IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND.</strong></p>
          <p>
            TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT
            LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
          </p>
          <p>We do not warrant that:</p>
          <ul>
            <li>The Platform will be uninterrupted, secure, or error-free</li>
            <li>Content or results will be accurate, reliable, or complete</li>
            <li>Defects will be corrected</li>
          </ul>
          <p>Some jurisdictions do not allow exclusions of implied warranties, so the above may not apply to you.</p>
        </section>

        <section>
          <h2>15. Limitation of Liability</h2>
          <p>TO THE FULLEST EXTENT PERMITTED BY LAW:</p>
          <ul>
            <li>
              THE COMPANY, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND LICENSORS SHALL NOT BE LIABLE
              FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES (INCLUDING LOSS OF PROFITS,
              DATA, GOODWILL, OR REPUTATION) ARISING OUT OF OR RELATED TO YOUR USE OF THE PLATFORM
            </li>
            <li>
              OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING FROM YOUR USE OF THE PLATFORM IS CAPPED AT THE
              GREATER OF:
              <ul>
                <li>USD $100, OR</li>
                <li>THE AMOUNT YOU PAID TO US (IF ANY) IN THE 12 MONTHS PRIOR TO THE EVENT GIVING RISE TO LIABILITY</li>
              </ul>
            </li>
          </ul>
          <p>
            These limitations apply regardless of the legal theory (contract, tort, strict liability, or otherwise)
            and even if we have been advised of the possibility of such damages.
          </p>
          <p>Some jurisdictions do not allow limitation of liability, so the above may not fully apply to you.</p>
        </section>

        <section>
          <h2>16. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless the Company and its affiliates, officers, directors,
            employees, and agents from and against any claims, liabilities, damages, losses, costs, or expenses
            (including reasonable legal fees) arising out of or related to:
          </p>
          <ul>
            <li>Your use of the Platform</li>
            <li>Your User Content</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights (including intellectual property or privacy rights)</li>
          </ul>
          <p>
            We reserve the right to assume exclusive defense and control of any matter subject to indemnification,
            at your expense.
          </p>
        </section>

        <section>
          <h2>17. Advertising and Monetization</h2>
          <p>
            The Platform may display advertising. You agree that we may display ads in connection with User Content
            without compensation to you. We do not endorse advertised products or services and are not responsible
            for their accuracy or quality.
          </p>
        </section>

        <section>
          <h2>18. Changes to These Terms</h2>
          <p>
            We may modify these Terms at any time by posting updated Terms on the Platform. Changes become effective
            upon posting unless otherwise specified. Continued use after changes constitutes acceptance.
          </p>
          <p>
            Material changes may be communicated via email or in-app notification. It is your responsibility to review
            these Terms periodically.
          </p>
        </section>

        <section>
          <h2>19. Severability and Waiver</h2>
          <p>
            If any provision of these Terms is found invalid or unenforceable, the remaining provisions remain in full
            force and effect. Failure to enforce any provision does not constitute a waiver.
          </p>
        </section>

        <section>
          <h2>20. Entire Agreement</h2>
          <p>
            These Terms, together with the Privacy Policy and any supplemental policies, constitute the entire agreement
            between you and the Company and supersede all prior agreements or understandings.
          </p>
        </section>

        <section>
          <h2>21. Assignment</h2>
          <p>
            You may not assign or transfer these Terms or your account without our written consent. We may assign these
            Terms in connection with a merger, acquisition, or sale of assets.
          </p>
        </section>

        <section>
          <h2>22. Force Majeure</h2>
          <p>
            We are not liable for failure to perform obligations due to causes beyond our reasonable control, including
            natural disasters, war, terrorism, labor disputes, or government actions.
          </p>
        </section>

        <section>
          <h2>23. Governing Law and Jurisdiction</h2>
          <h3>23.1 Governing Law</h3>
          <p>
            These Terms are governed by and construed in accordance with the laws of [Insert Jurisdiction], without
            regard to conflict-of-law principles.
          </p>

          <h3>23.2 Jurisdiction and Venue</h3>
          <p>
            Subject to the arbitration provision below, any legal action or proceeding arising from these Terms shall
            be brought exclusively in courts located in [Insert Jurisdiction], and you consent to the personal jurisdiction
            of such courts.
          </p>
        </section>

        <section>
          <h2>24. Dispute Resolution (U.S. Users)</h2>
          <h3>24.1 Mandatory Arbitration</h3>
          <p>
            Any dispute arising out of or related to these Terms or the Platform shall be resolved through binding
            arbitration in accordance with the rules of [Arbitration Provider], rather than in court.
          </p>

          <h3>24.2 Class Action Waiver</h3>
          <p>
            YOU AGREE THAT DISPUTES WILL BE ARBITRATED ONLY ON AN INDIVIDUAL BASIS AND NOT AS A CLASS ACTION,
            CONSOLIDATED ACTION, OR REPRESENTATIVE ACTION.
          </p>

          <h3>24.3 Exceptions</h3>
          <p>Either party may seek injunctive or equitable relief in court to protect intellectual property rights.</p>

          <h3>24.4 Opt-Out (First 30 Days Only)</h3>
          <p>
            You may opt out of arbitration by sending written notice to <a href="mailto:legal@xorasocial.com">legal@xorasocial.com</a>
            within 30 days of account creation.
          </p>
        </section>

        <section>
          <h2>25. International Users</h2>
          <p>
            The Platform is operated from [Insert Country]. If you access the Platform from outside [Insert Country],
            you are responsible for compliance with local laws. By using the Platform, you consent to the transfer of
            your data to [Insert Country] and other jurisdictions where we or our service providers operate.
          </p>
        </section>

        <section>
          <h2>26. Electronic Communications</h2>
          <p>
            By using the Platform, you consent to receive electronic communications from us (including via email or
            in-app messages). These communications may include notices about your account, promotional messages, and
            other information. You agree that electronic communications satisfy any legal requirement for written notice.
          </p>
        </section>

        <section>
          <h2>27. Age Verification and Parental Consent</h2>
          <p>
            We may implement age verification measures at our discretion. Parents or guardians may request removal of
            a minor&apos;s account by contacting <a href="mailto:support@xorasocial.com">support@xorasocial.com</a>.
          </p>
        </section>

        <section>
          <h2>28. Data Retention and Deletion</h2>
          <p>
            We retain data in accordance with our Privacy Policy. Upon account deletion, some data may be retained for
            legal, security, or operational purposes as described in the Privacy Policy.
          </p>
        </section>

        <section>
          <h2>29. Accessibility</h2>
          <p>
            We strive to make the Platform accessible to users with disabilities. If you encounter accessibility barriers,
            please contact <a href="mailto:support@xorasocial.com">support@xorasocial.com</a>.
          </p>
        </section>

        <section>
          <h2>30. Contact for Legal Notices</h2>
          <p>Legal notices, including copyright complaints, subpoenas, and formal complaints, must be sent to:</p>
          <p><a href="mailto:legal@xorasocial.com">legal@xorasocial.com</a></p>
        </section>

        <section>
          <h2>31. Acknowledgment and Acceptance</h2>
          <p>
            BY CLICKING &quot;ACCEPT,&quot; CREATING AN ACCOUNT, OR USING THE PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ AND
            UNDERSTOOD THESE TERMS AND AGREE TO BE BOUND BY THEM.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;





