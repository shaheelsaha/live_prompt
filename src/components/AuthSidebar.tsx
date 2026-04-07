import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import PromptCard from './PromptCard';
import type { Prompt } from './PromptCard';

// Helper to shuffle array (Fisher-Yates)
const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const AuthSidebar = () => {
    const [prompts, setPrompts] = useState<Prompt[]>([]);

    useEffect(() => {
        const fetchNewest = async () => {
            try {
                // Fetch the 50 newest prompts instead of trending, to differentiate from homepage
                const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'), limit(50));
                const snap = await getDocs(q);
                let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Prompt[];
                
                // Shuffle them so the columns look random and dynamic, then pick the first 21
                data = shuffleArray(data).slice(0, 21);
                
                setPrompts(data);
            } catch (err) {
                console.error("Error fetching for auth sidebar", err);
            }
        };
        fetchNewest();
    }, []);

    if (prompts.length === 0) return <div className="auth-sidebar" />;

    // Split into three columns for a nice layered vertical effect
    const col1 = prompts.slice(0, 7);
    const col2 = prompts.slice(7, 14);
    const col3 = prompts.slice(14, 21);

    return (
        <div className="auth-sidebar">
            <div className="prompt-marquee-section vertical" style={{ gap: '16px', padding: '0 16px' }}>
                {/* Column 1 - Scrolling up */}
                <div className="prompt-marquee-track vertical" style={{ flex: 1, maxWidth: 220 }}>
                    <div className="prompt-marquee-slide vertical">
                        {[...col1, ...col1].map((prompt, i) => (
                            <div className="prompt-marquee-card" key={`c1-${prompt.id}-${i}`} style={{ marginBottom: 16, width: '100%' }}>
                                <PromptCard prompt={prompt} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Column 2 - Scrolling down */}
                <div className="prompt-marquee-track reverse vertical" style={{ flex: 1, maxWidth: 220 }}>
                    <div className="prompt-marquee-slide vertical">
                        {[...col2, ...col2].map((prompt, i) => (
                            <div className="prompt-marquee-card" key={`c2-${prompt.id}-${i}`} style={{ marginBottom: 16, width: '100%' }}>
                                <PromptCard prompt={prompt} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Column 3 - Scrolling up */}
                <div className="prompt-marquee-track slow vertical" style={{ flex: 1, maxWidth: 220 }}>
                    <div className="prompt-marquee-slide vertical">
                        {[...col3, ...col3].map((prompt, i) => (
                            <div className="prompt-marquee-card" key={`c3-${prompt.id}-${i}`} style={{ marginBottom: 16, width: '100%' }}>
                                <PromptCard prompt={prompt} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthSidebar;
