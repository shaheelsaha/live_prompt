import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'liveprompt_cookie_consent';

const CookieConsent = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Show banner after a short delay if user hasn't consented yet
        const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
        if (!consent) {
            const timer = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
        setVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="cookie-banner-overlay">
            <div className="cookie-banner">
                <button className="cookie-close" onClick={handleDecline} aria-label="Close">
                    <X size={16} />
                </button>
                <div className="cookie-banner-content">
                    <div className="cookie-icon-wrapper">
                        <Cookie size={22} />
                    </div>
                    <div className="cookie-text">
                        <p className="cookie-title">We use cookies</p>
                        <p className="cookie-desc">
                            We use cookies and similar technologies to improve your experience, analyze traffic, and personalize content.
                            Read our{' '}
                            <Link to="/privacy" className="text-gradient" style={{ textDecoration: 'none', fontWeight: 600 }}>
                                Privacy Policy
                            </Link>{' '}
                            to learn more.
                        </p>
                    </div>
                </div>
                <div className="cookie-actions">
                    <button className="btn btn-outline btn-sm" onClick={handleDecline}>
                        Decline
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleAccept}>
                        Accept All
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
