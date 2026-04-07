import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Search, LogOut, User, Menu, X, LayoutDashboard, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAIL } from '../firebase/config';

const Navbar = () => {
    const { user, loading, logout } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const isAdmin = user?.email === ADMIN_EMAIL;
    const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

    if (isAuthPage) return null;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <nav className="navbar">
            <div className="container flex justify-between items-center">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Sparkles style={{ color: 'var(--accent-neon)' }} size={24} />
                    <span className="logo">Prompt Factory</span>
                </Link>

                {/* Desktop Nav */}
                <div className="nav-links">
                    <Link to="/" className="nav-link">Home</Link>
                    <Link to="/pricing" className="nav-link">Pricing</Link>
                    <Link to="/about" className="nav-link">About</Link>
                    <Link to="/contact" className="nav-link">Contact</Link>
                </div>

                {/* Search Bar */}
                <form className="search-form" onSubmit={handleSearch}>
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search prompts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </form>

                {/* Auth */}
                <div className="nav-auth">
                    {user ? (
                        <div className="flex items-center gap-2">
                            <Link to="/dashboard" className="btn btn-outline btn-sm" title="My Prompts">
                                <LayoutDashboard size={14} /> My Prompts
                            </Link>
                            {isAdmin && (
                                <Link to="/admin" className="btn btn-outline btn-sm" title="Admin" style={{ borderColor: 'rgba(168,85,247,0.3)', color: 'var(--accent-neon)' }}>
                                    <Settings size={14} />
                                </Link>
                            )}
                            <div className="user-badge">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="" className="user-avatar" />
                                ) : (
                                    <User size={16} />
                                )}
                                <span className="user-name">{user.displayName?.split(' ')[0]}</span>
                            </div>
                            <button className="btn btn-outline btn-sm" onClick={logout}>
                                <LogOut size={14} />
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="btn btn-outline btn-sm" style={{ visibility: 'hidden' }}>Loading...</div>
                    ) : (
                        <Link to="/login" className="btn btn-primary btn-sm">
                            Sign In
                        </Link>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
                    {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="mobile-menu">
                    <Link to="/" className="nav-link" onClick={() => setMobileOpen(false)}>Home</Link>
                    <Link to="/pricing" className="nav-link" onClick={() => setMobileOpen(false)}>Pricing</Link>
                    <Link to="/about" className="nav-link" onClick={() => setMobileOpen(false)}>About</Link>
                    <Link to="/contact" className="nav-link" onClick={() => setMobileOpen(false)}>Contact</Link>
                    {user && (
                        <Link to="/dashboard" className="nav-link" onClick={() => setMobileOpen(false)}>My Prompts</Link>
                    )}
                    {isAdmin && (
                        <Link to="/admin" className="nav-link" onClick={() => setMobileOpen(false)}>Admin</Link>
                    )}
                    <form className="search-form mobile" onSubmit={handleSearch}>
                        <Search size={16} className="search-icon" />
                        <input type="text" placeholder="Search prompts..." value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
                    </form>
                    {user ? (
                        <button className="btn btn-outline w-full" onClick={() => { logout(); setMobileOpen(false); }}>
                            <LogOut size={14} /> Logout
                        </button>
                    ) : loading ? null : (
                        <Link to="/login" className="btn btn-primary w-full" onClick={() => setMobileOpen(false)}>
                            Sign In
                        </Link>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
