import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import TrustStats from './TrustStats';

const Hero = () => {
    const navigate = useNavigate();
    const [totalPrompts, setTotalPrompts] = useState<number | null>(null);

    useEffect(() => {
        const fetchTotalPrompts = async () => {
            try {
                const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'prompt-factory-952f9';
                const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/getTrustStats`;
                const response = await fetch(functionUrl);
                if (response.ok) {
                    const data = await response.json();
                    if (data.totalPrompts) {
                        setTotalPrompts(data.totalPrompts);
                    }
                }
            } catch (err) {
                console.log('Could not fetch total prompts for hero badge:', err);
            }
        };
        fetchTotalPrompts();
    }, []);

    return (
        <header className="hero">
            <div className="hero-glow"></div>
            <div className="container text-center" style={{ position: 'relative', zIndex: 1 }}>
                <div
                    className="hero-badge"
                    style={{
                        opacity: totalPrompts === null ? 0 : 1,
                        transition: 'opacity 0.5s ease',
                    }}
                >
                    <Rocket size={14} /> {totalPrompts ?? '...'}+ ready-to-use prompts
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
                    <button className="btn btn-primary btn-lg" onClick={() => navigate('/search')}>
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
