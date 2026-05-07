import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
    Lock, ArrowLeft, Eye, Sparkles,
    Copy, Check, Image, Video, Heart, FileText, Download,
    Zap, Crown, ExternalLink, X
} from 'lucide-react';
import type { Prompt } from '../types/Prompt';
import RelatedPrompts from '../components/RelatedPrompts';
import confetti from 'canvas-confetti';

const FREE_UNLOCK_LIMIT = 5;

const PromptDetailPage = () => {
    const { slug } = useParams();
    const { user, loading: authLoading, loginWithGoogle, hasFullAccess, isFree, credits } = useAuth();
    const [prompt, setPrompt] = useState<Prompt | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [isFav, setIsFav] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [unlocking, setUnlocking] = useState(false);
    const [unlockCount, setUnlockCount] = useState(0);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [fullPromptText, setFullPromptText] = useState<string | null>(null);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const FUNCTIONS_BASE = 'https://us-central1-prompt-factory-952f9.cloudfunctions.net';

    // Auto-slide gallery in a loop
    useEffect(() => {
        if (!prompt?.images || prompt.images.length <= 1) return;
        const timer = setInterval(() => {
            setGalleryIndex(i => (i + 1) % prompt.images!.length);
        }, 2000);
        return () => clearInterval(timer);
    }, [prompt?.images, galleryIndex]);

    // Fetch prompt data by slug
    useEffect(() => {
        const fetchPrompt = async () => {
            if (!slug) return;
            try {
                const q = query(collection(db, 'prompts'), where('slug', '==', slug));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const docSnap = snapshot.docs[0];
                    setPrompt({ id: docSnap.id, ...docSnap.data() } as Prompt);
                }
            } catch (err) {
                console.error('Error fetching prompt:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPrompt();
    }, [slug]);

    // Track views via Cloud Function (server-side)
    useEffect(() => {
        if (!prompt?.id) return;
        
        const trackView = async () => {
            const viewKey = `viewed_${prompt.id}`;
            const hasViewed = sessionStorage.getItem(viewKey);
            
            if (!hasViewed) {
                try {
                    await fetch(`${FUNCTIONS_BASE}/trackView`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ promptId: prompt.id }),
                    });
                    sessionStorage.setItem(viewKey, 'true');
                    setPrompt(prev => prev ? { ...prev, impressions: (prev.impressions || 0) + 1 } : prev);
                } catch (err) {
                    console.error('Error tracking view:', err);
                }
            }
        };

        trackView();
    }, [prompt?.id]);

    // Check favorite + unlock status + free credits
    useEffect(() => {
        if (!user || !prompt) return;
        const promptId = prompt.id;

        const checkStatus = async () => {
            // Check favorite
            const favRef = doc(db, 'users', user.uid, 'favorites', promptId);
            const favSnap = await getDoc(favRef);
            setIsFav(favSnap.exists());

            // Pro subscribers: auto-reveal ALL prompts (no unlock record needed)
            if (hasFullAccess) {
                try {
                    const idToken = await user.getIdToken();
                    const resp = await fetch(`${FUNCTIONS_BASE}/getPromptContent`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ promptId, idToken }),
                    });
                    if (resp.ok) {
                        const data = await resp.json();
                        setFullPromptText(data.fullPrompt || '');
                        setIsUnlocked(true);
                    }
                } catch (err) {
                    console.error('Error fetching prompt content:', err);
                }
                return; // Skip unlock record checks for subscribers
            }

            // Free/credit users: check if they own a permanent unlock receipt
            const unlockRef = doc(db, 'users', user.uid, 'unlocked', promptId);
            const unlockSnap = await getDoc(unlockRef);
            const alreadyUnlocked = unlockSnap.exists();
            setIsUnlocked(alreadyUnlocked);

            if (alreadyUnlocked) {
                try {
                    const idToken = await user.getIdToken();
                    const resp = await fetch(`${FUNCTIONS_BASE}/getPromptContent`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ promptId, idToken }),
                    });
                    if (resp.ok) {
                        const data = await resp.json();
                        setFullPromptText(data.fullPrompt || '');
                    }
                } catch (err) {
                    console.error('Error fetching prompt content:', err);
                }
            }

            // Count total unlocks for free tier cap
            if (isFree) {
                const allUnlocks = await getDocs(collection(db, 'users', user.uid, 'unlocked'));
                setUnlockCount(allUnlocks.size);
            }
        };
        checkStatus();
    }, [user, prompt, hasFullAccess, isFree]);

    const toggleFav = async () => {
        if (!user || !prompt) return;
        const favRef = doc(db, 'users', user.uid, 'favorites', prompt.id);
        if (isFav) {
            await deleteDoc(favRef);
            setIsFav(false);
        } else {
            await setDoc(favRef, { savedAt: new Date() });
            setIsFav(true);
        }
    };

    const handleUnlockFree = async () => {
        if (!user || !prompt) return;

        setUnlocking(true);
        try {
            const idToken = await user.getIdToken();
            const resp = await fetch(`${FUNCTIONS_BASE}/unlockPrompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ promptId: prompt.id, idToken }),
            });

            const data = await resp.json();

            if (!resp.ok) {
                if (resp.status === 403 && (data.error === 'Free unlock limit reached' || data.error === 'No unlocks remaining')) {
                    alert(`You've used all free unlocks and have no credits remaining. Buy credits or upgrade to Pro for unlimited access!`);
                } else {
                    alert(data.error || 'Failed to unlock. Please try again.');
                }
                return;
            }

            setFullPromptText(data.fullPrompt || '');
            setIsUnlocked(true);
            setUnlockCount(prev => prev + 1);
            
            // Trigger celebration dopamine hit
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#a855f7', '#3b82f6', '#22c55e', '#ffffff']
            });
            
        } catch (err) {
            console.error('Unlock failed:', err);
            alert('Failed to unlock. Please try again.');
        } finally {
            setUnlocking(false);
        }
    };

    const handleCopy = () => {
        if (fullPromptText) {
            navigator.clipboard.writeText(fullPromptText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Simply copy prompt to clipboard — let the native <a> tag handle the redirect
    // (Universal Links / App Links ONLY work on native taps, not JS redirects)
    const handleOpenInCopy = () => {
        if (fullPromptText) {
            navigator.clipboard.writeText(fullPromptText);
        }
    };

    const handleOpenLightbox = (url: string) => {
        let imgs: string[] = [];
        if (prompt?.images && prompt.images.length > 1) {
            imgs = prompt.images;
        } else if (prompt?.beforeImage && prompt?.afterImage) {
            if (!prompt.beforeImage.match(/\.(mp4|webm)$/i)) imgs.push(prompt.beforeImage);
            if (!prompt.afterImage.match(/\.(mp4|webm)$/i)) imgs.push(prompt.afterImage);
        } else if (prompt?.outputMedia && !prompt.outputMedia.match(/\.(mp4|webm)$/i)) {
            imgs.push(prompt.outputMedia);
        }
        
        if (imgs.length === 0) imgs = [url];
        
        const index = imgs.findIndex(img => img === url);
        setLightboxImages(imgs);
        setLightboxIndex(index >= 0 ? index : 0);
    };

    if (loading) {
        return (
            <section className="page-section">
                <div className="container text-center">
                    <div className="loading-spinner"></div>
                    <p className="text-muted mt-4">Loading prompt...</p>
                </div>
            </section>
        );
    }

    if (!prompt) {
        return (
            <section className="page-section">
                <div className="container text-center">
                    <h2>Prompt not found</h2>
                    <p className="text-muted mt-4">This prompt may have been removed or doesn't exist.</p>
                    <Link to="/" className="btn btn-outline mt-8">← Back to Factory</Link>
                </div>
            </section>
        );
    }

    const isVideo = prompt.promptType === 'video' || prompt.outputMediaType === 'video';
    const hasTutorial = !!prompt.tutorialVideo;
    const galleryImages = prompt.images && prompt.images.length > 1 ? prompt.images : null;

    // Format date
    const formattedDate = prompt.createdAt?.toDate
        ? prompt.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    return (
        <>
        <section className="page-section" style={{ paddingTop: 24, paddingBottom: 80 }}>
            <div className="container" style={{ maxWidth: 860 }}>

                {/* ══════════════════════════════════ */}
                {/*  TOP BAR                          */}
                {/* ══════════════════════════════════ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <Link to="/" className="back-link"><ArrowLeft size={16} /> Back</Link>
                    {user && (
                        <button className={`fav-btn-detail ${isFav ? 'active' : ''}`} onClick={toggleFav}>
                            <Heart size={16} fill={isFav ? '#ef4444' : 'none'} />
                            {isFav ? 'Saved' : 'Save'}
                        </button>
                    )}
                </div>

                {/* ══════════════════════════════════ */}
                {/*  HERO: FULL-WIDTH OUTPUT MEDIA    */}
                {/* ══════════════════════════════════ */}
                {galleryImages ? (
                    /* ── Multi-image gallery ── */
                    <div className="detail-hero-media" style={{ marginBottom: 32 }}>
                        <div className="prompt-gallery">
                            <div className="prompt-gallery-track" style={{ transform: `translateX(-${galleryIndex * 100}%)` }}>
                                {galleryImages.map((imgUrl, i) => (
                                    <div className="prompt-gallery-slide" key={i}>
                                        <img 
                                            src={imgUrl} 
                                            alt={`${prompt.title} - Example ${i + 1}`} 
                                            onClick={() => handleOpenLightbox(imgUrl)}
                                            style={{ cursor: 'zoom-in' }}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Navigation arrows */}
                            {galleryIndex > 0 && (
                                <button className="prompt-gallery-arrow left" onClick={() => setGalleryIndex(i => i - 1)} aria-label="Previous image">
                                    ‹
                                </button>
                            )}
                            {galleryIndex < galleryImages.length - 1 && (
                                <button className="prompt-gallery-arrow right" onClick={() => setGalleryIndex(i => i + 1)} aria-label="Next image">
                                    ›
                                </button>
                            )}

                            {/* Dot indicators */}
                            <div className="prompt-gallery-dots">
                                {galleryImages.map((_, i) => (
                                    <button
                                        key={i}
                                        className={`prompt-gallery-dot ${i === galleryIndex ? 'active' : ''}`}
                                        onClick={() => setGalleryIndex(i)}
                                        aria-label={`Go to image ${i + 1}`}
                                    />
                                ))}
                            </div>

                            {/* Counter badge */}
                            <div className="prompt-gallery-counter">
                                {galleryIndex + 1} / {galleryImages.length}
                            </div>
                        </div>
                    </div>
                ) : (prompt.beforeImage && prompt.afterImage) ? (
                    <div className="detail-hero-media" style={{ marginBottom: 32 }}>
                        <div className="comparison-columns">
                            <div className="comparison-col">
                                <div className="comparison-box" style={{ height: '100%' }}>
                                    <div className="comparison-label weak">Before</div>
                                    {prompt.beforeImage.includes('.mp4') || prompt.beforeImage.includes('.webm') ? (
                                        <video src={prompt.beforeImage} autoPlay loop muted playsInline className="comparison-image" />
                                    ) : (
                                        <img 
                                            src={prompt.beforeImage} 
                                            alt="Before" 
                                            className="comparison-image" 
                                            onClick={() => handleOpenLightbox(prompt.beforeImage!)}
                                            style={{ cursor: 'zoom-in' }}
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="comparison-col">
                                <div className="comparison-box after" style={{ height: '100%' }}>
                                    <div className="comparison-label strong">After</div>
                                    {prompt.afterImage.includes('.mp4') || prompt.afterImage.includes('.webm') ? (
                                        <video src={prompt.afterImage} autoPlay loop muted playsInline className="comparison-image" />
                                    ) : (
                                        <img 
                                            src={prompt.afterImage} 
                                            alt="After" 
                                            className="comparison-image" 
                                            onClick={() => handleOpenLightbox(prompt.afterImage!)}
                                            style={{ cursor: 'zoom-in' }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : prompt.outputMedia ? (
                    <div className="detail-hero-media" style={{ marginBottom: 32 }}>
                        {isVideo ? (
                            <video src={prompt.outputMedia}
                                controls playsInline loop
                                style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 20, display: 'block', margin: '0 auto' }}
                            />
                        ) : (
                            <img src={prompt.outputMedia} alt={prompt.title}
                                style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 20, display: 'block', margin: '0 auto', cursor: 'zoom-in' }}
                                onClick={() => handleOpenLightbox(prompt.outputMedia!)}
                            />
                        )}
                    </div>
                ) : null}

                {/* ══════════════════════════════════ */}
                {/*  TAGS + TITLE + DESCRIPTION       */}
                {/* ══════════════════════════════════ */}
                <div style={{ marginBottom: 28 }}>
                    {/* Tags & ID */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                        {prompt.shortCode && (
                            <span className="tag" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                                ID: {prompt.shortCode}
                            </span>
                        )}
                        {(Array.isArray(prompt.platform) ? prompt.platform : [prompt.platform]).map((plat: string) => (
                            <span key={plat} className="tag tag-platform" style={{ fontSize: '0.75rem' }}>{plat}</span>
                        ))}
                        <span className="tag" style={{ fontSize: '0.75rem' }}>{prompt.category}</span>
                        <span className="tag" style={{
                            fontSize: '0.75rem',
                            background: isVideo ? 'rgba(168,85,247,0.1)' : prompt.promptType === 'image' ? 'rgba(59,130,246,0.1)' : 'rgba(234,179,8,0.1)',
                            color: isVideo ? '#a855f7' : prompt.promptType === 'image' ? '#3b82f6' : '#eab308',
                        }}>
                            {isVideo ? <><Video size={10} /> Video</> : prompt.promptType === 'image' ? <><Image size={10} /> Image</> : <><FileText size={10} /> Text</>}
                        </span>
                    </div>

                    {/* Title */}
                    <h1 style={{
                        fontSize: 'clamp(1.6rem, 5vw, 2.6rem)',
                        fontWeight: 800,
                        lineHeight: 1.1,
                        letterSpacing: '-0.5px',
                        marginBottom: 12,
                    }}>
                        {prompt.title}
                    </h1>

                    {/* Description */}
                    <p style={{
                        fontSize: '1.05rem',
                        lineHeight: 1.6,
                        color: 'var(--text-muted)',
                        maxWidth: 600,
                        marginBottom: 0,
                    }}>
                        {prompt.problem}
                    </p>
                </div>

                {/* ══════════════════════════════════ */}
                {/*  STATS BAR (Social Proof)         */}
                {/* ══════════════════════════════════ */}
                <div className="detail-stats-bar">
                    {prompt.impressions ? (
                        <div className="detail-stat-pill">
                            <Eye size={14} />
                            <span className="detail-stat-value">{prompt.impressions.toLocaleString()}</span>
                            <span className="detail-stat-label">views</span>
                        </div>
                    ) : null}
                    {prompt.unlocks ? (
                        <div className="detail-stat-pill">
                            <Download size={14} />
                            <span className="detail-stat-value">{prompt.unlocks.toLocaleString()}</span>
                            <span className="detail-stat-label">downloads</span>
                        </div>
                    ) : null}
                    {prompt.likes ? (
                        <div className="detail-stat-pill">
                            <Heart size={14} style={{ color: '#ef4444' }} />
                            <span className="detail-stat-value">{prompt.likes.toLocaleString()}</span>
                            <span className="detail-stat-label">likes</span>
                        </div>
                    ) : null}
                    {formattedDate && (
                        <div className="detail-stat-pill">
                            <span className="detail-stat-label">Added {formattedDate}</span>
                        </div>
                    )}
                </div>

                {/* ══════════════════════════════════ */}
                {/*  WHAT YOU'LL GET (Feature List)    */}
                {/* ══════════════════════════════════ */}
                {!isUnlocked && (
                    <div className="detail-features">
                        <h3 className="detail-features-title">What You'll Get</h3>
                        <div className="detail-features-grid">
                            <div className="detail-feature-item">
                                <div className="detail-feature-icon"><Copy size={16} /></div>
                                <span>Copy-paste ready prompt formula</span>
                            </div>
                            {hasTutorial && (
                                <div className="detail-feature-item">
                                    <div className="detail-feature-icon"><Video size={16} /></div>
                                    <span>Step-by-step tutorial video</span>
                                </div>
                            )}
                            <div className="detail-feature-item">
                                <div className="detail-feature-icon"><Sparkles size={16} /></div>
                                <span>Works on {Array.isArray(prompt.platform) ? prompt.platform.join(', ') : prompt.platform}</span>
                            </div>
                            <div className="detail-feature-item">
                                <div className="detail-feature-icon"><Check size={16} /></div>
                                <span>Tested & verified results</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════ */}
                {/*  TUTORIAL VIDEO (if exists)        */}
                {/* ══════════════════════════════════ */}
                {hasTutorial && (
                    <div style={{ marginBottom: 40 }}>
                        <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: 16, fontWeight: 600 }}>Tutorial Video</h3>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <div className="detail-tutorial-reel">
                                <video
                                    src={prompt.tutorialVideo}
                                    controls playsInline
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 16 }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════ */}
                {/*  UNLOCK / PROMPT SECTION           */}
                {/* ══════════════════════════════════ */}
                {isUnlocked ? (
                    <div className="prompt-unlocked" style={{ marginBottom: 28 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 className="section-heading" style={{ marginBottom: 0 }}>
                                <FileText size={20} style={{ color: 'var(--accent-neon)' }} /> Full Prompt
                            </h2>
                            <button className="btn btn-outline btn-sm" onClick={handleCopy}>
                                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                            </button>
                        </div>
                        <pre className="prompt-text">{fullPromptText || 'Loading prompt...'}</pre>

                        {/* Quick Open in AI Platform Buttons */}
                        {fullPromptText && (
                            <div className="open-in-section">
                                <p className="open-in-label">Open prompt in</p>
                                <div className="open-in-buttons">
                                    <a
                                        href={`https://chatgpt.com/?q=${encodeURIComponent(fullPromptText)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="open-in-btn open-in-chatgpt"
                                        style={{ textDecoration: 'none' }}
                                        onClick={handleOpenInCopy}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>
                                        ChatGPT
                                        <ExternalLink size={12} />
                                    </a>
                                    <a
                                        href="https://gemini.google.com/app"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="open-in-btn open-in-gemini"
                                        style={{ textDecoration: 'none' }}
                                        onClick={handleOpenInCopy}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" fill="url(#gemini-grad)"/><defs><linearGradient id="gemini-grad" x1="0" y1="0" x2="24" y2="24"><stop stopColor="#4285F4"/><stop offset="1" stopColor="#A855F7"/></linearGradient></defs></svg>
                                        Gemini
                                        <ExternalLink size={12} />
                                    </a>
                                    <a
                                        href="https://claude.ai/new"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="open-in-btn open-in-claude"
                                        style={{ textDecoration: 'none' }}
                                        onClick={handleOpenInCopy}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4.709 15.955l4.397-2.664-.52-1.574L3.626 14.54c-.675.409-.9.855-.9 1.164 0 .165.048.294.139.394.18.197.523.248.882.164a2.6 2.6 0 0 0 .962-.307zm7.675-4.65L16.427 9.1c.675-.41.9-.855.9-1.164 0-.165-.048-.294-.139-.394-.18-.198-.523-.248-.882-.164a2.6 2.6 0 0 0-.962.307l-4.397 2.664.52 1.573zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/></svg>
                                        Claude
                                        <ExternalLink size={12} />
                                    </a>
                                    <a
                                        href="https://x.com/i/grok"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="open-in-btn open-in-grok"
                                        style={{ textDecoration: 'none' }}
                                        onClick={handleOpenInCopy}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                        Grok
                                        <ExternalLink size={12} />
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="prompt-locked-v2">
                        {/* Blurred teaser */}
                        <div className="prompt-teaser-blur">
                            <p>Create a hyper-realistic product photograph with soft studio lighting, shallow depth of field at f/2.8, placed on a marble surface with subtle reflections. Use a 85mm lens perspective with natural color grading...</p>
                        </div>
                        <div className="prompt-locked-overlay">
                            <div className="locked-icon-wrapper"><Lock size={28} /></div>
                            <h3>Unlock This Prompt</h3>
                            <p style={{
                                color: 'var(--text-muted)',
                                maxWidth: 420,
                                margin: '0 auto 24px',
                                fontSize: '0.95rem',
                                lineHeight: 1.5,
                            }}>
                                Get the exact prompt text, step-by-step instructions, and one-click copy.
                            </p>

                            {authLoading ? (
                                <div style={{ maxWidth: 400, margin: '0 auto', textAlign: 'center', padding: '20px' }}>
                                    <div className="loading-spinner mx-auto mb-4"></div>
                                    <p className="text-muted">Checking access...</p>
                                </div>
                            ) : !user ? (
                                <div style={{ maxWidth: 400, margin: '0 auto' }}>
                                    <button
                                        className="btn btn-primary btn-lg"
                                        onClick={loginWithGoogle}
                                        style={{
                                            width: '100%',
                                            padding: '16px 24px',
                                            fontSize: '1.05rem',
                                            fontWeight: 700,
                                            borderRadius: 14,
                                            boxShadow: '0 8px 32px rgba(168,85,247,0.35)',
                                        }}
                                    >
                                        Sign in with Google to Unlock
                                    </button>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 12, opacity: 0.7 }}>
                                        Free • No credit card required
                                    </p>
                                </div>
                            ) : (
                                <div className="unlock-options">
                                    {/* Unlock Button */}
                                    <button
                                        className="unlock-option unlock-free"
                                        onClick={handleUnlockFree}
                                        disabled={unlocking || (!hasFullAccess && unlockCount >= FREE_UNLOCK_LIMIT && credits <= 0)}
                                    >
                                        <div className="unlock-option-icon" style={{ background: hasFullAccess ? 'rgba(168,85,247,0.12)' : credits > 0 && unlockCount >= FREE_UNLOCK_LIMIT ? 'rgba(59,130,246,0.12)' : 'rgba(34,197,94,0.12)', color: hasFullAccess ? '#a855f7' : credits > 0 && unlockCount >= FREE_UNLOCK_LIMIT ? '#3b82f6' : '#22c55e' }}>
                                            {hasFullAccess ? <Sparkles size={22} /> : <Zap size={22} />}
                                        </div>
                                        <div className="unlock-option-info">
                                            <span className="unlock-option-title">
                                                {unlocking
                                                    ? 'Opening...'
                                                    : hasFullAccess
                                                        ? 'Reveal Prompt ✨'
                                                        : unlockCount >= FREE_UNLOCK_LIMIT && credits > 0
                                                            ? 'Use 1 Credit'
                                                            : unlockCount >= FREE_UNLOCK_LIMIT
                                                                ? 'No Unlocks Available'
                                                                : 'Unlock For Free'}
                                            </span>
                                            <span className="unlock-option-desc">
                                                {hasFullAccess
                                                    ? 'Tap to access with your Pro plan'
                                                    : unlockCount >= FREE_UNLOCK_LIMIT && credits > 0
                                                        ? `${credits} credit${credits !== 1 ? 's' : ''} remaining`
                                                        : unlockCount >= FREE_UNLOCK_LIMIT
                                                            ? 'Buy credits or upgrade to Pro'
                                                            : `${unlockCount} of ${FREE_UNLOCK_LIMIT} free unlocks used`}
                                            </span>
                                        </div>
                                    </button>

                                    {/* Subscribe — show for free users */}
                                    {isFree && (
                                        <>
                                            {unlockCount >= FREE_UNLOCK_LIMIT && credits <= 0 && (
                                                <Link to="/pricing" className="unlock-option">
                                                    <div className="unlock-option-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                                                        <Zap size={22} />
                                                    </div>
                                                    <div className="unlock-option-info">
                                                        <span className="unlock-option-title">Buy Prompt Credits — from $3</span>
                                                        <span className="unlock-option-desc">One-time purchase, never expires</span>
                                                    </div>
                                                </Link>
                                            )}
                                            <Link to="/pricing" className="unlock-option">
                                                <div className="unlock-option-icon" style={{ background: 'rgba(234,179,8,0.12)', color: '#eab308' }}>
                                                    <Crown size={22} />
                                                </div>
                                                <div className="unlock-option-info">
                                                    <span className="unlock-option-title">Upgrade to Pro — from $8/mo</span>
                                                    <span className="unlock-option-desc">Unlimited access to all prompts</span>
                                                </div>
                                            </Link>
                                        </>
                                    )}
                                </div>
                            )}

                            <p className="detail-trust-badge">✓ Joined by 500+ creators</p>
                        </div>
                    </div>
                )}

            </div>

            {/* Related prompts — full width */}
            <RelatedPrompts category={prompt.category} currentPromptId={prompt.id!} />
        </section>

        {/* ══════════════════════════════════ */}
        {/*  STICKY MOBILE UNLOCK CTA         */}
        {/* ══════════════════════════════════ */}
        {!isUnlocked && (
            <div className="sticky-unlock-bar">
                {!user ? (
                    <button className="btn btn-primary" onClick={loginWithGoogle} style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700, borderRadius: 12 }}>
                        🔓 Sign in to Unlock — Free
                    </button>
                ) : (
                    <button className="btn btn-primary" onClick={handleUnlockFree} disabled={unlocking || (!hasFullAccess && unlockCount >= FREE_UNLOCK_LIMIT && credits <= 0)} style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700, borderRadius: 12 }}>
                        {unlocking
                            ? '⏳ Unlocking...'
                            : unlockCount >= FREE_UNLOCK_LIMIT && credits > 0
                                ? `🔓 Use 1 Credit (${credits} left)`
                                : unlockCount >= FREE_UNLOCK_LIMIT
                                    ? '🛒 Buy Credits to Unlock'
                                    : '🔓 Unlock This Prompt — Free'}
                    </button>
                )}
            </div>
        )}

        {/* FULLSCREEN IMAGE LIGHTBOX */}
        {lightboxImages.length > 0 && (
            <div 
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.95)',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'zoom-out',
                    backdropFilter: 'blur(8px)'
                }}
                onClick={() => setLightboxImages([])}
            >
                <button 
                    style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', borderRadius: '50%', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', zIndex: 2 }}
                    onClick={(e) => { e.stopPropagation(); setLightboxImages([]); }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                >
                    <X size={24} />
                </button>

                {lightboxImages.length > 1 && (
                    <button 
                        style={{ position: 'absolute', left: 24, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', zIndex: 2, fontSize: '1.5rem', fontWeight: 'bold' }}
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setLightboxIndex(prev => prev === 0 ? lightboxImages.length - 1 : prev - 1); 
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                    >
                        ‹
                    </button>
                )}

                {lightboxImages.length > 1 && (
                    <button 
                        style={{ position: 'absolute', right: 24, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', zIndex: 2, fontSize: '1.5rem', fontWeight: 'bold' }}
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setLightboxIndex(prev => prev === lightboxImages.length - 1 ? 0 : prev + 1); 
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                    >
                        ›
                    </button>
                )}

                <img 
                    src={lightboxImages[lightboxIndex]} 
                    alt="Fullscreen view" 
                    style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
                    onClick={(e) => e.stopPropagation()}
                />

                {lightboxImages.length > 1 && (
                    <div style={{ position: 'absolute', bottom: 24, background: 'rgba(0,0,0,0.5)', padding: '6px 16px', borderRadius: 20, color: 'white', fontSize: '0.9rem', fontWeight: 600 }}>
                        {lightboxIndex + 1} / {lightboxImages.length}
                    </div>
                )}
            </div>
        )}
        </>
    );
};

export default PromptDetailPage;

