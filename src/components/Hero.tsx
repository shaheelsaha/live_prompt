import { Sparkles } from 'lucide-react';
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
                    <Sparkles size={14} /> AI Prompt Marketplace
                </div>
                <h1>
                    The exact prompts behind <br />
                    <span className="text-gradient">viral AI creations.</span>
                </h1>
                <p className="text-muted" style={{ fontSize: '1.25rem', maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.6 }}>
                    Discover curated prompts for Midjourney, Sora, DALL-E, Veo and more.
                    Stop guessing — use the exact formulas that create stunning AI content.
                </p>
                <div className="flex justify-center gap-4">
                    <button className="btn btn-primary btn-lg" onClick={scrollToPrompts}>
                        Browse Prompts
                    </button>
                    <a href="/pricing" className="btn btn-outline btn-lg" style={{ textDecoration: 'none' }}>
                        View Pricing
                    </a>
                </div>

                {/* Live Trust Stats */}
                <TrustStats />
            </div>
        </header>
    );
};

export default Hero;
