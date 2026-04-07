import { useState, useEffect } from 'react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Prompt } from '../types/Prompt';
import PromptCard from './PromptCard';
import { Sparkles } from 'lucide-react';

interface RelatedPromptsProps {
    category: string;
    currentPromptId: string;
}

const RelatedPrompts = ({ category, currentPromptId }: RelatedPromptsProps) => {
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRelated = async () => {
            try {
                // Fetch up to 6 prompts in the same category
                const promptsRef = collection(db, 'prompts');
                const q = query(
                    promptsRef,
                    where('category', '==', category),
                    limit(6)
                );
                
                const snapshot = await getDocs(q);
                const related: Prompt[] = [];
                
                snapshot.forEach((doc) => {
                    const data = { id: doc.id, ...doc.data() } as Prompt;
                    // Don't include the current prompt in the "More like this" section
                    if (data.id !== currentPromptId) {
                        related.push(data);
                    }
                });
                
                setPrompts(related.slice(0, 5)); // Keep max 5 for a clean horizontal row
            } catch (err) {
                console.error("Error fetching related prompts:", err);
            } finally {
                setLoading(false);
            }
        };

        if (category) {
            fetchRelated();
        }
    }, [category, currentPromptId]);

    if (loading || prompts.length === 0) {
        return null; // Don't show the section if there are no related prompts
    }

    return (
        <div className="related-prompts-section">
            <div className="container" style={{ maxWidth: 780 }}>
                <h2 className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <Sparkles size={20} style={{ color: 'var(--accent-neon)' }} /> 
                    More Like This
                </h2>
            </div>
            <div className="related-prompts-marquee">
                <div className="related-prompts-track">
                    {[...prompts, ...prompts, ...prompts].map((prompt, i) => (
                        <div key={`t1-${prompt.id}-${i}`} className="related-prompt-wrapper">
                            <PromptCard prompt={prompt} />
                        </div>
                    ))}
                </div>
                <div className="related-prompts-track" aria-hidden="true">
                    {[...prompts, ...prompts, ...prompts].map((prompt, i) => (
                        <div key={`t2-${prompt.id}-${i}`} className="related-prompt-wrapper">
                            <PromptCard prompt={prompt} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RelatedPrompts;
