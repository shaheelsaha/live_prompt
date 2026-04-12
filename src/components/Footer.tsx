import { Link, useLocation } from 'react-router-dom';
import { Sparkles, Twitter, Linkedin, Instagram } from 'lucide-react';

const Footer = () => {
    const location = useLocation();
    const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

    if (isAuthPage) return null;

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    {/* Brand */}
                    <div className="footer-brand">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles style={{ color: 'var(--accent-neon)' }} size={20} />
                            <span className="logo" style={{ fontSize: '1.2rem' }}>LivePrompt</span>
                        </div>
                        <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                            Curated viral prompts for creators and founders who want engagement and growth.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="footer-heading">Product</h4>
                        <Link to="/" className="footer-link">Browse Prompts</Link>
                        <Link to="/pricing" className="footer-link">Pricing</Link>
                    </div>

                    <div>
                        <h4 className="footer-heading">Company</h4>
                        <Link to="/about" className="footer-link">About</Link>
                        <Link to="/contact" className="footer-link">Contact</Link>
                    </div>

                    <div>
                        <h4 className="footer-heading">Connect</h4>
                        <div className="flex gap-4 mt-4">
                            <a href="#" className="social-link"><Twitter size={18} /></a>
                            <a href="#" className="social-link"><Linkedin size={18} /></a>
                            <a href="#" className="social-link"><Instagram size={18} /></a>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                        © {new Date().getFullYear()} LivePrompt. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
