import { FileText } from 'lucide-react';

const TermsPage = () => {
    return (
        <section className="page-section">
            <div className="container">
                <div className="text-center" style={{ marginBottom: 64 }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>
                        Terms of <span className="text-gradient">Service</span>
                    </h1>
                    <p className="text-muted" style={{ fontSize: '1.15rem', maxWidth: 600, margin: '0 auto' }}>
                        Please read these terms carefully before using our platform.
                    </p>
                    <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 12 }}>
                        Last updated: April 15, 2026
                    </p>
                </div>

                <div className="legal-content">
                    <div className="legal-section">
                        <div className="legal-icon"><FileText size={20} /></div>
                        <h2>1. Acceptance of Terms</h2>
                        <p>By accessing or using the LivePrompt platform (&ldquo;Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to all of these Terms, do not use the Service.</p>
                        <p>We reserve the right to update or modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>
                    </div>

                    <div className="legal-section">
                        <h2>2. Description of Service</h2>
                        <p>LivePrompt is a curated AI prompt database that provides ready-to-use prompts for various AI tools including Midjourney, Stable Diffusion, ChatGPT, Sora, Grok, Runway, and others. The Service includes both free and premium (paid) content.</p>
                    </div>

                    <div className="legal-section">
                        <h2>3. User Accounts</h2>
                        <ul>
                            <li>You must provide accurate and complete information when creating an account.</li>
                            <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                            <li>You are responsible for all activities that occur under your account.</li>
                            <li>You must notify us immediately of any unauthorized use of your account.</li>
                            <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
                        </ul>
                    </div>

                    <div className="legal-section">
                        <h2>4. Intellectual Property</h2>
                        <p>All content on the LivePrompt platform — including but not limited to prompt text, descriptions, categories, design, and branding — is the intellectual property of LivePrompt and is protected by applicable copyright and trademark laws.</p>
                        <ul>
                            <li><strong>Personal Use:</strong> You may use purchased or unlocked prompts for your own personal or commercial content creation.</li>
                            <li><strong>No Redistribution:</strong> You may not resell, redistribute, republish, or share purchased prompts in any prompt marketplace, database, or collection.</li>
                            <li><strong>No Scraping:</strong> Automated scraping, crawling, or bulk downloading of prompts from the platform is strictly prohibited.</li>
                        </ul>
                    </div>

                    <div className="legal-section">
                        <h2>5. Payments & Subscriptions</h2>
                        <ul>
                            <li>Premium content is accessible through paid subscriptions managed by our payment provider, Polar.</li>
                            <li>All prices are listed in USD unless otherwise stated.</li>
                            <li>Subscriptions renew automatically at the end of each billing period unless canceled.</li>
                            <li>You may cancel your subscription at any time through your account dashboard or Polar&rsquo;s portal. Cancellation takes effect at the end of the current billing period.</li>
                        </ul>
                    </div>

                    <div className="legal-section">
                        <h2>6. Refund Policy</h2>
                        <p>Due to the digital nature of our products:</p>
                        <ul>
                            <li>Refund requests may be submitted within <strong>7 days</strong> of purchase if you have not accessed or downloaded any premium prompt content.</li>
                            <li>If premium content has been accessed, refunds are generally not available unless there is a technical issue preventing access to the Service.</li>
                            <li>To request a refund, please contact us at <a href="mailto:support@liveprompt.co" className="text-gradient" style={{ textDecoration: 'none' }}>support@liveprompt.co</a> with your transaction details.</li>
                        </ul>
                    </div>

                    <div className="legal-section">
                        <h2>7. Acceptable Use</h2>
                        <p>You agree not to use the Service to:</p>
                        <ul>
                            <li>Violate any applicable laws or regulations.</li>
                            <li>Generate content that is illegal, harmful, threatening, defamatory, or hateful.</li>
                            <li>Attempt to gain unauthorized access to our systems or other user accounts.</li>
                            <li>Interfere with or disrupt the Service or its infrastructure.</li>
                            <li>Use the platform to create competing products or services.</li>
                        </ul>
                    </div>

                    <div className="legal-section">
                        <h2>8. AI Output Disclaimer</h2>
                        <p>LivePrompt provides prompts intended for use with third-party AI tools. We are not responsible for:</p>
                        <ul>
                            <li>The output generated by any AI tool using our prompts.</li>
                            <li>Any consequences arising from the use of AI-generated content in your projects, marketing, or publications.</li>
                            <li>Changes to third-party AI tools that may affect prompt performance.</li>
                        </ul>
                        <p>You are solely responsible for reviewing and ensuring AI-generated content complies with applicable laws and standards before publishing or distributing it.</p>
                    </div>

                    <div className="legal-section">
                        <h2>9. Limitation of Liability</h2>
                        <p>To the fullest extent permitted by applicable law:</p>
                        <ul>
                            <li>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, either express or implied.</li>
                            <li>LivePrompt shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</li>
                            <li>Our total liability to you for any claim arising from these Terms or the Service shall not exceed the amount you have paid us in the 12 months preceding the claim.</li>
                        </ul>
                    </div>

                    <div className="legal-section">
                        <h2>10. Termination</h2>
                        <p>We may terminate or suspend your access to the Service at any time, with or without notice, for any reason — including but not limited to violation of these Terms. Upon termination:</p>
                        <ul>
                            <li>Your right to access the Service and premium content will cease immediately.</li>
                            <li>Provisions of these Terms that by their nature should survive termination will remain in effect.</li>
                        </ul>
                    </div>

                    <div className="legal-section">
                        <h2>11. Governing Law</h2>
                        <p>These Terms shall be governed by and construed in accordance with the laws applicable in your jurisdiction, without regard to its conflict of law provisions. Any disputes arising from these Terms will be resolved through good-faith negotiation or, if necessary, in the courts of the applicable jurisdiction.</p>
                    </div>

                    <div className="legal-section">
                        <h2>12. Contact Us</h2>
                        <p>If you have any questions about these Terms, please contact us:</p>
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

export default TermsPage;
