import { Link } from 'react-router-dom';
import { Layers, Zap, Users, Star, ArrowRight, CheckCircle2 } from 'lucide-react';

const AboutPage = () => {
    return (
        <section className="page-section">
            <div className="container" style={{ maxWidth: '800px' }}>
                <div className="text-center" style={{ marginBottom: 64 }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>
                        About <span className="text-gradient">LivePrompt</span>
                    </h1>
                    <p className="text-muted" style={{ fontSize: '1.15rem', lineHeight: 1.6 }}>
                        LivePrompt is a growing library of ready-to-use AI prompts designed to help you get better results without wasting time.
                    </p>
                </div>

                <div className="legal-content" style={{ paddingBottom: '40px' }}>
                    <div className="legal-section">
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>The Problem</h2>
                        <p style={{ fontSize: '1.05rem' }}>
                            Writing effective prompts is frustrating. You spend time testing, tweaking, and still don’t get the output you want.
                        </p>
                        <p style={{ fontSize: '1.05rem', marginTop: '12px', fontWeight: 500, color: 'var(--text-main)' }}>
                            That’s exactly why LivePrompt exists.
                        </p>
                    </div>

                    <div className="legal-section">
                        <div className="legal-icon"><Layers size={20} /></div>
                        <h2>More than just a prompt library</h2>
                        <p>Most platforms only let you copy prompts. With LivePrompt, you can go further.</p>
                        <p>Every prompt is built to be:</p>
                        <ul>
                            <li><strong>Easy to copy</strong></li>
                            <li><strong>Simple to test</strong></li>
                            <li><strong>Flexible to tweak</strong></li>
                        </ul>
                        <p style={{ marginTop: '16px' }}>
                            So instead of starting from scratch, you can take a working prompt and quickly adapt it to your exact needs.
                        </p>
                    </div>

                    <div className="legal-section">
                        <div className="legal-icon"><Zap size={20} /></div>
                        <h2>How it works</h2>
                        <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                            <li style={{ paddingLeft: '28px', position: 'relative' }}>
                                <CheckCircle2 size={18} style={{ position: 'absolute', left: 0, top: 4, color: 'var(--accent-neon)' }} />
                                Copy a prompt instantly
                            </li>
                            <li style={{ paddingLeft: '28px', position: 'relative' }}>
                                <CheckCircle2 size={18} style={{ position: 'absolute', left: 0, top: 4, color: 'var(--accent-neon)' }} />
                                Test it in your workflow
                            </li>
                            <li style={{ paddingLeft: '28px', position: 'relative' }}>
                                <CheckCircle2 size={18} style={{ position: 'absolute', left: 0, top: 4, color: 'var(--accent-neon)' }} />
                                Tweak it to fit your use case
                            </li>
                        </ul>
                        <p style={{ marginTop: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
                            No guesswork. No trial-and-error loops.
                        </p>
                    </div>

                    <div className="legal-section">
                        <div className="legal-icon"><Users size={20} /></div>
                        <h2>Who is it for?</h2>
                        <p>LivePrompt is built for:</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', margin: '16px 0' }}>
                            {['SaaS builders', 'Marketers', 'Developers', 'Automation enthusiasts', 'Content creators'].map(role => (
                                <span key={role} className="filter-chip active" style={{ cursor: 'default', padding: '6px 14px', fontSize: '0.9rem' }}>{role}</span>
                            ))}
                        </div>
                        <p style={{ fontWeight: 500, color: 'var(--text-main)' }}>If you use AI regularly, this is for you.</p>
                    </div>

                    <div className="legal-section">
                        <div className="legal-icon"><Star size={20} /></div>
                        <h2>What makes LivePrompt different?</h2>
                        <ul>
                            <li><strong>Ready-to-use prompts</strong> that actually make sense</li>
                            <li><strong>Built for real-world</strong> use cases</li>
                            <li>Designed to be <strong>adapted, not just copied</strong></li>
                            <li>Focused on <strong>saving time</strong> and improving results</li>
                        </ul>
                    </div>

                    <div className="mission-block" style={{ textAlign: 'center', marginTop: '64px' }}>
                        <h2 style={{ fontSize: '2rem', marginBottom: 16 }}>What’s next?</h2>
                        <p className="text-muted" style={{ fontSize: '1.1rem', lineHeight: 1.7, maxWidth: 600, margin: '0 auto 24px' }}>
                            We’re building more than a prompt library. Soon, you’ll be able to discover trending prompts, see what works best, and contribute your own improved versions.
                        </p>
                        
                        <div style={{ padding: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '32px' }}>
                            <h3 style={{ fontSize: '1.4rem', marginBottom: '24px', fontWeight: 600 }}>Get started</h3>
                            <p style={{ marginBottom: '24px', color: 'var(--text-muted)' }}>Start exploring prompts and build faster with less effort.</p>
                            <Link to="/search" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', fontSize: '1rem' }}>
                                Browse Prompts <ArrowRight size={18} />
                            </Link>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default AboutPage;
