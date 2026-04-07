import { Target, Lightbulb, Shield, Rocket } from 'lucide-react';

const AboutPage = () => {
    return (
        <section className="page-section">
            <div className="container">
                <div className="text-center" style={{ marginBottom: 64 }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>
                        About <span className="text-gradient">Prompt Factory</span>
                    </h1>
                    <p className="text-muted" style={{ fontSize: '1.15rem', maxWidth: 600, margin: '0 auto' }}>
                        We are not another AI tool. We are a curated library of proven viral frameworks,
                        hand-picked and battle-tested by real creators and founders.
                    </p>
                </div>

                {/* How It Works */}
                <div className="about-grid">
                    <div className="about-card">
                        <div className="about-icon"><Target size={28} /></div>
                        <h3>We Show the Problem</h3>
                        <p className="text-muted">
                            Every prompt starts with the real problem it solves. No fluff — just the exact pain point
                            your content is facing right now.
                        </p>
                    </div>
                    <div className="about-card">
                        <div className="about-icon"><Lightbulb size={28} /></div>
                        <h3>Before vs After</h3>
                        <p className="text-muted">
                            See a weak "before" example vs the viral "after" result. This is proof the prompt works
                            before you even buy it.
                        </p>
                    </div>
                    <div className="about-card">
                        <div className="about-icon"><Rocket size={28} /></div>
                        <h3>Full Prompt + Instructions</h3>
                        <p className="text-muted">
                            When you unlock a prompt, you get the exact formula, step-by-step instructions,
                            and guidance on where and when to use it.
                        </p>
                    </div>
                    <div className="about-card">
                        <div className="about-icon"><Shield size={28} /></div>
                        <h3>Curated, Not Generated</h3>
                        <p className="text-muted">
                            Every single prompt is manually curated and tested. This is not an AI auto-generator —
                            it is a premium collection focused on real results.
                        </p>
                    </div>
                </div>

                {/* Mission */}
                <div className="mission-block">
                    <h2 style={{ fontSize: '2rem', marginBottom: 16 }}>Our Mission</h2>
                    <p className="text-muted" style={{ fontSize: '1.1rem', lineHeight: 1.7, maxWidth: 700, margin: '0 auto' }}>
                        We believe the difference between a post that dies in the feed and one that goes viral
                        is not luck — it is a framework. Prompt Factory exists to give founders, marketers,
                        and creators access to the exact frameworks that consistently drive engagement.
                        We are selling better outcomes, not just text prompts.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default AboutPage;
