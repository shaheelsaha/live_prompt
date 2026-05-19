import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit, where, startAfter, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import Hero from '../components/Hero';
import SearchBar from '../components/SearchBar';
import PromptCard from '../components/PromptCard';
import type { Prompt } from '../types/Prompt';
import { Filter, Layers } from 'lucide-react';

const HOMEPAGE_LIMIT = 200; // Max prompts for the default "All" view

const platforms = ['All', 'Midjourney', 'Stable Diffusion', 'Grok', 'Sora', 'Runway', 'Nano banana', 'ChatGPT'];

// Helper to shuffle array (Fisher-Yates)
const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

interface TrustStatsData {
    totalUsers: number;
    totalPrompts: number;
    recentPrompts: number;
    totalViews: number;
}

const HomePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [allPrompts, setAllPrompts] = useState<Prompt[]>([]);
    const [categoryNames, setCategoryNames] = useState<string[]>([]);
    const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
    const [totalCount, setTotalCount] = useState<number>(0);
    const [visibleCount, setVisibleCount] = useState(30);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loading, setLoading] = useState(true);

    // Trust stats for Hero + TrustStats — loaded once from cache
    const [trustStats, setTrustStats] = useState<TrustStatsData | null>(null);

    // Batch-loaded favorites set — eliminates per-card Firestore reads
    const [favoritesSet, setFavoritesSet] = useState<Set<string>>(new Set());

    // Pagination cursors
    const [lastVisible, setLastVisible] = useState<any>(null);
    const [hasMoreInDb, setHasMoreInDb] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // Initial load: read EVERYTHING from one cached document (meta/homepageCache)
    useEffect(() => {
        const fetchHomepageCache = async () => {
            try {
                // ONE Firestore read for ALL homepage data
                const cacheRef = doc(db, 'meta', 'homepageCache');
                const snapshot = await getDoc(cacheRef);

                if (snapshot.exists()) {
                    const cache = snapshot.data();

                    // Prompts
                    const firestorePrompts = (cache.prompts || []) as Prompt[];
                    setAllPrompts(shuffleArray(firestorePrompts));
                    setLastVisible(null);
                    setHasMoreInDb(false);

                    // Trust stats (for Hero + TrustStats)
                    if (cache.trustStats) {
                        setTrustStats(cache.trustStats);
                    }

                    // Categories + counts (pre-computed — no background queries needed!)
                    if (cache.categoryNames) {
                        setCategoryNames(cache.categoryNames);
                    }
                    if (cache.categoryCounts) {
                        setCategoryCounts(cache.categoryCounts);
                    }
                    if (cache.totalCount) {
                        setTotalCount(cache.totalCount);
                    }
                } else {
                    // Fallback: try the old cache document
                    const oldRef = doc(db, 'meta', 'homepagePrompts');
                    const oldSnap = await getDoc(oldRef);
                    if (oldSnap.exists() && oldSnap.data().prompts) {
                        const firestorePrompts = oldSnap.data().prompts as Prompt[];
                        setAllPrompts(shuffleArray(firestorePrompts));
                        // Extract categories from data as fallback
                        const cats = Array.from(new Set(firestorePrompts.map(p => p.category).filter(Boolean)));
                        setCategoryNames(cats);
                    }
                }
            } catch (err) {
                console.log('Could not fetch homepage cache:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHomepageCache();
    }, []);

    // Batch-load all user favorites in ONE query (instead of per-card reads)
    useEffect(() => {
        if (!user) {
            setFavoritesSet(new Set());
            return;
        }
        const loadFavorites = async () => {
            try {
                const favsRef = collection(db, 'users', user.uid, 'favorites');
                const favsSnap = await getDocs(favsRef);
                const ids = new Set<string>();
                favsSnap.forEach(doc => ids.add(doc.id));
                setFavoritesSet(ids);
            } catch (err) {
                console.log('Could not batch-load favorites:', err);
            }
        };
        loadFavorites();
    }, [user]);

    // When a category is selected, fetch that category's prompts from Firestore directly
    useEffect(() => {
        if (selectedCategory === 'All') return; // Already have the default data

        const fetchCategoryPrompts = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'prompts'),
                    where('category', '==', selectedCategory),
                    orderBy('impressions', 'desc'),
                    limit(30)
                );
                const snapshot = await getDocs(q);
                const categoryPrompts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Prompt[];

                setAllPrompts(categoryPrompts);
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
                setHasMoreInDb(snapshot.docs.length === 30);
                setVisibleCount(30);
            } catch (err) {
                console.log('Could not fetch category prompts:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCategoryPrompts();
    }, [selectedCategory]);

    // When switching back to "All", reload the default set
    const handleCategoryChange = (cat: string) => {
        if (cat === 'All' && selectedCategory !== 'All') {
            // Re-fetch from cache
            setSelectedCategory('All');
            setLoading(true);
            const fetchDefault = async () => {
                try {
                    const cacheRef = doc(db, 'meta', 'homepageCache');
                    const snapshot = await getDoc(cacheRef);
                    if (snapshot.exists() && snapshot.data().prompts) {
                        const firestorePrompts = snapshot.data().prompts as Prompt[];
                        setAllPrompts(shuffleArray(firestorePrompts));
                        setLastVisible(null);
                        setHasMoreInDb(false);
                    }
                } catch (err) {
                    console.log('Could not fetch prompts:', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchDefault();
        } else {
            setSelectedCategory(cat);
        }
    };

    const categories = ['All', ...categoryNames];

    // Load more prompts
    const loadMore = async () => {
        if (visibleCount < filteredPrompts.length) {
            setVisibleCount(prev => prev + 30);
            return;
        }

        if (hasMoreInDb && lastVisible) {
            setIsFetchingMore(true);
            try {
                const fetchLimit = selectedCategory === 'All' ? HOMEPAGE_LIMIT : 30;
                let nextQ;

                if (selectedCategory === 'All') {
                    nextQ = query(collection(db, 'prompts'), orderBy('impressions', 'desc'), startAfter(lastVisible), limit(fetchLimit));
                } else {
                    nextQ = query(collection(db, 'prompts'), where('category', '==', selectedCategory), orderBy('impressions', 'desc'), startAfter(lastVisible), limit(fetchLimit));
                }

                const snap = await getDocs(nextQ);
                const newPrompts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Prompt[];

                setAllPrompts(prev => selectedCategory === 'All' ? [...prev, ...shuffleArray(newPrompts)] : [...prev, ...newPrompts]);
                setLastVisible(snap.docs[snap.docs.length - 1]);
                setHasMoreInDb(snap.docs.length === fetchLimit);
                setVisibleCount(prev => prev + 30);

            } catch (err) {
                console.log('Error fetching more prompts from DB:', err);
            } finally {
                setIsFetchingMore(false);
            }
        }
    };

    const handleSearchNavigate = (searchText: string) => {
        if (!searchText.trim()) return;
        navigate(`/search?q=${encodeURIComponent(searchText)}`);
    };

    // Helper: normalize platform field (string or string[]) to string[]
    const getPlatforms = (p: any): string[] => {
        if (Array.isArray(p)) return p;
        if (typeof p === 'string') return [p];
        return [];
    };

    const filteredPrompts = allPrompts.filter((p) => {
        const plats = getPlatforms(p.platform);
        const matchesPlatform = selectedPlatform === 'All' || plats.includes(selectedPlatform);
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

        return matchesPlatform && matchesCategory;
    });

    const visibleFilteredPrompts = filteredPrompts.slice(0, visibleCount);
    const hasMoreToLoad = visibleCount < filteredPrompts.length || hasMoreInDb;

    // Chunk visible prompts into blocks of 30, so each "Load More" adds a new 3-row cluster
    const chunkArray = (array: Prompt[], size: number) => {
        const result = [];
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }
        return result;
    };

    const visiblePromptsChunks = chunkArray(visibleFilteredPrompts, 30);


    return (
        <>
            <Hero trustStats={trustStats} />

            <section className="container" id="prompt-grid">
                {/* Search + Filter */}
                <div className="search-filter-row">
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        onSearch={handleSearchNavigate}
                        isSearching={false}
                        placeholder="Search prompts with AI... (press Enter)"
                    />
                </div>

                {/* Category Filter */}
                <div className="filter-section">
                    <div className="filter-label"><Layers size={14} /> Categories</div>
                    <div className="platform-filters">
                        {categories.map((cat) => (
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
                        {selectedCategory !== 'All' ? (
                            <>{selectedCategory}</>
                        ) : (
                            <>Prompts</>
                        )}
                    </h2>
                    <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                        {selectedCategory === 'All' ? totalCount : categoryCounts[selectedCategory] || filteredPrompts.length} prompts
                    </span>
                </div>

                {loading ? (
                    <div className="empty-state">
                        <div className="loading-spinner"></div>
                        <p className="text-muted mt-4">Loading prompts...</p>
                    </div>
                ) : filteredPrompts.length > 0 ? (
                    (selectedPlatform !== 'All' || selectedCategory !== 'All') ? (
                        /* Static grid when filtering locally */
                        <>
                            <div className="grid">
                                {visibleFilteredPrompts.map((prompt) => (
                                    <PromptCard key={prompt.id} prompt={prompt} favoritesSet={favoritesSet} onFavToggle={setFavoritesSet} />
                                ))}
                            </div>

                            {/* Load More Button for Grid Mode */}
                            {hasMoreToLoad && (
                                <div className="flex justify-center mt-12 mb-8">
                                    <button
                                        className="btn btn-outline"
                                        onClick={loadMore}
                                        style={{ padding: '12px 32px' }}
                                        disabled={isFetchingMore}
                                    >
                                        {isFetchingMore ? 'Loading Prompts...' : 'Load More Prompts'}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Floating marquee for default view */
                        <>
                            {visiblePromptsChunks.map((chunk, chunkIndex) => {
                                const rowCapacity = Math.ceil(chunk.length / 3);
                                const row1Prompts = chunk.slice(0, rowCapacity);
                                const row2Prompts = chunk.slice(rowCapacity, rowCapacity * 2);
                                const row3Prompts = chunk.slice(rowCapacity * 2);

                                return (
                                    <div className="prompt-marquee-section" key={`chunk-${chunkIndex}`} style={{ paddingTop: chunkIndex > 0 ? '40px' : '0' }}>
                                        {/* Row 1 — scrolls left */}
                                        <div className="prompt-marquee-track">
                                            <div className="prompt-marquee-slide">
                                                {[...row1Prompts, ...row1Prompts].map((prompt, i) => (
                                                    <div className="prompt-marquee-card" key={`r1-${chunkIndex}-${prompt.id}-${i}`}>
                                                        <PromptCard prompt={prompt} favoritesSet={favoritesSet} onFavToggle={setFavoritesSet} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Row 2 — scrolls right (reverse) */}
                                        <div className="prompt-marquee-track reverse">
                                            <div className="prompt-marquee-slide">
                                                {[...row2Prompts, ...row2Prompts].map((prompt, i) => (
                                                    <div className="prompt-marquee-card" key={`r2-${chunkIndex}-${prompt.id}-${i}`}>
                                                        <PromptCard prompt={prompt} favoritesSet={favoritesSet} onFavToggle={setFavoritesSet} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Row 3 — scrolls left (slower) */}
                                        <div className="prompt-marquee-track slow">
                                            <div className="prompt-marquee-slide">
                                                {[...row3Prompts, ...row3Prompts].map((prompt, i) => (
                                                    <div className="prompt-marquee-card" key={`r3-${chunkIndex}-${prompt.id}-${i}`}>
                                                        <PromptCard prompt={prompt} favoritesSet={favoritesSet} onFavToggle={setFavoritesSet} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Load More Button */}
                            {hasMoreToLoad && (
                                <div className="flex justify-center mt-12 mb-8">
                                    <button
                                        className="btn btn-outline"
                                        onClick={loadMore}
                                        style={{ padding: '12px 32px' }}
                                        disabled={isFetchingMore}
                                    >
                                        {isFetchingMore ? 'Loading Prompts...' : 'Load More Prompts'}
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
