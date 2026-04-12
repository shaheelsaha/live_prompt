import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, query, orderBy, limit, where, getCountFromServer } from 'firebase/firestore';
import { db, functions } from '../firebase/config';
import SearchBar from '../components/SearchBar';
import PromptCard from '../components/PromptCard';
import type { Prompt } from '../types/Prompt';
import { Filter, Sparkles, AlertCircle, Layers } from 'lucide-react';

const platforms = ['All', 'Midjourney', 'Stable Diffusion', 'Grok', 'Sora', 'Runway', 'Nano banana', 'ChatGPT'];

const SearchPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Core search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [vectorResults, setVectorResults] = useState<Prompt[] | null>(null);
    const [defaultPrompts, setDefaultPrompts] = useState<Prompt[]>([]);
    const [hasAttemptedSearch, setHasAttemptedSearch] = useState(false);
    
    // Categories and Counts
    const [categoryNames, setCategoryNames] = useState<string[]>([]);
    const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
    const [totalCount, setTotalCount] = useState<number>(0);

    // Pagination & Filters
    const [visibleCount, setVisibleCount] = useState(30);
    const [selectedPlatform, setSelectedPlatform] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Initial load: fetch categories, counts, and default prompts
    useEffect(() => {
        const fetchDefaults = async () => {
            try {
                // Fetch top 100 most popular for the default view
                const q = query(collection(db, 'prompts'), orderBy('impressions', 'desc'), limit(100));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const firestorePrompts = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Prompt[];

                    setDefaultPrompts(firestorePrompts);

                    // Extract unique categories from loaded data
                    const cats = Array.from(new Set(firestorePrompts.map(p => p.category).filter(Boolean)));

                    // Fetch total count
                    const totalSnapshot = await getCountFromServer(collection(db, 'prompts'));
                    setTotalCount(totalSnapshot.data().count);
                    
                    // Fetch counts for each category
                    const counts: Record<string, number> = {};
                    await Promise.all(cats.map(async (cat) => {
                        const catQuery = query(collection(db, 'prompts'), where('category', '==', cat));
                        const countSnap = await getCountFromServer(catQuery);
                        counts[cat] = countSnap.data().count;
                    }));
                    setCategoryCounts(counts);

                    // Sort categories by count (high to low), then by name as a fallback
                    const sortedCats = cats.sort((a, b) => {
                        const countA = counts[a] || 0;
                        const countB = counts[b] || 0;
                        if (countB !== countA) return countB - countA;
                        return a.localeCompare(b);
                    });
                    setCategoryNames(sortedCats);
                }
            } catch (err) {
                console.log('Could not fetch default prompts:', err);
            }
        };
        fetchDefaults();
    }, []);

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

    // When a category is selected AND we have not searched yet, fetch full category
    useEffect(() => {
        if (hasAttemptedSearch || selectedCategory === 'All') return;
        
        const fetchCategoryPrompts = async () => {
            try {
                const q = query(
                    collection(db, 'prompts'),
                    where('category', '==', selectedCategory),
                    orderBy('impressions', 'desc'),
                    limit(100)
                );
                const snapshot = await getDocs(q);
                const categoryPrompts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Prompt[];
                
                setDefaultPrompts(categoryPrompts);
                setVisibleCount(30);
            } catch (err) {
                console.log('Could not fetch category prompts:', err);
            }
        };
        fetchCategoryPrompts();
    }, [selectedCategory, hasAttemptedSearch]);

    // If we go back to "All" from a category without searching, reload default Top 100
    const handleCategoryChange = (cat: string) => {
        if (cat === 'All' && selectedCategory !== 'All' && !hasAttemptedSearch) {
            const fetchDefault = async () => {
                const q = query(collection(db, 'prompts'), orderBy('impressions', 'desc'), limit(100));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const firestorePrompts = snapshot.docs.map(doc => ({
                        id: doc.id, ...doc.data(),
                    })) as Prompt[];
                    setDefaultPrompts(firestorePrompts);
                }
            };
            fetchDefault();
        }
        setSelectedCategory(cat);
    };

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

    // Apply local filters (Platform & Category) logic to AI results or default prompts
    const basePrompts = hasAttemptedSearch ? (vectorResults || []) : defaultPrompts;
    const filteredPrompts = basePrompts.filter((p) => {
        const plats = getPlatforms(p.platform);
        const matchesPlatform = selectedPlatform === 'All' || plats.includes(selectedPlatform);
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesPlatform && matchesCategory;
    });

    const visibleFilteredPrompts = filteredPrompts.slice(0, visibleCount);
    const hasMoreToLoad = visibleCount < filteredPrompts.length;

    const loadMore = () => setVisibleCount(prev => prev + 30);

    const displayCategories = ['All', ...categoryNames];

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
                    <div className="filter-label"><Layers size={14} /> Categories</div>
                    <div className="platform-filters" style={{ flexWrap: 'wrap' }}>
                        {displayCategories.map((cat) => (
                            <button
                                key={cat}
                                className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => handleCategoryChange(cat)}
                            >
                                {cat}
                                {cat === 'All' && totalCount > 0 && <span style={{ opacity: 0.7, marginLeft: '4px', fontSize: '0.85em' }}>({totalCount})</span>}
                                {cat !== 'All' && categoryCounts[cat] !== undefined && <span style={{ opacity: 0.7, marginLeft: '4px', fontSize: '0.85em' }}>({categoryCounts[cat]})</span>}
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
                
                /* State: Found Results / Has Default Prompts */
                filteredPrompts.length > 0 ? (
                    <>
                        <div className="flex justify-between items-center mb-8">
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {hasAttemptedSearch ? (
                                    <><Sparkles size={22} style={{ color: 'var(--accent-neon)' }} /> AI Results for "{searchParams.get('q')}"</>
                                ) : (
                                    <>{selectedCategory !== 'All' ? selectedCategory : 'Explore Prompts'}</>
                                )}
                            </h2>
                            <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                                {hasAttemptedSearch 
                                    ? `${filteredPrompts.length} match${filteredPrompts.length !== 1 ? 'es' : ''}`
                                    : `${selectedCategory === 'All' ? totalCount : categoryCounts[selectedCategory] || filteredPrompts.length} prompts`
                                }
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
                        ) : hasAttemptedSearch ? (
                            <div className="flex justify-center mt-12 mb-8 text-center" style={{ color: 'var(--text-muted)' }}>
                                <p>End of AI matches! Try using different words if you didn't find what you were looking for.</p>
                            </div>
                        ) : null}
                    </>
                ) : 
                
                /* State: No Results */
                <div className="empty-state mt-16">
                    <AlertCircle size={48} style={{ color: 'var(--text-muted)' }} />
                    <h3 className="mt-4">No prompts found</h3>
                    <p className="text-muted">
                        Try adjusting your search terms or clearing your filters.
                    </p>
                </div>}

            </div>
        </div>
    );
};

export default SearchPage;
