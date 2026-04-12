import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import SearchBar from '../components/SearchBar';
import PromptCard from '../components/PromptCard';
import type { Prompt } from '../types/Prompt';
import { Filter, Sparkles, AlertCircle } from 'lucide-react';

const platforms = ['All', 'Midjourney', 'Stable Diffusion', 'Grok', 'Sora', 'Runway', 'Nano banana', 'ChatGPT'];
// We'll hardcode common categories for search filters to avoid needing a heavy full-collection fetch.
const categories = ['All', 'Product & E-commerce', 'Real Estate & Interior', 'Fashion & Beauty', 'Food & Restaurant', 'Sports & Fitness', 'Travel & Nature', 'Portrait & Headshot', 'Automotive', 'Animation & Cartoon', 'Logo & Branding', 'Social Media Content', 'Film & Cinematic', 'Music & Entertainment', 'Education & Explainer', 'Gaming & Sci-Fi', 'Other'];

const SearchPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Core search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [vectorResults, setVectorResults] = useState<Prompt[] | null>(null);
    const [hasAttemptedSearch, setHasAttemptedSearch] = useState(false);
    
    // Pagination & Filters
    const [visibleCount, setVisibleCount] = useState(30);
    const [selectedPlatform, setSelectedPlatform] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Run AI Search when the URL ?q= changes
    useEffect(() => {
        const q = searchParams.get('q');
        if (q) {
            setSearchQuery(q);
            performSearch(q);
        } else {
            // If no search query, stay on the page and clear results
            setSearchQuery('');
            setVectorResults(null);
            setHasAttemptedSearch(false);
        }
    }, [searchParams]);

    // ═══════════════════════════════════════════════════════════
    //  AI Vector Search
    // ═══════════════════════════════════════════════════════════
    const performSearch = async (queryText: string) => {
        if (!queryText.trim()) return;

        setIsSearching(true);
        setHasAttemptedSearch(true);
        setVisibleCount(30);

        try {
            const queryCallable = httpsCallable(functions, 'publicVectorSearch');
            // Fetch up to 100 results so we can paginate locally
            const result = await queryCallable({ query: queryText, limit: 100 });

            const matchedPrompts = result.data as Prompt[];
            
            console.log('[SearchPage] Matches:', matchedPrompts.length);

            if (!matchedPrompts || matchedPrompts.length === 0) {
                setVectorResults([]);
            } else {
                setVectorResults(matchedPrompts);
            }
        } catch (err) {
            console.error('[SearchPage] Error:', err);
            setVectorResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // When the user submits the search bar on this page
    const handleNewSearch = (newText: string) => {
        if (!newText.trim()) return;
        navigate(`/search?q=${encodeURIComponent(newText)}`);
    };

    // Helper: normalize platform
    const getPlatforms = (p: any): string[] => {
        if (Array.isArray(p)) return p;
        if (typeof p === 'string') return [p];
        return [];
    };

    // Apply local filters (Platform & Category) logic to AI results
    const basePrompts = vectorResults || [];
    const filteredPrompts = basePrompts.filter((p) => {
        const plats = getPlatforms(p.platform);
        const matchesPlatform = selectedPlatform === 'All' || plats.includes(selectedPlatform);
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesPlatform && matchesCategory;
    });

    const visibleFilteredPrompts = filteredPrompts.slice(0, visibleCount);
    const hasMoreToLoad = visibleCount < filteredPrompts.length;

    const loadMore = () => setVisibleCount(prev => prev + 30);

    return (
        <div style={{ paddingTop: '80px', minHeight: 'calc(100vh - 200px)' }}>
            <div className="container pb-12">
                
                {/* Search Bar */}
                <div className="search-filter-row mb-8">
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        onSearch={handleNewSearch}
                        isSearching={isSearching}
                        placeholder="Search prompts with AI... (press Enter)"
                    />
                </div>

                {/* Filters */}
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

                <div className="filter-section mb-12">
                    <div className="filter-label"><Filter size={14} /> Categories</div>
                    <div className="platform-filters" style={{ flexWrap: 'wrap' }}>
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

                {/* State: Searching */}
                {isSearching ? (
                    <div className="empty-state mt-16">
                        <div className="loading-spinner"></div>
                        <p className="text-muted mt-4">Searching with AI...</p>
                    </div>
                ) : 
                
                /* State: Found Results */
                hasAttemptedSearch && filteredPrompts.length > 0 ? (
                    <>
                        <div className="flex justify-between items-center mb-8">
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={22} style={{ color: 'var(--accent-neon)' }} /> AI Results for "{searchParams.get('q')}"
                            </h2>
                            <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                                {filteredPrompts.length} match{filteredPrompts.length !== 1 ? 'es' : ''}
                            </span>
                        </div>

                        <div className="grid">
                            {visibleFilteredPrompts.map((prompt) => (
                                <PromptCard key={prompt.id} prompt={prompt} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {hasMoreToLoad ? (
                            <div className="flex justify-center mt-12 mb-8">
                                <button 
                                    className="btn btn-outline" 
                                    onClick={loadMore} 
                                    style={{ padding: '12px 32px' }}
                                >
                                    Load More Results
                                </button>
                            </div>
                        ) : (
                            <div className="flex justify-center mt-12 mb-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                <p>End of AI matches! Try using different words if you didn't find what you were looking for.</p>
                            </div>
                        )}
                    </>
                ) : 
                
                /* State: No Results */
                hasAttemptedSearch && filteredPrompts.length === 0 ? (
                    <div className="empty-state mt-16">
                        <AlertCircle size={48} style={{ color: 'var(--text-muted)' }} />
                        <h3 className="mt-4">No prompts found</h3>
                        <p className="text-muted">
                            Try adjusting your search terms or clearing your filters.
                        </p>
                    </div>
                ) : null}

            </div>
        </div>
    );
};

export default SearchPage;
