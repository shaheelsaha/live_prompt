import { Rocket } from 'lucide-react';
import TrustStats from './TrustStats';

const Hero = () => {
    const scrollToPrompts = () => {
        document.getElementById('prompt-grid')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <header className="hero">
            <div className="hero-glow"></div>
            <div className="container text-center" style={{ position: 'relative', zIndex: 1 }}>
                <div className="hero-badge">
                    <Rocket size={14} /> 500+ ready-to-use prompts
                </div>
                <h1>
                    Stop guessing prompts. <br />
                    <span className="text-gradient">Start creating viral AI content.</span>
                </h1>
                <p className="text-muted" style={{ fontSize: '1.25rem', maxWidth: 640, margin: '0 auto 32px', lineHeight: 1.6 }}>
                    A curated and growing AI prompt database of proven, ready-to-use prompts.
                    Copy, paste, and create stunning AI content in seconds.
                </p>
                <div className="flex justify-center gap-4">
                    <button className="btn btn-primary btn-lg" onClick={scrollToPrompts}>
                        Explore Prompts →
                    </button>
                    <a href="/about" className="btn btn-outline btn-lg" style={{ textDecoration: 'none' }}>
                        See How It Works
                    </a>
                </div>

                {/* Live Trust Stats */}
                <TrustStats />
            </div>
        </header>
    );
};

export default Hero;
