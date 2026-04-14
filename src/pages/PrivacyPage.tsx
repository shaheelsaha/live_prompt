import { Shield } from 'lucide-react';

const PrivacyPage = () => {
    return (
        <section className="page-section">
            <div className="container">
                <div className="text-center" style={{ marginBottom: 64 }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>
                        Privacy <span className="text-gradient">Policy</span>
                    </h1>
                    <p className="text-muted" style={{ fontSize: '1.15rem', maxWidth: 600, margin: '0 auto' }}>
                        Your privacy matters to us. This policy explains what data we collect, how we use it, and your rights.
                    </p>
                    <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 12 }}>
                        Last updated: April 15, 2026
                    </p>
                </div>

                <div className="legal-content">
                    <div className="legal-section">
                        <div className="legal-icon"><Shield size={20} /></div>
                        <h2>1. Information We Collect</h2>
                        <p>When you create an account on LivePrompt, we collect the following information:</p>
                        <ul>
                            <li><strong>Account Information:</strong> Your name, email address, and profile picture (when signing in with Google).</li>
                            <li><strong>Usage Data:</strong> Pages visited, prompts viewed, search queries, and interactions with the platform — collected via anonymized analytics.</li>
                            <li><strong>Payment Information:</strong> When you subscribe to a paid plan, payment details are processed securely by our payment provider (Polar). We do not store your credit card information on our servers.</li>
                            <li><strong>Device Information:</strong> Browser type, operating system, and IP address for security and analytics purposes.</li>
                        </ul>
                    </div>

                    <div className="legal-section">
                        <h2>2. How We Use Your Information</h2>
                        <p>We use the information we collect to:</p>
                        <ul>
                            <li>Provide, maintain, and improve the LivePrompt platform.</li>
                            <li>Authenticate your identity and manage your account.</li>
                            <li>Process payments and manage subscriptions.</li>
                            <li>Curate and personalize prompt recommendations.</li>
                            <li>Analyze usage patterns to improve the user experience.</li>
                            <li>Prevent abuse, fraud, and unauthorized access.</li>
                            <li>Send important account-related communications (e.g., email verification, security alerts).</li>
                        </ul>
                    </div>

                    <div className="legal-section">
                        <h2>3. Third-Party Services</h2>
                        <p>We rely on trusted third-party services to operate the platform:</p>
                        <ul>
                            <li><strong>Google Firebase:</strong> Used for user authentication (email/password and Google sign-in), database storage, and hosting.</li>
                            <li><strong>Polar:</strong> Handles all payment processing and subscription management. Polar&rsquo;s privacy policy governs how your payment data is handled.</li>
                            <li><strong>PostHog:</strong> Used for privacy-friendly product analytics. We use PostHog to understand feature usage and improve the platform. No personally identifiable information is shared beyond what is necessary for analytics.</li>
                        </ul>
                        <p>These services have their own privacy policies and we encourage you to review them.</p>
                    </div>

                    <div className="legal-section">
                        <h2>4. Cookies & Local Storage</h2>
                        <p>LivePrompt uses cookies and browser local storage for the following purposes:</p>
                        <ul>
                            <li><strong>Authentication:</strong> To keep you logged in across sessions.</li>
                            <li><strong>Preferences:</strong> To remember your settings and selected filters.</li>
                            <li><strong>Analytics:</strong> To anonymously track usage patterns and improve performance.</li>
                        </ul>
                        <p>You may disable cookies in your browser settings, but this may affect the functionality of the platform.</p>
                    </div>

                    <div className="legal-section">
                        <h2>5. Data Retention</h2>
                        <p>We retain your account data for as long as your account is active. If you choose to delete your account, we will remove your personal information within 30 days, except where we are required by law to retain it.</p>
                        <p>Anonymized analytics data may be retained indefinitely as it cannot be linked back to you.</p>
                    </div>

                    <div className="legal-section">
                        <h2>6. Data Security</h2>
                        <p>We take reasonable measures to protect your information, including:</p>
                        <ul>
                            <li>Encrypted data transmission via HTTPS/TLS.</li>
                            <li>Secure authentication through Firebase Auth.</li>
                            <li>Regular security reviews and access controls.</li>
                        </ul>
                        <p>However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.</p>
                    </div>

                    <div className="legal-section">
                        <h2>7. Your Rights</h2>
                        <p>Depending on your location, you may have the following rights:</p>
                        <ul>
                            <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                            <li><strong>Correction:</strong> Request correction of inaccurate data.</li>
                            <li><strong>Deletion:</strong> Request deletion of your personal data and account.</li>
                            <li><strong>Portability:</strong> Request transfer of your data to another service.</li>
                            <li><strong>Opt-out:</strong> Opt out of analytics tracking at any time.</li>
                        </ul>
                        <p>To exercise any of these rights, please contact us at the email below.</p>
                    </div>

                    <div className="legal-section">
                        <h2>8. Children&rsquo;s Privacy</h2>
                        <p>LivePrompt is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children. If we become aware that a child under 13 has provided us with personal data, we will take steps to delete it promptly.</p>
                    </div>

                    <div className="legal-section">
                        <h2>9. Changes to This Policy</h2>
                        <p>We may update this Privacy Policy from time to time. When we do, we will revise the &ldquo;Last updated&rdquo; date at the top of this page. We encourage you to review this policy periodically to stay informed about how we protect your data.</p>
                    </div>

                    <div className="legal-section">
                        <h2>10. Contact Us</h2>
                        <p>If you have any questions or concerns about this Privacy Policy, or wish to exercise your data rights, please contact us:</p>
                        <p style={{ marginTop: 8 }}>
                            <strong>Email:</strong>{' '}
                            <a href="mailto:support@liveprompt.co" className="text-gradient" style={{ textDecoration: 'none' }}>
                                support@liveprompt.co
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PrivacyPage;
