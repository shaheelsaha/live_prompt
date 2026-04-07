import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { collection, getDocs, doc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import PromptCard from '../components/PromptCard';
import type { Prompt } from '../types/Prompt';
import { Heart, Unlock, Bookmark, ArrowLeft, Sparkles, Zap, Crown, Settings, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

type Tab = 'favorites' | 'unlocked' | 'settings';

const DashboardPage = () => {
    const { user, loading: authLoading, loginWithGoogle, hasFullAccess, credits, subscriptionData } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('unlocked');
    const [favorites, setFavorites] = useState<Prompt[]>([]);
    const [unlocked, setUnlocked] = useState<Prompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (!user) return;
        fetchUserData();

        // Check for upgraded=true param
        if (searchParams.get('upgraded') === 'true') {
            setShowSuccess(true);
            triggerConfetti();
            // Clean up the URL
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('upgraded');
            setSearchParams(newParams, { replace: true });
        }

        // Check for credits_added=true param
        if (searchParams.get('credits_added') === 'true') {
            setShowSuccess(true);
            triggerConfetti();
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('credits_added');
            setSearchParams(newParams, { replace: true });
        }
    }, [user, searchParams, setSearchParams]);

    const triggerConfetti = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    interface Transaction {
        id: string;
        amount: number;
        currency: string;
        description: string;
        timestamp: any;
    }
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    const fetchUserData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch favorites
            const favSnap = await getDocs(collection(db, 'users', user.uid, 'favorites'));
            const favIds = favSnap.docs.map(d => d.id);

            // Fetch unlocked
            const unlockSnap = await getDocs(collection(db, 'users', user.uid, 'unlocked'));
            const unlockIds = unlockSnap.docs.map(d => d.id);

            // Fetch transactions
            const txQuery = query(collection(db, 'users', user.uid, 'transactions'), orderBy('timestamp', 'desc'));
            const txSnap = await getDocs(txQuery);
            const txData = txSnap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
            setTransactions(txData);

            // Fetch actual prompt data
            const allIds = [...new Set([...favIds, ...unlockIds])];
            const promptsMap: Record<string, Prompt> = {};

            for (const id of allIds) {
                const promptDoc = await getDoc(doc(db, 'prompts', id));
                if (promptDoc.exists()) {
                    promptsMap[id] = { id: promptDoc.id, ...promptDoc.data() } as Prompt;
                }
            }

            setFavorites(favIds.filter(id => promptsMap[id]).map(id => promptsMap[id]));
            setUnlocked(unlockIds.filter(id => promptsMap[id]).map(id => promptsMap[id]));
        } catch (err) {
            console.error('Error fetching user data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <section className="page-section">
                <div className="container text-center py-20">
                    <div className="loading-spinner mx-auto mb-4"></div>
                    <p className="text-muted">Loading...</p>
                </div>
            </section>
        );
    }

    if (!user) {
        return (
            <section className="page-section">
                <div className="container text-center">
                    <Bookmark size={48} style={{ color: 'var(--accent-neon)' }} />
                    <h2 className="mt-4">Sign in to view your prompts</h2>
                    <p className="text-muted mt-4">Save your favorite prompts and access unlocked ones — all in one place.</p>
                    <button className="btn btn-primary mt-8" onClick={loginWithGoogle}>
                        Sign in with Google
                    </button>
                </div>
            </section>
        );
    }

    const currentList = activeTab === 'favorites' ? favorites : unlocked;

    return (
        <section className="page-section">
            <div className="container">
                <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to Factory</Link>

                <div className="dashboard-header">
                    <div className="flex items-center gap-4" style={{ marginBottom: 8 }}>
                        {user.photoURL && <img src={user.photoURL} alt="" className="dashboard-avatar" />}
                        <div>
                            <h1 style={{ fontSize: '2rem' }}>My Prompts</h1>
                            <p className="text-muted">Welcome back, {user.displayName?.split(' ')[0]}!</p>
                        </div>
                    </div>

                    {/* Tier Badge */}
                    <div className="credits-badge" style={{
                        background: hasFullAccess ? 'rgba(168,85,247,0.08)' : undefined,
                        borderColor: hasFullAccess ? 'rgba(168,85,247,0.25)' : undefined,
                        color: hasFullAccess ? '#a855f7' : undefined,
                    }}>
                        {hasFullAccess ? <Crown size={16} /> : <Zap size={16} />}
                        <span>
                            {hasFullAccess
                                ? <><strong>Pro</strong> — Unlimited access</>
                                : credits > 0
                                    ? <><strong>{unlocked.length}</strong> of 5 free unlocks used · <strong>{credits}</strong> credit{credits !== 1 ? 's' : ''} available</>
                                    : <><strong>{unlocked.length}</strong> of 5 free unlocks used</>}
                        </span>
                    </div>
                </div>

                {/* Success Message After Upgrade */}
                {showSuccess && (
                  <div className="upgrade-success-banner" style={{
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(139,92,246,0.05) 100%)',
                    border: '1px solid rgba(168,85,247,0.2)',
                    borderRadius: 16,
                    padding: '24px 32px',
                    marginBottom: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ 
                        background: '#a855f7', 
                        color: 'white', 
                        borderRadius: '50%', 
                        width: 48, 
                        height: 48, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(168,85,247,0.4)'
                      }}>
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '1.4rem', marginBottom: 4, color: '#fff' }}>Welcome to Pro! 🚀</h2>
                        <p className="text-muted" style={{ marginBottom: 0 }}>Your subscription is now active. Enjoy unlimited access to everything.</p>
                      </div>
                    </div>
                    <button 
                      className="btn btn-outline btn-sm" 
                      onClick={() => setShowSuccess(false)}
                      style={{ border: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Tabs */}
                <div className="dashboard-tabs">
                    <button
                        className={`dashboard-tab ${activeTab === 'unlocked' ? 'active' : ''}`}
                        onClick={() => setActiveTab('unlocked')}
                    >
                        <Unlock size={16} /> Unlocked
                        <span className="tab-count">{unlocked.length}</span>
                    </button>
                    <button
                        className={`dashboard-tab ${activeTab === 'favorites' ? 'active' : ''}`}
                        onClick={() => setActiveTab('favorites')}
                    >
                        <Heart size={16} /> Favorites
                        <span className="tab-count">{favorites.length}</span>
                    </button>
                    <button
                        className={`dashboard-tab ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        <Settings size={16} /> Profile Settings
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="empty-state">
                        <div className="loading-spinner"></div>
                        <p className="text-muted mt-4">Loading your prompts...</p>
                    </div>
                ) : activeTab === 'settings' ? (
                    <div className="settings-panel">
                        <div className="settings-card" style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 16, border: '1px solid var(--border-color)', marginBottom: 24 }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Profile Details</h3>
                            <div className="text-muted">
                                <p style={{ marginBottom: 12 }}><strong>Email:</strong> {user.email}</p>
                                
                                {isEditingName ? (
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                        <strong>Name:</strong>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            value={newName} 
                                            onChange={e => setNewName(e.target.value)} 
                                            style={{ padding: '4px 8px', fontSize: '0.9rem', width: '200px' }}
                                        />
                                        <button className="btn btn-primary btn-sm" onClick={async () => {
                                            const { updateProfile } = await import('firebase/auth');
                                            try {
                                                await updateProfile(user, { displayName: newName });
                                                setIsEditingName(false);
                                                window.location.reload(); // Quick refresh to update full context
                                            } catch (err) {
                                                console.error(err);
                                                alert("Failed to update name.");
                                            }
                                        }}>Save</button>
                                        <button className="btn btn-outline btn-sm" onClick={() => setIsEditingName(false)}>Cancel</button>
                                    </div>
                                ) : (
                                    <p style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <strong>Name:</strong> {user.displayName || 'Not provided'}
                                        <button 
                                            onClick={() => {
                                                setNewName(user.displayName || '');
                                                setIsEditingName(true);
                                            }} 
                                            style={{ background: 'none', border: 'none', color: 'var(--accent-neon)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            Edit
                                        </button>
                                    </p>
                                )}
                            </div>

                            {user.providerData.some(p => p.providerId === 'password') && (
                                <div style={{ marginTop: 24 }}>
                                    <button 
                                        className="btn btn-outline btn-sm"
                                        onClick={async () => {
                                            const { sendPasswordResetEmail } = await import('firebase/auth');
                                            const { auth } = await import('../firebase/config');
                                            try {
                                                if (user?.email) {
                                                    const actionCodeSettings = {
                                                        url: `${window.location.origin}/login`,
                                                        handleCodeInApp: false,
                                                    };
                                                    await sendPasswordResetEmail(auth, user.email, actionCodeSettings);
                                                    alert("Password reset email sent! Check your inbox.");
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                alert("Error sending reset email.");
                                            }
                                        }}
                                    >
                                        Change Password (Send Email)
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="settings-card" style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 16, border: '1px solid var(--border-color)', marginBottom: 24 }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>Credits & Usage</h3>
                            <p className="text-muted" style={{ marginBottom: 24 }}>View your available prompt unlocks and credit balance.</p>

                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                                {/* Free Unlocks Row */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <Zap size={16} color="#22c55e" />
                                            <span style={{ fontWeight: 600 }}>Free Unlocks</span>
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.85rem' }}>Basic limit for new users</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        {hasFullAccess ? (
                                            <span style={{ fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '4px 10px', borderRadius: 12, fontSize: '0.85rem' }}>Unlimited via Pro</span>
                                        ) : (
                                            <>
                                                <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{Math.max(0, 5 - unlocked.length)}</span>
                                                <span className="text-muted" style={{ fontSize: '0.9rem' }}> / 5 left</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Paid Credits Row */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <div style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: 4, borderRadius: 6 }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20.9 9v6a2 2 0 0 1-2 2H5.1a2 2 0 0 1-2-2V9" />
                                                    <path d="M5.1 15v-6a2 2 0 0 1 2-2h9.8a2 2 0 0 1 2 2v6" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            </div>
                                            <span style={{ fontWeight: 600 }}>Paid Credits</span>
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.85rem' }}>Never expires, works anytime</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color: credits > 0 ? '#3b82f6' : 'inherit' }}>
                                            {credits}
                                        </span>
                                        <span className="text-muted" style={{ fontSize: '0.9rem' }}> available</span>
                                    </div>
                                </div>
                            </div>
                            
                            {!hasFullAccess && (
                                <div style={{ marginTop: 20 }}>
                                    <Link to="/pricing" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', padding: '10px 20px' }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                                        Buy More Credits
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="settings-card" style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 16, border: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>Subscription & Billing</h3>
                            {hasFullAccess ? (
                                <>
                                    <p className="text-muted" style={{ marginBottom: 24 }}>Manage your current subscription, cancel, or upgrade/downgrade your plan securely via Polar.</p>
                                    
                                    {subscriptionData && (
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, marginBottom: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                                <span className="text-muted">Current Plan</span>
                                                <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                                                    {subscriptionData.plan === 'pro_yearly' ? 'Pro Yearly' : 'Pro Monthly'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                                <span className="text-muted">Status</span>
                                                <span style={{ 
                                                    fontWeight: 600, 
                                                    color: subscriptionData.cancelAtPeriodEnd ? '#ff9800' : '#4caf50',
                                                    background: subscriptionData.cancelAtPeriodEnd ? 'rgba(255, 152, 0, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                                                    padding: '2px 8px',
                                                    borderRadius: 12,
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {subscriptionData.cancelAtPeriodEnd ? 'Canceling at Period End' : 'Active'}
                                                </span>
                                            </div>
                                            {subscriptionData.currentPeriodEnd && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span className="text-muted">{subscriptionData.cancelAtPeriodEnd ? 'Expires On' : 'Renews On'}</span>
                                                    <span style={{ fontWeight: 500 }}>
                                                        {(() => {
                                                            const d = subscriptionData.currentPeriodEnd;
                                                            // @ts-ignore: Handle Firebase Timestamp case properly
                                                            const dateObj = typeof d?.toDate === 'function' ? d.toDate() : new Date(d);
                                                            return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
                                                        })()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <button className="btn btn-primary" onClick={async (e) => {
                                            const btn = e.currentTarget;
                                            btn.disabled = true;
                                            btn.textContent = 'Loading Portal...';
                                            try {
                                                const res = await fetch('https://us-central1-prompt-factory-952f9.cloudfunctions.net/createPolarPortalSession', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ firebase_uid: user.uid })
                                                });
                                                const data = await res.json();
                                                if (data.url) {
                                                    window.open(data.url, '_blank');
                                                    btn.disabled = false;
                                                    btn.textContent = 'Manage Subscription';
                                                } else {
                                                    alert("Failed to load portal: " + (data.error || "Unknown error"));
                                                    btn.disabled = false;
                                                    btn.textContent = 'Manage Subscription';
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                alert("Failed to connect to billing portal.");
                                                btn.disabled = false;
                                                btn.textContent = 'Manage Subscription';
                                            }
                                        }}>
                                            Manage Subscription
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-muted" style={{ marginBottom: 24 }}>You're currently on the <strong>Free plan</strong>. Upgrade to Pro for unlimited access to all prompts.</p>
                                    <div>
                                        <Link to="/pricing" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                            <Crown size={18} />
                                            Upgrade to Pro
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                        {/* Payment History Card */}
                        <div className="settings-card" style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 16, border: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Payment History</h3>
                            {transactions.length > 0 ? (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                                <th style={{ padding: '12px 0', fontWeight: 500 }}>Date</th>
                                                <th style={{ padding: '12px 0', fontWeight: 500 }}>Description</th>
                                                <th style={{ padding: '12px 0', fontWeight: 500 }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.map(tx => {
                                                const dateObj = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date();
                                                const formattedDate = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                                                
                                                return (
                                                    <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '16px 0', color: 'var(--text-muted)' }}>{formattedDate}</td>
                                                        <td style={{ padding: '16px 0', fontWeight: 500 }}>{tx.description}</td>
                                                        <td style={{ padding: '16px 0' }}>
                                                            <span style={{ 
                                                                background: 'rgba(34,197,94,0.1)', 
                                                                color: '#22c55e', 
                                                                padding: '4px 10px', 
                                                                borderRadius: 12, 
                                                                fontSize: '0.8rem',
                                                                fontWeight: 600
                                                            }}>
                                                                Paid
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-muted">No payment history found.</p>
                            )}
                        </div>
                    </div>
                ) : currentList.length > 0 ? (
                    <div className="grid">
                        {currentList.map(prompt => (
                            <PromptCard key={prompt.id} prompt={prompt} />
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        {activeTab === 'unlocked' ? (
                            hasFullAccess ? (
                                <>
                                    <Crown size={48} style={{ color: 'var(--text-muted)' }} />
                                    <h3 className="mt-4">All Prompts Unlocked ⚡</h3>
                                    <p className="text-muted">You have unlimited access! Browse the library to see them all, and use the Favorites tab to save the ones you like.</p>
                                </>
                            ) : (
                                <>
                                    <Unlock size={48} style={{ color: 'var(--text-muted)' }} />
                                    <h3 className="mt-4">No unlocked prompts yet</h3>
                                    <p className="text-muted">Use your free unlocks to access prompts and they'll appear here.</p>
                                </>
                            )
                        ) : (
                            <>
                                <Heart size={48} style={{ color: 'var(--text-muted)' }} />
                                <h3 className="mt-4">No favorites yet</h3>
                                <p className="text-muted">Browse prompts and tap the heart icon to save them here.</p>
                            </>
                        )}
                        <Link to="/" className="btn btn-primary mt-8">
                            <Sparkles size={16} /> Browse Prompts
                        </Link>
                    </div>
                )}
            </div>
        </section>
    );
};

export default DashboardPage;
