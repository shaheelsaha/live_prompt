import { useEffect, useState, useRef } from 'react';
import {
    collection, getDocs, query, orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, ADMIN_EMAIL } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import type { Prompt } from '../types/Prompt';
import {
    Plus, Save, Trash2, Edit3, X, Image, Upload, Eye,
    ArrowLeft, Sparkles, AlertTriangle, ShieldOff, Video, FileText,
    Users, Crown, DollarSign, TrendingUp, Download, BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { compressImage } from '../utils/imageCompression';

const CATEGORIES = [
    'Product & E-commerce', 'Real Estate & Interior', 'Fashion & Beauty',
    'Food & Restaurant', 'Sports & Fitness', 'Travel & Nature',
    'Portrait & Headshot', 'Automotive', 'Animation & Cartoon',
    'Logo & Branding', 'Social Media Content', 'Film & Cinematic',
    'Music & Entertainment', 'Education & Explainer', 'Gaming & Sci-Fi', 'Other'
];

const PLATFORMS = [
    'Midjourney', 'DALL-E', 'Sora', 'Veo', 'Nano banana',
    'Runway', 'Stable Diffusion', 'ChatGPT', 'Claude', 'Other'
];

interface PromptForm {
    title: string;
    category: string;
    platform: string;
    problem: string;
    before: string;
    after: string;
    fullPrompt: string;
    instructions: string;
    tutorialLink: string;
    price: number;
    impressions: number;
    likes: number;
    promptType: 'text' | 'image' | 'video';
    beforeImage: string;
    beforeImageThumb: string;
    afterImage: string;
    afterImageThumb: string;
    outputMedia: string;
    outputMediaThumb: string;
    outputMediaType: 'image' | 'video';
    tutorialVideo: string;
}

const emptyForm: PromptForm = {
    title: '', category: CATEGORIES[0], platform: PLATFORMS[0],
    problem: '', before: '', after: '', fullPrompt: '', instructions: '',
    tutorialLink: '', price: 3, impressions: 0, likes: 0,
    promptType: 'image', beforeImage: '', beforeImageThumb: '', 
    afterImage: '', afterImageThumb: '',
    outputMedia: '', outputMediaThumb: '', outputMediaType: 'image', tutorialVideo: ''
};

interface DashboardStats {
    totalUsers: number;
    activeSubscribers: number;
    totalPrompts: number;
    totalUnlocks: number;
    creditsBought: number;
    creditsSpent: number;
    totalRevenueCents: number;
}

const AdminPage = () => {
    const { user } = useAuth();
    const FUNCTIONS_BASE = 'https://us-central1-prompt-factory-952f9.cloudfunctions.net';
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [form, setForm] = useState<PromptForm>(emptyForm);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<'before' | 'after' | 'output' | 'tutorial' | null>(null);
    const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const beforeFileRef = useRef<HTMLInputElement>(null);
    const afterFileRef = useRef<HTMLInputElement>(null);
    const outputFileRef = useRef<HTMLInputElement>(null);
    const tutorialFileRef = useRef<HTMLInputElement>(null);

    // Load prompts + dashboard stats
    useEffect(() => {
        fetchPrompts();
        fetchDashboardStats();
    }, [user]);

    const fetchPrompts = async () => {
        try {
            const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            setPrompts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Prompt)));
        } catch (err) {
            console.error('Error fetching prompts:', err);
        }
    };

    const fetchDashboardStats = async () => {
        if (!user) return;
        setStatsLoading(true);
        try {
            const idToken = await user.getIdToken();
            const resp = await fetch(`${FUNCTIONS_BASE}/getAdminDashboardStats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
            });
            if (resp.ok) {
                const data = await resp.json();
                setDashStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard stats:', err);
        } finally {
            setStatsLoading(false);
        }
    };

    // Compute category breakdown from loaded prompts
    const categoryBreakdown = prompts.reduce<Record<string, number>>((acc, p) => {
        const cat = p.category || 'Other';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});
    const sortedCategories = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]);

    // Upload file to Firebase Storage
    const handleFileUpload = async (file: File, type: 'before' | 'after' | 'output' | 'tutorial') => {
        setUploading(type);
        try {
            if (type === 'output' && file.type.startsWith('video/')) {
                const filename = `prompts/${Date.now()}_${type}_${file.name}`;
                const storageRef = ref(storage, filename);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);

                setForm(prev => ({
                    ...prev,
                    outputMedia: url,
                    outputMediaThumb: url, // For videos, we use the same URL
                    outputMediaType: 'video',
                }));
            } else if (type === 'tutorial') {
                const filename = `prompts/${Date.now()}_${type}_${file.name}`;
                const storageRef = ref(storage, filename);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);

                setForm(prev => ({
                    ...prev,
                    tutorialVideo: url,
                }));
            } else {
                // Image compression logic: Generate HQ (1920) and Thumbnail (600)
                const hqFile = await compressImage(file, 1920, 0.8);
                const thumbFile = await compressImage(file, 600, 0.7);

                const hqFilename = `prompts/${Date.now()}_hq_${type}_${hqFile.name}`;
                const thumbFilename = `prompts/${Date.now()}_thumb_${type}_${thumbFile.name}`;

                const hqRef = ref(storage, hqFilename);
                const thumbRef = ref(storage, thumbFilename);

                await Promise.all([
                    uploadBytes(hqRef, hqFile),
                    uploadBytes(thumbRef, thumbFile)
                ]);

                const hqUrl = await getDownloadURL(hqRef);
                const thumbUrl = await getDownloadURL(thumbRef);

                if (type === 'output') {
                    setForm(prev => ({
                        ...prev,
                        outputMedia: hqUrl,
                        outputMediaThumb: thumbUrl,
                        outputMediaType: 'image',
                    }));
                } else if (type === 'before') {
                    setForm(prev => ({
                        ...prev,
                        beforeImage: hqUrl,
                        beforeImageThumb: thumbUrl,
                    }));
                } else if (type === 'after') {
                    setForm(prev => ({
                        ...prev,
                        afterImage: hqUrl,
                        afterImageThumb: thumbUrl,
                    }));
                }
            }
        } catch (err) {
            console.error('Upload failed:', err);
            alert('File upload failed. Make sure Firebase Storage is enabled.');
        } finally {
            setUploading(null);
        }
    };

    // Save prompt (add or update)
    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const handleSave = async () => {
        if (!form.title.trim()) {
            alert('Please fill in at least the Title field.');
            return;
        }

        setSaving(true);
        try {
            const slug = generateSlug(form.title);
            const data = {
                ...form,
                slug,
                price: Number(form.price),
                impressions: Number(form.impressions),
                likes: Number(form.likes),
            };

            const idToken = await user!.getIdToken();

            if (editingId) {
                await fetch(`${FUNCTIONS_BASE}/adminWritePrompt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken, action: 'update', promptId: editingId, data }),
                });
            } else {
                await fetch(`${FUNCTIONS_BASE}/adminWritePrompt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken, action: 'create', data }),
                });
            }
            await fetchPrompts();
            resetForm();
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failed to save. Check permissions.');
        } finally {
            setSaving(false);
        }
    };

    // Delete prompt
    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this prompt?')) return;
        try {
            const idToken = await user!.getIdToken();
            await fetch(`${FUNCTIONS_BASE}/adminWritePrompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, action: 'delete', promptId: id }),
            });
            await fetchPrompts();
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete. Check permissions.');
        }
    };

    // Edit prompt
    const handleEdit = (prompt: Prompt) => {
        setForm({
            title: prompt.title,
            category: prompt.category,
            platform: prompt.platform,
            problem: prompt.problem,
            before: prompt.before || '',
            after: prompt.after || '',
            fullPrompt: prompt.fullPrompt || '',
            instructions: prompt.instructions || '',
            tutorialLink: prompt.tutorialLink || '',
            price: prompt.price,
            impressions: prompt.impressions || 0,
            likes: prompt.likes || 0,
            promptType: prompt.promptType || 'image',
            beforeImage: prompt.beforeImage || '',
            beforeImageThumb: prompt.beforeImageThumb || '',
            afterImage: prompt.afterImage || '',
            afterImageThumb: prompt.afterImageThumb || '',
            outputMedia: prompt.outputMedia || '',
            outputMediaThumb: prompt.outputMediaThumb || '',
            outputMediaType: prompt.outputMediaType || 'image',
            tutorialVideo: prompt.tutorialVideo || '',
        });
        setEditingId(prompt.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowForm(false);
    };

    // Not signed in
    if (!user) {
        return (
            <section className="page-section">
                <div className="container text-center">
                    <AlertTriangle size={48} style={{ color: 'var(--accent-neon)' }} />
                    <h2 className="mt-4">Admin Access Required</h2>
                    <p className="text-muted mt-4">Please sign in with Google to access the admin panel.</p>
                    <Link to="/" className="btn btn-outline mt-8">← Back to Home</Link>
                </div>
            </section>
        );
    }

    // Signed in but not admin
    if (ADMIN_EMAIL && user.email !== ADMIN_EMAIL) {
        return (
            <section className="page-section">
                <div className="container text-center">
                    <ShieldOff size={48} style={{ color: '#ef4444' }} />
                    <h2 className="mt-4">Access Denied</h2>
                    <p className="text-muted mt-4">You do not have admin privileges. This panel is restricted.</p>
                    <Link to="/" className="btn btn-outline mt-8">← Back to Home</Link>
                </div>
            </section>
        );
    }

    return (
        <section className="page-section">
            <div className="container" style={{ maxWidth: 960 }}>
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to Factory</Link>
                        <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Sparkles size={24} style={{ color: 'var(--accent-neon)' }} /> Admin Panel
                        </h1>
                        <p className="text-muted">Add, edit, and manage your AI prompts.</p>
                    </div>
                    {!showForm && (
                        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                            <Plus size={16} /> Add New Prompt
                        </button>
                    )}
                </div>

                {/* ══════════════════════════════════ */}
                {/*  DASHBOARD INSIGHTS               */}
                {/* ══════════════════════════════════ */}
                <div style={{
                    marginBottom: 32,
                    padding: 24,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 16,
                }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BarChart3 size={18} style={{ color: 'var(--accent-neon)' }} /> Dashboard Insights
                    </h2>

                    {/* KPI Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: 12,
                        marginBottom: 24,
                    }}>
                        {/* Total Users */}
                        <div style={{
                            background: 'rgba(59,130,246,0.06)',
                            border: '1px solid rgba(59,130,246,0.15)',
                            borderRadius: 12,
                            padding: '16px 14px',
                            textAlign: 'center',
                        }}>
                            <Users size={20} style={{ color: '#3b82f6', marginBottom: 6 }} />
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                                {statsLoading ? '—' : dashStats?.totalUsers ?? 0}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Total Users</div>
                        </div>

                        {/* Active Subscribers */}
                        <div style={{
                            background: 'rgba(168,85,247,0.06)',
                            border: '1px solid rgba(168,85,247,0.15)',
                            borderRadius: 12,
                            padding: '16px 14px',
                            textAlign: 'center',
                        }}>
                            <Crown size={20} style={{ color: '#a855f7', marginBottom: 6 }} />
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                                {statsLoading ? '—' : dashStats?.activeSubscribers ?? 0}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Pro Subscribers</div>
                        </div>

                        {/* Revenue */}
                        <div style={{
                            background: 'rgba(34,197,94,0.06)',
                            border: '1px solid rgba(34,197,94,0.15)',
                            borderRadius: 12,
                            padding: '16px 14px',
                            textAlign: 'center',
                        }}>
                            <DollarSign size={20} style={{ color: '#22c55e', marginBottom: 6 }} />
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                                {statsLoading ? '—' : `$${((dashStats?.totalRevenueCents ?? 0) / 100).toFixed(2)}`}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Total Revenue</div>
                        </div>

                        {/* Total Unlocks */}
                        <div style={{
                            background: 'rgba(234,179,8,0.06)',
                            border: '1px solid rgba(234,179,8,0.15)',
                            borderRadius: 12,
                            padding: '16px 14px',
                            textAlign: 'center',
                        }}>
                            <Download size={20} style={{ color: '#eab308', marginBottom: 6 }} />
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                                {statsLoading ? '—' : dashStats?.totalUnlocks ?? 0}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Prompt Unlocks</div>
                        </div>

                        {/* Credits Bought */}
                        <div style={{
                            background: 'rgba(14,165,233,0.06)',
                            border: '1px solid rgba(14,165,233,0.15)',
                            borderRadius: 12,
                            padding: '16px 14px',
                            textAlign: 'center',
                        }}>
                            <TrendingUp size={20} style={{ color: '#0ea5e9', marginBottom: 6 }} />
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                                {statsLoading ? '—' : dashStats?.creditsBought ?? 0}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Credits Bought</div>
                        </div>

                        {/* Credits Spent */}
                        <div style={{
                            background: 'rgba(239,68,68,0.06)',
                            border: '1px solid rgba(239,68,68,0.15)',
                            borderRadius: 12,
                            padding: '16px 14px',
                            textAlign: 'center',
                        }}>
                            <Sparkles size={20} style={{ color: '#ef4444', marginBottom: 6 }} />
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                                {statsLoading ? '—' : dashStats?.creditsSpent ?? 0}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Credits Spent</div>
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    {sortedCategories.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Prompts by Category
                            </h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {sortedCategories.map(([cat, count]) => (
                                    <span
                                        key={cat}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '6px 12px',
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: 8,
                                            fontSize: '0.8rem',
                                            color: '#ccc',
                                        }}
                                    >
                                        {cat}
                                        <span style={{
                                            background: 'rgba(168,85,247,0.15)',
                                            color: '#a855f7',
                                            padding: '2px 7px',
                                            borderRadius: 6,
                                            fontWeight: 700,
                                            fontSize: '0.75rem',
                                        }}>{count}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ADD / EDIT FORM */}
                {showForm && (
                    <div className="admin-form-wrapper">
                        <div className="flex justify-between items-center mb-4">
                            <h2 style={{ fontSize: '1.3rem' }}>
                                {editingId ? '✏️ Edit Prompt' : '➕ Add New Prompt'}
                            </h2>
                            <button className="btn btn-outline btn-sm" onClick={resetForm}>
                                <X size={14} /> Cancel
                            </button>
                        </div>

                        <div className="admin-form">
                            {/* Row: Title */}
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g., Cinematic Portrait — Midjourney V6"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            {/* Row: Category + Platform + Type */}
                            <div className="form-row-3">
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">AI Tool</label>
                                    <select className="form-input" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                                        {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Output Type</label>
                                    <select className="form-input" value={form.promptType} onChange={e => setForm({ ...form, promptType: e.target.value as 'text' | 'image' | 'video' })}>
                                        <option value="image">🖼️ Image</option>
                                        <option value="video">🎬 Video</option>
                                        <option value="text">📝 Text</option>
                                    </select>
                                </div>
                            </div>

                            {/* Problem / Description */}
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <input
                                    className="form-input"
                                    placeholder="What does this prompt create? e.g., Photorealistic cinematic portrait with dramatic lighting"
                                    value={form.problem}
                                    onChange={e => setForm({ ...form, problem: e.target.value })}
                                />
                            </div>

                            {/* OUTPUT MEDIA — the AI-generated result */}
                            <div className="form-group">
                                <label className="form-label">
                                    {form.promptType === 'video' ? <><Video size={14} /> Output Video Preview</> : <><Image size={14} /> Output Image Preview</>}
                                </label>
                                <input ref={outputFileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }}
                                    onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'output')} />
                                {form.outputMedia ? (
                                    <div className="image-preview">
                                        {form.outputMediaType === 'video' ? (
                                            <video src={form.outputMedia} controls style={{ maxWidth: '100%', borderRadius: 8 }} />
                                        ) : (
                                            <img src={form.outputMedia} alt="Output" />
                                        )}
                                        <button className="btn btn-outline btn-sm" onClick={() => setForm({ ...form, outputMedia: '', outputMediaType: 'image' })}>Remove</button>
                                    </div>
                                ) : (
                                    <button className="btn btn-outline w-full" onClick={() => outputFileRef.current?.click()} disabled={uploading === 'output'}>
                                        <Upload size={14} /> {uploading === 'output' ? 'Uploading...' : 'Upload Output Preview (Image or Video)'}
                                    </button>
                                )}
                            </div>

                            {/* Before / After Images (side-by-side comparison) */}
                            <div className="form-row-2">
                                <div className="form-group">
                                    <label className="form-label"><Image size={14} /> Before Image (optional)</label>
                                    <input ref={beforeFileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }}
                                        onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'before')} />
                                    {form.beforeImage ? (
                                        <div className="image-preview">
                                            <img src={form.beforeImage} alt="Before" />
                                            <button className="btn btn-outline btn-sm" onClick={() => setForm({ ...form, beforeImage: '' })}>Remove</button>
                                        </div>
                                    ) : (
                                        <button className="btn btn-outline w-full" onClick={() => beforeFileRef.current?.click()} disabled={uploading === 'before'}>
                                            <Upload size={14} /> {uploading === 'before' ? 'Uploading...' : 'Upload Before'}
                                        </button>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label"><Image size={14} /> After Image (optional)</label>
                                    <input ref={afterFileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }}
                                        onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'after')} />
                                    {form.afterImage ? (
                                        <div className="image-preview">
                                            <img src={form.afterImage} alt="After" />
                                            <button className="btn btn-outline btn-sm" onClick={() => setForm({ ...form, afterImage: '' })}>Remove</button>
                                        </div>
                                    ) : (
                                        <button className="btn btn-outline w-full" onClick={() => afterFileRef.current?.click()} disabled={uploading === 'after'}>
                                            <Upload size={14} /> {uploading === 'after' ? 'Uploading...' : 'Upload After'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Full Prompt */}
                            <div className="form-group">
                                <label className="form-label"><FileText size={14} /> Full Prompt (the exact text users will copy)</label>
                                <textarea
                                    className="form-input form-textarea"
                                    placeholder="The exact prompt text to paste into the AI tool..."
                                    value={form.fullPrompt}
                                    onChange={e => setForm({ ...form, fullPrompt: e.target.value })}
                                    rows={6}
                                />
                            </div>


                            {/* Tutorial Video Upload */}
                            <div className="form-group">
                                <label className="form-label"><Video size={14} /> Tutorial Video (The TikTok/Reels clip)</label>
                                <input ref={tutorialFileRef} type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display: 'none' }}
                                    onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'tutorial')} />
                                {form.tutorialVideo ? (
                                    <div className="image-preview">
                                        <video src={form.tutorialVideo} controls style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 200 }} />
                                        <button className="btn btn-outline btn-sm" onClick={() => setForm({ ...form, tutorialVideo: '' })}>Remove</button>
                                    </div>
                                ) : (
                                    <button className="btn btn-outline w-full" onClick={() => tutorialFileRef.current?.click()} disabled={uploading === 'tutorial'}>
                                        <Upload size={14} /> {uploading === 'tutorial' ? 'Uploading...' : 'Upload Looping Reel (.mp4)'}
                                    </button>
                                )}
                            </div>

                            {/* Stats Row */}
                            <div className="form-row-2">
                                <div className="form-group">
                                    <label className="form-label">Views</label>
                                    <input type="number" className="form-input" value={form.impressions}
                                        onChange={e => setForm({ ...form, impressions: Number(e.target.value) })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Likes</label>
                                    <input type="number" className="form-input" value={form.likes}
                                        onChange={e => setForm({ ...form, likes: Number(e.target.value) })} />
                                </div>
                            </div>

                            {/* Save */}
                            <button className="btn btn-primary w-full" onClick={handleSave} disabled={saving}
                                style={{ padding: '14px', fontSize: '1rem' }}>
                                {saving ? 'Saving...' : <><Save size={16} /> {editingId ? 'Update Prompt' : 'Add Prompt'}</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* PROMPT LIST */}
                <div className="admin-list">
                    <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>
                        Your Prompts ({prompts.length})
                    </h2>

                    {prompts.length === 0 ? (
                        <div className="empty-state" style={{ padding: '48px 0' }}>
                            <p className="text-muted">No prompts yet. Click "Add New Prompt" to get started!</p>
                        </div>
                    ) : (
                        prompts.map(prompt => (
                            <div key={prompt.id} className="admin-prompt-row">
                                <div className="admin-prompt-info">
                                    <div className="flex gap-2 items-center" style={{ marginBottom: 6, flexWrap: 'wrap' }}>
                                        <span className="tag">{prompt.category}</span>
                                        <span className="tag tag-platform">{prompt.platform}</span>
                                        <span className="tag" style={{
                                            background: prompt.promptType === 'video' ? 'rgba(168,85,247,0.1)' : prompt.promptType === 'image' ? 'rgba(59,130,246,0.1)' : 'rgba(234,179,8,0.1)',
                                            color: prompt.promptType === 'video' ? '#a855f7' : prompt.promptType === 'image' ? '#3b82f6' : '#eab308',
                                        }}>
                                            {prompt.promptType === 'video' ? <><Video size={10} /> Video</> : prompt.promptType === 'image' ? <><Image size={10} /> Image</> : <><FileText size={10} /> Text</>}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{prompt.title}</h3>
                                    <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>{prompt.problem}</p>
                                </div>
                                <div className="admin-prompt-actions">
                                    <Link to={`/prompt/${prompt.slug || prompt.id}`} className="btn btn-outline btn-sm">
                                        <Eye size={14} /> View
                                    </Link>
                                    <button className="btn btn-outline btn-sm" onClick={() => handleEdit(prompt)}>
                                        <Edit3 size={14} /> Edit
                                    </button>
                                    <button className="btn btn-outline btn-sm" onClick={() => handleDelete(prompt.id)}
                                        style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
};

export default AdminPage;
