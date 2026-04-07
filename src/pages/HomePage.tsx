import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import Hero from '../components/Hero';
import SearchBar from '../components/SearchBar';
import PromptCard from '../components/PromptCard';
import type { Prompt } from '../types/Prompt';
import { TrendingUp, Filter, Layers } from 'lucide-react';

const platforms = ['All', 'Midjourney', 'DALL-E', 'Sora', 'Veo', 'Nano banana', 'Runway'];

const categories = [
    'All', 'Product & E-commerce', 'Real Estate & Interior', 'Fashion & Beauty',
    'Food & Restaurant', 'Sports & Fitness', 'Travel & Nature',
    'Portrait & Headshot', 'Automotive', 'Animation & Cartoon',
    'Logo & Branding', 'Social Media Content', 'Film & Cinematic',
    'Logo & Branding', 'Social Media Content', 'Film & Cinematic',
    'Music & Entertainment', 'Education & Explainer', 'Gaming & Sci-Fi',
];

// Helper to shuffle array (Fisher-Yates)
const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const HomePage = () => {
    const [allPrompts, setAllPrompts] = useState<Prompt[]>([]);
    const [visibleCount, setVisibleCount] = useState(30); // Need more items for 3 distinct rows
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const q = searchParams.get('q');
        if (q) setSearchQuery(q);
    }, [searchParams]);

    // Load initial prompts from Firestore
    useEffect(() => {
        const fetchPrompts = async () => {
            try {
                const q = query(collection(db, 'prompts'), orderBy('impressions', 'desc'), limit(50));
                const snapshot = await getDocs(q);
                
                if (!snapshot.empty) {
                    const firestorePrompts = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Prompt[];
                    
                    // Shuffle the top 50 most popular prompts
                    setAllPrompts(shuffleArray(firestorePrompts));
                }
            } catch (err) {
                console.log('Could not fetch prompts:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPrompts();
    }, []);

    // Load more prompts
    const loadMore = () => {
        setVisibleCount(prev => prev + 30);
    };

    const filteredPrompts = allPrompts.filter((p) => {
        const matchesSearch = searchQuery === '' ||
            p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.problem.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesPlatform = selectedPlatform === 'All' || p.platform === selectedPlatform;
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

        return matchesSearch && matchesPlatform && matchesCategory;
    });

    const visibleFilteredPrompts = filteredPrompts.slice(0, visibleCount);
    const hasMoreToLoad = visibleCount < filteredPrompts.length;

    // Split prompts into 3 distinct chunks for the 3 marquee rows
    const rowCapacity = Math.ceil(visibleFilteredPrompts.length / 3);
    const row1Prompts = visibleFilteredPrompts.slice(0, rowCapacity);
    const row2Prompts = visibleFilteredPrompts.slice(rowCapacity, rowCapacity * 2);
    const row3Prompts = visibleFilteredPrompts.slice(rowCapacity * 2);

    return (
        <>
            <Hero />

            <section className="container" id="prompt-grid">
                {/* Search + Filter */}
                <div className="search-filter-row">
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />
                </div>

                {/* Category Filter */}
                <div className="filter-section">
                    <div className="filter-label"><Layers size={14} /> Categories</div>
                    <div className="platform-filters">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* AI Tool Filter */}
                <div className="filter-section">
                    <div className="filter-label"><Filter size={14} /> AI Tools</div>
                    <div className="platform-filters">
                        {platforms.map((platform) => (
                            <button
                                key={platform}
                                className={`filter-chip ${selectedPlatform === platform ? 'active' : ''}`}
                                onClick={() => setSelectedPlatform(platform)}
                            >
                                {platform}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Section Header */}
                <div className="flex justify-between items-center mb-8 mt-4">
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={22} style={{ color: 'var(--accent-neon)' }} />
                        {searchQuery ? `Results for "${searchQuery}"` : selectedCategory !== 'All' ? selectedCategory : 'Trending Prompts'}
                    </h2>
                    <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                        {filteredPrompts.length} prompt{filteredPrompts.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {loading ? (
                    <div className="empty-state">
                        <div className="loading-spinner"></div>
                        <p className="text-muted mt-4">Loading prompts...</p>
                    </div>
                ) : filteredPrompts.length > 0 ? (
                    (searchQuery || selectedPlatform !== 'All' || selectedCategory !== 'All') ? (
                        /* Static grid when filtering/searching */
                        <div className="grid">
                            {visibleFilteredPrompts.map((prompt) => (
                                <PromptCard key={prompt.id} prompt={prompt} />
                            ))}
                        </div>
                    ) : (
                        /* Floating marquee for default view */
                        <>
                            <div className="prompt-marquee-section">
                                {/* Row 1 — scrolls left */}
                                <div className="prompt-marquee-track">
                                    <div className="prompt-marquee-slide">
                                        {[...row1Prompts, ...row1Prompts].map((prompt, i) => (
                                            <div className="prompt-marquee-card" key={`r1-${prompt.id}-${i}`}>
                                                <PromptCard prompt={prompt} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Row 2 — scrolls right (reverse) */}
                                <div className="prompt-marquee-track reverse">
                                    <div className="prompt-marquee-slide">
                                        {[...row2Prompts, ...row2Prompts].map((prompt, i) => (
                                            <div className="prompt-marquee-card" key={`r2-${prompt.id}-${i}`}>
                                                <PromptCard prompt={prompt} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Row 3 — scrolls left (slower) */}
                                <div className="prompt-marquee-track slow">
                                    <div className="prompt-marquee-slide">
                                        {[...row3Prompts, ...row3Prompts].map((prompt, i) => (
                                            <div className="prompt-marquee-card" key={`r3-${prompt.id}-${i}`}>
                                                <PromptCard prompt={prompt} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Load More Button */}
                            {hasMoreToLoad && (
                                <div className="flex justify-center mt-12 mb-8">
                                    <button 
                                        className="btn btn-outline" 
                                        onClick={loadMore} 
                                        style={{ padding: '12px 32px' }}
                                    >
                                        Load More Prompts
                                    </button>
                                </div>
                            )}
                        </>
                    )
                ) : (
                    <div className="empty-state">
                        <Filter size={48} style={{ color: 'var(--text-muted)' }} />
                        <h3>No prompts found</h3>
                        <p className="text-muted">
                            {allPrompts.length === 0
                                ? 'No prompts have been added yet. Add your first prompt from the admin panel!'
                                : 'Try a different search term or filter.'}
                        </p>
                    </div>
                )}
            </section>
        </>
    );
};

export default HomePage;
