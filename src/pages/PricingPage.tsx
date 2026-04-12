import { useState } from 'react';
import { Check, Zap, Crown, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CREDIT_PACKS = [
    { key: '1_credit', credits: 1, price: 3, perPrompt: '3.00', label: '1 Credit' },
    { key: '5_credits', credits: 5, price: 5, perPrompt: '1.00', label: '5 Credits', badge: 'Popular' },
    { key: '15_credits', credits: 15, price: 10, perPrompt: '0.67', label: '15 Credits', badge: 'Best Value' },
];

const PricingPage = () => {
    const { user, loginWithGoogle, hasFullAccess, credits } = useAuth();
    const [isAnnual, setIsAnnual] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const [buyingPack, setBuyingPack] = useState<string | null>(null);

    const monthlyPrice = 15;
    const yearlyPrice = 99;
    // We use toFixed(2) because 99/12 is 8.25 instead of a clean whole number.
    const yearlyMonthly = (yearlyPrice / 12).toFixed(2); 
    const savingsPercent = Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100); // 45%

    const handleUpgrade = async () => {
        if (!user) {
            loginWithGoogle();
            return;
        }

        try {
            setUpgrading(true);

            // If user already has full access (Pro plan), open the customer billing portal instead of checkout
            if (hasFullAccess) {
                try {
                    const res = await fetch('https://us-central1-prompt-factory-952f9.cloudfunctions.net/createPolarPortalSession', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ firebase_uid: user.uid })
                    });
                    const data = await res.json();
                    
                    if (data.url) {
                        window.location.href = data.url;
                        setUpgrading(false);
                        return; // Successfully opened portal, stop here
                    } else {
                        console.warn("Failed to load portal:", data.error || "Unknown error");
                        // If there is no billing profile, we DO NOT return here!
                        // We organically fall through to the checkout logic below so they can subscribe.
                    }
                } catch (err) {
                    console.error("Portal fetch error:", err);
                    // Fall back to checkout
                }
            }

            // Normal upgrade flow for free users
            const priceId = isAnnual
                ? import.meta.env.VITE_POLAR_YEARLY_PRICE_ID
                : import.meta.env.VITE_POLAR_MONTHLY_PRICE_ID;

            if (!priceId) {
                console.error('Polar price IDs not configured in .env');
                setUpgrading(false);
                return;
            }

            // Determine success URL dynamically based on current origin
            const successUrl = `${window.location.origin}/dashboard?upgraded=true`;

            const response = await fetch('https://us-central1-prompt-factory-952f9.cloudfunctions.net/createPolarCheckout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firebase_uid: user.uid,
                    email: user.email || '',
                    price_id: priceId,
                    success_url: successUrl
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Checkout error:', data);
                alert('Something went wrong creating checkout. Please try again.');
                setUpgrading(false);
                return;
            }

            window.location.href = data.checkout_url;
            setUpgrading(false);
        } catch (err) {
            console.error('Upgrade/Portal failed:', err);
            alert('Something went wrong. Please try again.');
            setUpgrading(false);
        }
    };

    const handleBuyCredits = async (packKey: string) => {
        if (!user) {
            loginWithGoogle();
            return;
        }

        try {
            setBuyingPack(packKey);

            const successUrl = `${window.location.origin}/dashboard?credits_added=true`;

            const response = await fetch('https://us-central1-prompt-factory-952f9.cloudfunctions.net/createCreditCheckout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firebase_uid: user.uid,
                    email: user.email || '',
                    credit_pack: packKey,
                    success_url: successUrl,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Credit checkout error:', data);
                alert('Something went wrong. Please try again.');
                setBuyingPack(null);
                return;
            }

            window.location.href = data.checkout_url;
            setBuyingPack(null);
        } catch (err) {
            console.error('Credit checkout failed:', err);
            alert('Something went wrong. Please try again.');
            setBuyingPack(null);
        }
    };

    return (
        <section className="page-section">
            <div className="container text-center">
                <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>
                    Simple <span className="text-gradient">Pricing</span>
                </h1>
                <p className="text-muted" style={{ fontSize: '1.15rem', maxWidth: 550, margin: '0 auto 32px' }}>
                    Flexible plans designed to grow with you. Start free, upgrade anytime.
                </p>

                {/* User Tier Badge */}
                {user && hasFullAccess && (
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(168,85,247,0.1)',
                        border: '1px solid rgba(168,85,247,0.3)',
                        borderRadius: 30,
                        padding: '8px 20px',
                        marginBottom: 32,
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#a855f7',
                    }}>
                        <Zap size={16} />
                        You're on Pro
                    </div>
                )}

                {/* ══════════  Billing Toggle  ══════════ */}
                <div className="billing-toggle-wrapper">
                    <span className={`billing-label ${!isAnnual ? 'active' : ''}`}>Monthly</span>
                    <button
                        className={`billing-toggle ${isAnnual ? 'annual' : ''}`}
                        onClick={() => setIsAnnual(!isAnnual)}
                        aria-label="Toggle billing period"
                    >
                        <span className="billing-toggle-knob" />
                    </button>
                    <span className={`billing-label ${isAnnual ? 'active' : ''}`}>
                        Annual
                        <span className="billing-save-badge">Save {savingsPercent}%</span>
                    </span>
                </div>

                {/* ══════════  Credit balance badge  ══════════ */}
                {user && !hasFullAccess && credits > 0 && (
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(34,197,94,0.08)',
                        border: '1px solid rgba(34,197,94,0.2)',
                        borderRadius: 30,
                        padding: '8px 20px',
                        marginBottom: 32,
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: '#22c55e',
                    }}>
                        <Zap size={14} />
                        You have {credits} credit{credits !== 1 ? 's' : ''} remaining
                    </div>
                )}

                {/* ══════════  3-Column Pricing Layout  ══════════ */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 24,
                    maxWidth: 960,
                    margin: '0 auto',
                    alignItems: 'start',
                }}>

                    {/* ── Column 1: Free Plan ── */}
                    <div className="pricing-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div className="pricing-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                            <Zap size={28} />
                        </div>
                        <h3 className="pricing-tier">Free</h3>
                        <div className="pricing-price">$0</div>
                        <p className="text-muted" style={{ marginBottom: 24 }}>
                            Get started to explore the library
                        </p>
                        <ul className="pricing-features" style={{ flex: 1 }}>
                            <li><Check size={16} /> 5 free prompt unlocks</li>
                            <li><Check size={16} /> View related prompts</li>
                            <li><Check size={16} /> Basic search access</li>
                        </ul>
                        <button
                            className="btn btn-outline w-full"
                            style={{ padding: '14px', fontSize: '1.05rem', marginTop: 'auto' }}
                            onClick={() => !user && loginWithGoogle()}
                        >
                            {user && !hasFullAccess ? '✓ Your Current Plan' : user ? 'Current Plan' : 'Start for Free'}
                        </button>
                    </div>

                    {/* ── Column 2: Credit Packs ── */}
                    <div className="pricing-card" style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 0,
                        overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '28px 24px 20px',
                            textAlign: 'center',
                        }}>
                            <div className="pricing-icon" style={{
                                background: 'rgba(59,130,246,0.12)',
                                color: '#3b82f6',
                                margin: '0 auto 12px',
                            }}>
                                <Package size={28} />
                            </div>
                            <h3 className="pricing-tier">Credits</h3>
                            <p className="text-muted" style={{ fontSize: '0.88rem', margin: '4px 0 0' }}>
                                Pay per prompt — never expires
                            </p>
                        </div>

                        {/* Pack Options */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 16px 16px' }}>
                            {CREDIT_PACKS.map((pack) => {
                                const isHighlighted = pack.badge === 'Popular';
                                const isBest = pack.badge === 'Best Value';
                                return (
                                    <div key={pack.key} style={{
                                        position: 'relative',
                                        padding: '14px 16px',
                                        borderRadius: 12,
                                        marginBottom: 8,
                                        background: isHighlighted
                                            ? 'rgba(168,85,247,0.08)'
                                            : isBest
                                                ? 'rgba(59,130,246,0.08)'
                                                : 'rgba(255,255,255,0.02)',
                                        border: isHighlighted
                                            ? '1px solid rgba(168,85,247,0.25)'
                                            : isBest
                                                ? '1px solid rgba(59,130,246,0.25)'
                                                : '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flex: 1,
                                    }}>
                                        {/* Left side */}
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                                                    {pack.credits} {pack.credits === 1 ? 'Prompt' : 'Prompts'}
                                                </span>
                                                {pack.badge && (
                                                    <span style={{
                                                        background: isBest
                                                            ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                                                            : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                                        color: '#fff',
                                                        padding: '2px 6px',
                                                        borderRadius: 6,
                                                        fontSize: '0.55rem',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.3px',
                                                    }}>
                                                        {pack.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                ${pack.perPrompt} each
                                            </div>
                                        </div>

                                        {/* Right side */}
                                        <button
                                            className={pack.badge ? 'btn btn-primary' : 'btn btn-outline'}
                                            style={{
                                                padding: '8px 16px',
                                                fontSize: '0.82rem',
                                                fontWeight: 700,
                                                boxShadow: 'none',
                                                borderRadius: 10,
                                                whiteSpace: 'nowrap',
                                            }}
                                            onClick={() => handleBuyCredits(pack.key)}
                                            disabled={buyingPack === pack.key}
                                        >
                                            {buyingPack === pack.key ? '...' : `$${pack.price}`}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Column 3: Pro Plan ── */}
                    <div className="pricing-card featured" style={{ border: '1px solid var(--accent-primary)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div className="pricing-badge">
                            {isAnnual ? 'Best Value' : 'Most Popular'}
                        </div>
                        <div className="pricing-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                            <Crown size={28} />
                        </div>
                        <h3 className="pricing-tier">Pro</h3>

                        <div className="pricing-price-block">
                            <div className="pricing-price">
                                ${isAnnual ? yearlyMonthly : monthlyPrice}
                                <span className="pricing-unit">/ month</span>
                            </div>
                            {isAnnual && (
                                <div className="pricing-billed">
                                    <span className="pricing-original">${monthlyPrice}/mo</span>
                                    <span className="pricing-billed-text">Billed ${yearlyPrice}/year</span>
                                </div>
                            )}
                            {!isAnnual && (
                                <div className="pricing-billed">
                                    <span className="pricing-billed-text">Billed monthly, cancel anytime</span>
                                </div>
                            )}
                        </div>

                        <ul className="pricing-features" style={{ flex: 1 }}>
                            <li><Check size={16} /> Full access to prompt database</li>
                            <li><Check size={16} /> Unlimited prompt unlocks</li>
                            <li><Check size={16} /> Higher usage limits</li>
                            <li><Check size={16} /> Uninterrupted access</li>
                            <li><Check size={16} /> Cancel anytime</li>
                        </ul>
                        <button
                            className="btn btn-primary w-full"
                            style={{ padding: '14px', fontSize: '1.05rem', boxShadow: 'none', marginTop: 'auto' }}
                            onClick={handleUpgrade}
                            disabled={upgrading}
                        >
                            {upgrading ? 'Creating Checkout...' : hasFullAccess ? 'Manage Subscription' : `Upgrade to Pro ${isAnnual ? 'Yearly' : 'Monthly'}`}
                        </button>
                    </div>
                </div>

                {/* Responsive */}
                <style>{`
                    @media (max-width: 768px) {
                        .container > div[style*="grid-template-columns: 1fr 1fr 1fr"] {
                            grid-template-columns: 1fr !important;
                        }
                    }
                `}</style>
            </div>
        </section>
    );
};

export default PricingPage;

